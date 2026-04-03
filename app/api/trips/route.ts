import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import clientPromise from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { checkWarehouseAccess } from "@/lib/access";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await clientPromise;
    const mongoSession = client.startSession();

    try {
        const { vehicleId, items, warehouseId } = await req.json();

        if (!vehicleId || !items || items.length === 0 || !warehouseId) {
            return NextResponse.json({ error: "Invalid data: Missing vehicle, items, or warehouse" }, { status: 400 });
        }

        const user = session.user as any;
        const hasAccess = await checkWarehouseAccess(user.id, user.role, warehouseId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied or expired" }, { status: 403 });
        }

        let newTrip;

        await mongoSession.withTransaction(async () => {
            const db = client.db();

            // 1. Validate Vehicle & Availability
            const vehicle = await db.collection("Vehicle").findOne(
                { _id: new ObjectId(vehicleId) },
                { session: mongoSession }
            );

            if (!vehicle) throw new Error("Vehicle not found");
            if (vehicle.status !== "AVAILABLE") throw new Error("Vehicle is not available");
            if (vehicle.warehouseId.toString() !== warehouseId) throw new Error("Vehicle belongs to different warehouse");

            // 2. Validate Products & Stock deduction
            for (const item of items) {
                const product = await db.collection("Product").findOne(
                    { _id: new ObjectId(item.productId) },
                    { session: mongoSession }
                );

                if (!product) throw new Error(`Product not found: ${item.productId}`);
                if (product.warehouseId.toString() !== warehouseId) throw new Error(`Product ${product.name} incorrect warehouse`);
                if (product.quantity < item.qtyLoaded) {
                    throw new Error(`Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.qtyLoaded}`);
                }

                // Deduct stock
                await db.collection("Product").updateOne(
                    { _id: new ObjectId(item.productId) },
                    { $inc: { quantity: -item.qtyLoaded }, $set: { updatedAt: new Date() } },
                    { session: mongoSession }
                );
            }

            // 3. Update Vehicle Status
            await db.collection("Vehicle").updateOne(
                { _id: new ObjectId(vehicleId) },
                { $set: { status: "IN_TRANSIT", updatedAt: new Date() } },
                { session: mongoSession }
            );

            // 4. Create Trip
            const tripData = {
                warehouseId: new ObjectId(warehouseId),
                vehicleId: new ObjectId(vehicleId),
                status: "LOADED",
                loadedItems: items.map((i: any) => ({
                    productId: new ObjectId(i.productId),
                    qtyLoaded: i.qtyLoaded,
                    qtyReturned: 0
                })),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await db.collection("Trip").insertOne(tripData, { session: mongoSession });
            newTrip = { ...tripData, id: result.insertedId.toString(), _id: undefined };
        });

        revalidatePath("/dashboard");
        revalidatePath("/trips");
        revalidatePath("/vehicles");
        revalidatePath("/stock");

        return NextResponse.json(newTrip, { status: 201 });
    } catch (error: any) {
        console.error("Trip creation error:", error);
        return NextResponse.json({ error: error.message || "Failed to create trip" }, { status: 500 });
    } finally {
        await mongoSession.endSession();
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
        const trips = await db.collection("Trip")
            .find({ warehouseId: new ObjectId(warehouseId) })
            .sort({ createdAt: -1 })
            .toArray();

        // Enriching with vehicle and product details
        const vehicleIds = Array.from(new Set(trips.map(t => t.vehicleId)));
        const productIds = Array.from(new Set(trips.flatMap(t => t.loadedItems.map((i: any) => i.productId))));

        const [vehicles, products] = await Promise.all([
            db.collection("Vehicle").find({ _id: { $in: vehicleIds } }).toArray(),
            db.collection("Product").find({ _id: { $in: productIds } }, { projection: { name: 1, sku: 1 } }).toArray()
        ]);

        const vehicleMap = new Map(vehicles.map(v => [v._id.toString(), v]));
        const productMap = new Map(products.map(p => [p._id.toString(), p]));

        const enrichedTrips = trips.map(t => ({
            ...t,
            id: t._id.toString(),
            _id: undefined,
            warehouseId: t.warehouseId.toString(),
            vehicleId: t.vehicleId.toString(),
            vehicle: vehicleMap.get(t.vehicleId.toString()) ? {
                ...vehicleMap.get(t.vehicleId.toString()),
                id: t.vehicleId.toString(),
                _id: undefined,
                warehouseId: t.warehouseId.toString()
            } : null,
            loadedItems: t.loadedItems.map((i: any) => ({
                ...i,
                productId: i.productId.toString(),
                productName: productMap.get(i.productId.toString())?.name || "Unknown",
                sku: productMap.get(i.productId.toString())?.sku || ""
            }))
        }));

        return NextResponse.json(enrichedTrips);
    } catch (error) {
        console.error("Fetch trips error", error);
        return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 });
    }
}
