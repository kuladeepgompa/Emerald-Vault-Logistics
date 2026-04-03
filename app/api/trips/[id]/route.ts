import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import clientPromise from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { checkWarehouseAccess } from "@/lib/access";
import { revalidatePath } from "next/cache";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const client = await clientPromise;
    const mongoSession = client.startSession();

    try {
        const db = client.db();
        const trip = await db.collection("Trip").findOne({ _id: new ObjectId(id) });
        if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

        const user = session.user as any;
        const hasAccess = await checkWarehouseAccess(user.id, user.role, trip.warehouseId.toString());
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied or expired" }, { status: 403 });
        }
        const { returnedItems, status, verifiedAt } = await req.json();

        if (status !== "VERIFIED") {
            return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
        }

        let updatedTripResponse;

        await mongoSession.withTransaction(async () => {
            const db = client.db();
            const trip = await db.collection("Trip").findOne(
                { _id: new ObjectId(id) },
                { session: mongoSession }
            );

            if (!trip) throw new Error("Trip not found");
            if (trip.status === "VERIFIED") throw new Error("Trip already verified");

            // Process Returns
            const updatedLoadedItems = trip.loadedItems.map((item: any) => {
                const returned = returnedItems.find((r: any) => r.productId === item.productId.toString());
                return {
                    ...item,
                    qtyReturned: returned ? Number(returned.qtyReturned) : 0
                };
            });

            // Update Product Stocks for returns
            for (const item of returnedItems) {
                if (item.qtyReturned > 0) {
                    await db.collection("Product").updateOne(
                        { _id: new ObjectId(item.productId) },
                        { $inc: { quantity: Number(item.qtyReturned) }, $set: { updatedAt: new Date() } },
                        { session: mongoSession }
                    );
                }
            }

            // Update Trip
            const updatedTrip = await db.collection("Trip").findOneAndUpdate(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        status: "VERIFIED",
                        endTime: verifiedAt ? new Date(verifiedAt) : new Date(),
                        verifiedBy: new ObjectId((session.user as any).id),
                        loadedItems: updatedLoadedItems,
                        updatedAt: new Date()
                    }
                },
                { session: mongoSession, returnDocument: "after" }
            );

            if (!updatedTrip) throw new Error("Failed to update trip");

            // Release Vehicle
            await db.collection("Vehicle").updateOne(
                { _id: new ObjectId(trip.vehicleId) },
                { $set: { status: "AVAILABLE", updatedAt: new Date() } },
                { session: mongoSession }
            );

            updatedTripResponse = {
                ...updatedTrip,
                id: updatedTrip._id.toString(),
                _id: undefined
            };
        });

        return NextResponse.json(updatedTripResponse);
    } catch (error: any) {
        revalidatePath("/dashboard");
        revalidatePath("/trips");
        revalidatePath("/vehicles");
        revalidatePath("/stock");
        console.error("Verification failed", error);
        return NextResponse.json({ error: error.message || "Verification failed" }, { status: 500 });
    } finally {
        await mongoSession.endSession();
    }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const db = await getDb();
        const trip = await db.collection("Trip").findOne({ _id: new ObjectId(id) });

        if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;

        const hasAccess = await checkWarehouseAccess(user.id, user.role, trip.warehouseId.toString());
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied or expired" }, { status: 403 });
        }

        // Get Vehicle
        const vehicle = await db.collection("Vehicle").findOne({ _id: new ObjectId(trip.vehicleId) });

        // Enrich with product details
        const productIds = trip.loadedItems.map((i: any) => i.productId);
        const products = await db.collection("Product")
            .find({ _id: { $in: productIds } })
            .project({ name: 1, sku: 1, pack: 1, flavour: 1 })
            .toArray();

        const productMap = new Map(products.map(p => [p._id.toString(), p]));

        const enrichedTrip = {
            ...trip,
            id: trip._id.toString(),
            _id: undefined,
            vehicleId: trip.vehicleId.toString(),
            warehouseId: trip.warehouseId.toString(),
            vehicle: vehicle ? { ...vehicle, id: vehicle._id.toString(), _id: undefined } : null,
            loadedItems: trip.loadedItems.map((i: any) => ({
                ...i,
                productId: i.productId.toString(),
                product: productMap.get(i.productId.toString()) ? {
                    ...productMap.get(i.productId.toString()),
                    id: i.productId.toString(),
                    _id: undefined
                } : { name: "Unknown" }
            }))
        };

        return NextResponse.json(enrichedTrip);
    } catch (error) {
        console.error("Failed to fetch trip", error);
        return NextResponse.json({ error: "Failed to fetch trip" }, { status: 500 });
    }
}
