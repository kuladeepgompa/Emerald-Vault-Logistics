import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";
import { checkWarehouseAccess } from "@/lib/access";
import { NextResponse as NextResp } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const db = await getDb();
        const bill = await db.collection("Bill").findOne({ _id: new ObjectId(id) });

        if (!bill) return NextResp.json({ error: "Bill not found" }, { status: 404 });

        const session = await getServerSession(authOptions);
        if (!session) return NextResp.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;

        const hasAccess = await checkWarehouseAccess(user.id, user.role, bill.warehouseId.toString());
        if (!hasAccess) {
            return NextResp.json({ error: "Access denied or expired" }, { status: 403 });
        }

        // Get Trip
        const trip = await db.collection("Trip").findOne({ _id: new ObjectId(bill.tripId) });
        if (!trip) return NextResp.json({ error: "Trip not found" }, { status: 404 });

        // Get Vehicle
        const vehicle = await db.collection("Vehicle").findOne({ _id: new ObjectId(trip.vehicleId) });

        // Get Generator and Warehouse
        const [generator, warehouse] = await Promise.all([
            db.collection("User").findOne({ _id: new ObjectId(bill.generatedBy) }, { projection: { name: 1 } }),
            db.collection("Warehouse").findOne({ _id: new ObjectId(bill.warehouseId) }, { projection: { name: 1, location: 1 } })
        ]);

        // Enrich Items with Product Info
        const itemIds = trip.loadedItems.map((i: any) => i.productId);
        const products = await db.collection("Product")
            .find({ _id: { $in: itemIds } })
            .project({ name: 1, sku: 1, price: 1 })
            .toArray();

        const productMap = new Map(products.map(p => [p._id.toString(), p]));

        const enrichedItems = trip.loadedItems.map((item: any) => {
            const product = productMap.get(item.productId.toString()) as any;
            return {
                ...item,
                productId: item.productId.toString(),
                productName: product?.name || "Unknown",
                productSku: product?.sku || "",
                productPrice: product?.price || 0
            };
        });

        const enrichedBill = {
            ...bill,
            id: bill._id.toString(),
            _id: undefined,
            tripId: bill.tripId.toString(),
            warehouseId: bill.warehouseId.toString(),
            generatedBy: bill.generatedBy.toString(),
            trip: {
                ...trip,
                id: trip._id.toString(),
                _id: undefined,
                vehicleId: trip.vehicleId.toString(),
                warehouseId: trip.warehouseId.toString(),
                vehicle: vehicle ? { ...vehicle, id: vehicle._id.toString(), _id: undefined } : null,
                loadedItems: enrichedItems
            },
            generator: generator ? { ...generator, id: generator._id.toString(), _id: undefined } : null,
            warehouse: warehouse ? { ...warehouse, id: warehouse._id.toString(), _id: undefined } : null
        };

        return NextResp.json(enrichedBill);
    } catch (error) {
        console.error("Fetch bill error", error);
        return NextResp.json({ error: "Failed to fetch bill" }, { status: 500 });
    }
}
