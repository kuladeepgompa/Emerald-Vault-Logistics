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

        // Fetch all approved access with user and warehouse info
        const staffAccess = await db.collection("WarehouseAccess")
            .find({ status: "APPROVED" })
            .toArray();

        const userIds = staffAccess.map(r => r.userId);
        const warehouseIds = staffAccess.map(r => r.warehouseId);

        const [users, warehouses] = await Promise.all([
            db.collection("User").find({ _id: { $in: userIds } }).toArray(),
            db.collection("Warehouse").find({ _id: { $in: warehouseIds } }).toArray()
        ]);

        const userMap = new Map(users.map(u => [u._id.toString(), u]));
        const warehouseMap = new Map(warehouses.map(w => [w._id.toString(), w]));

        const now = new Date();
        const ONE_YEAR_IN_MS = 365 * 24 * 60 * 60 * 1000;

        const enrichedStaff = staffAccess.map(r => {
            const updatedAt = r.updatedAt ? new Date(r.updatedAt) : new Date(r.createdAt);
            const isExpired = (now.getTime() - updatedAt.getTime() > ONE_YEAR_IN_MS);

            return {
                ...r,
                id: r._id.toString(),
                _id: undefined,
                isExpired,
                user: userMap.get(r.userId.toString()) ? {
                    id: r.userId.toString(),
                    name: userMap.get(r.userId.toString())?.name,
                    email: userMap.get(r.userId.toString())?.email
                } : null,
                warehouse: warehouseMap.get(r.warehouseId.toString()) ? {
                    id: r.warehouseId.toString(),
                    name: warehouseMap.get(r.warehouseId.toString())?.name
                } : null
            };
        });

        return NextResponse.json(enrichedStaff);
    } catch (error) {
        console.error("Error fetching staff", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
