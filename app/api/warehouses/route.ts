import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const role = user.role;
    const userId = user.id;

    try {
        const db = await getDb();
        let query = {};

        if (role !== "ADMIN") {
            // Staff sees warehouses they have access to? 
            // In the original Prisma code, it was empty whereClause, meaning all warehouses.
            // Let's keep that behavior for now but use the new driver.
            query = {};
        }

        const warehouses = await db.collection("Warehouse")
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();

        // Convert ObjectId to string for JSON
        const formattedWarehouses = warehouses.map(w => ({
            ...w,
            id: w._id.toString(),
            _id: undefined
        }));

        return NextResponse.json(formattedWarehouses ?? []);
    } catch (error) {
        console.error("Error fetching warehouses", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    
    // Get fresh role from DB in case session is stale
    const dbUser = await db.collection("User").findOne({ 
        email: (session.user as any).email 
    });
    const userRole = dbUser?.role || (session?.user as any)?.role;

    // Check if any warehouses exist yet
    const warehouseCount = await db.collection("Warehouse").countDocuments();

    // Allow if ADMIN or if this is the first warehouse ever
    if (userRole !== "ADMIN" && warehouseCount > 0) {
        return NextResponse.json({ error: "Unauthorized: Admins only" }, { status: 403 });
    }

    try {
        const { name, location } = await req.json();

        if (!name || !location) {
            return NextResponse.json({ error: "Name and location are required" }, { status: 400 });
        }

        const db = await getDb();
        const newWarehouse = {
            name,
            location,
            createdById: new ObjectId((session.user as any).id),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection("Warehouse").insertOne(newWarehouse);

        // ---------------------------------------------------------
        // COPY PRODUCTS FROM MAIN WAREHOUSE (TEMPLATE)
        // ---------------------------------------------------------
        // Find the "Main" warehouse (oldest one)
        const templateWarehouse = await db.collection("Warehouse")
            .find({ _id: { $ne: result.insertedId } }) // Exclude self
            .sort({ createdAt: 1 })
            .limit(1)
            .next();

        if (templateWarehouse) {
            console.log("Found template warehouse:", templateWarehouse.name);
            const templateProducts = await db.collection("Product")
                .find({ warehouseId: templateWarehouse._id })
                .toArray();

            if (templateProducts.length > 0) {
                const newProducts = templateProducts.map(p => ({
                    name: p.name,
                    sku: p.sku, // Keep same SKU? or generate new? Usually keep same for consistency across chain
                    quantity: 0, // Reset quantity for new warehouse
                    price: p.price,
                    location: p.location, // Maybe clear location?
                    pack: p.pack,
                    flavour: p.flavour,
                    invoiceCost: p.invoiceCost,
                    salePrice: p.salePrice,
                    warehouseId: result.insertedId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }));

                await db.collection("Product").insertMany(newProducts);
                console.log(`Copied ${newProducts.length} products to new warehouse.`);
            }
        }

        return NextResponse.json({
            ...newWarehouse,
            id: result.insertedId.toString(),
            _id: undefined
        }, { status: 201 });
    } catch (error) {
        console.error("Error creating warehouse", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
