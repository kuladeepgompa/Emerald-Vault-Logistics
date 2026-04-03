import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const db = await getDb();

        // Fetch pending requests with user and warehouse info
        const requests = await db.collection("WarehouseAccess")
            .find({ status: "PENDING" })
            .toArray();

        const userIds = requests.map(r => r.userId);
        const warehouseIds = requests.map(r => r.warehouseId);

        const [users, warehouses] = await Promise.all([
            db.collection("User").find({ _id: { $in: userIds } }).toArray(),
            db.collection("Warehouse").find({ _id: { $in: warehouseIds } }).toArray()
        ]);

        const userMap = new Map(users.map(u => [u._id.toString(), u]));
        const warehouseMap = new Map(warehouses.map(w => [w._id.toString(), w]));

        const enrichedRequests = requests.map(r => ({
            ...r,
            id: r._id.toString(),
            _id: undefined,
            user: userMap.get(r.userId.toString()) ? {
                id: r.userId.toString(),
                name: userMap.get(r.userId.toString())?.name,
                email: userMap.get(r.userId.toString())?.email,
                image: userMap.get(r.userId.toString())?.image
            } : null,
            warehouse: warehouseMap.get(r.warehouseId.toString()) ? {
                id: r.warehouseId.toString(),
                name: warehouseMap.get(r.warehouseId.toString())?.name
            } : null
        }));

        return NextResponse.json(enrichedRequests);
    } catch (error) {
        console.error("Error fetching requests", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
