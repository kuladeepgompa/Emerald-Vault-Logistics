import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { checkWarehouseAccess } from "@/lib/access";
import { revalidatePath } from "next/cache";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = session.user as any;
        const body = await req.json();
        const { name, sku, quantity, price, location, pack, flavour, invoiceCost, salePrice, warehouseId } = body;

        if (!warehouseId) {
            return NextResponse.json({ error: "Warehouse ID is required" }, { status: 400 });
        }

        const hasAccess = await checkWarehouseAccess(user.id, user.role, warehouseId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied or expired" }, { status: 403 });
        }

        if (!warehouseId) {
            return NextResponse.json({ error: "Warehouse ID is required" }, { status: 400 });
        }

        // Auto-generate SKU if not provided
        let finalSku = sku;
        if (!finalSku) {
            const base = (name || "").substring(0, 3).toUpperCase();
            const flav = (flavour || "").substring(0, 3).toUpperCase();
            const pck = (pack || "").substring(0, 3).toUpperCase();
            const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
            finalSku = `${base}-${flav}-${pck}-${random}`.replace(/-+/g, "-");
        }

        const db = await getDb();
        const newProduct = {
            name,
            sku: finalSku,
            quantity: Number(quantity),
            price: Number(price),
            location,
            pack,
            flavour,
            invoiceCost: invoiceCost ? Number(invoiceCost) : null,
            salePrice: salePrice ? Number(salePrice) : null,
            warehouseId: new ObjectId(warehouseId),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection("Product").insertOne(newProduct);
        revalidatePath("/dashboard");
        revalidatePath("/stock");

        return NextResponse.json({
            ...newProduct,
            id: result.insertedId.toString(),
            _id: undefined
        }, { status: 201 });
    } catch (error) {
        console.error("Failed to create product", error);
        return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");

    if (!warehouseId) {
        return NextResponse.json([], { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as any;

    const hasAccess = await checkWarehouseAccess(user.id, user.role, warehouseId);
    if (!hasAccess) {
        return NextResponse.json({ error: "Access denied or expired" }, { status: 403 });
    }

    try {
        const db = await getDb();

        // 1. Fetch products for CURRENT warehouse
        const currentProducts = await db.collection("Product")
            .find({ warehouseId: new ObjectId(warehouseId) })
            .toArray();

        // 2. Fetch MAIN WAREHOUSE (template) products
        // Find the "Main" warehouse (oldest one)
        const mainWarehouse = await db.collection("Warehouse")
            .find({}, { projection: { _id: 1 } })
            .sort({ createdAt: 1 })
            .limit(1)
            .next();

        let masterProducts: any[] = [];
        if (mainWarehouse && mainWarehouse._id.toString() !== warehouseId) {
            masterProducts = await db.collection("Product")
                .find({ warehouseId: mainWarehouse._id })
                .sort({ createdAt: -1 }) // Ensure consistent creation order (Newest First, matching Main Unit display)
                .toArray();
        }

        // 3. Merge Lists
        // Map current products by SKU for O(1) lookup
        const currentProductMap = new Map(currentProducts.map(p => [p.sku, p]));

        const mergedProducts = [...currentProducts];

        // Iterate through master products, if not in current, add as "virtual"
        masterProducts.forEach(master => {
            if (!currentProductMap.has(master.sku)) {
                mergedProducts.push({
                    ...master,
                    _id: "VIRTUAL-" + master._id.toString(), // Virtual ID
                    id: "VIRTUAL-" + master._id.toString(),
                    warehouseId: new ObjectId(warehouseId), // Pretend it belongs to current for UI
                    quantity: 0, // No stock
                    invoiceCost: 0,
                    location: "",
                    isVirtual: true,
                    originalMainId: master._id.toString() // Track origin
                });
            }
        });

        // 4. Sort by Main Warehouse Order (Creation Time)
        // We want strict alignment with Main Warehouse.
        // masterProducts is already sorted by natural creation (assuming default find or if we sort it explicitly).
        // Let's ensure masterProducts determines the order.

        // Map of SKU -> Index in Master List
        const masterIndexMap = new Map();
        masterProducts.forEach((p, index) => {
            masterIndexMap.set(p.sku, index);
        });

        mergedProducts.sort((a, b) => {
            const indexA = masterIndexMap.get(a.sku) ?? 999999;
            const indexB = masterIndexMap.get(b.sku) ?? 999999;

            if (indexA !== indexB) return indexA - indexB;

            // Fallback to name if not in master (unlikely for virtuals, but possible for local-only items)
            return a.name.localeCompare(b.name);
        });

        // Fetch today's daily pricing
        const today = new Date().toISOString().split('T')[0];
        const dailyPricings = await db.collection("DailyPricing").find({
            warehouseId: new ObjectId(warehouseId),
            date: today
        }).toArray();

        const pricingMap = new Map(dailyPricings.map(p => [p.productId.toString(), p.price]));

        // 5. Format Result
        const formattedProducts = mergedProducts.map(p => {
            const rawId = p._id.toString();
            // Pricing override won't exist for virtual products yet, but that's fine
            // If it's a virtual product, we use the rawId (starts with VIRTUAL-) for pricing? 
            // Actually, we probably can't set daily pricing on a virtual product until it's real.
            // But let's check by SKU or name? No, productId is best.

            const pricingOverride = pricingMap.get(rawId.replace("VIRTUAL-", "")); // Just in case logic tries to use original ID? Unlikely.

            // Default to salePrice if available, otherwise price (MRP)
            const dailyPrice = pricingOverride ?? (p.salePrice || p.price);

            return {
                ...p,
                id: rawId,
                _id: undefined,
                dailyPrice: dailyPrice,
                isDailyPriceOverridden: pricingOverride !== undefined
            };
        });

        return NextResponse.json(formattedProducts);
    } catch (error) {
        console.error("Failed to fetch products", error);
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
}
