import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { warehouseId } = await req.json();
        if (!warehouseId) return NextResponse.json({ error: "Warehouse ID is required" }, { status: 400 });

        const db = await getDb();

        let user = await db.collection("User").findOne({ email: session.user.email });
        if (!user) {
            // Self-heal: Create user if missing
            const result = await db.collection("User").insertOne({
                email: session.user.email,
                name: session.user.name || "User",
                role: "STAFF",
                createdAt: new Date(),
                updatedAt: new Date()
            });
            user = await db.collection("User").findOne({ _id: result.insertedId });
        }

        if (!user) return NextResponse.json({ error: "User record unavailable" }, { status: 500 });

        // Check for existing request
        const existing = await db.collection("WarehouseAccess").findOne({
            userId: user._id,
            warehouseId: new ObjectId(warehouseId)
        });

        if (existing && existing.status === "PENDING") {
            return NextResponse.json({ error: "Request already pending" }, { status: 400 });
        }

        const newRequest = {
            userId: user._id,
            warehouseId: new ObjectId(warehouseId),
            status: "PENDING",
            role: "STAFF",
            createdAt: new Date(),
            updatedAt: new Date()
        };

        if (existing) {
            // Update existing record instead of inserting a new one to avoid duplicates
            await db.collection("WarehouseAccess").updateOne(
                { _id: existing._id },
                { $set: { status: "PENDING", updatedAt: new Date() } }
            );
            return NextResponse.json({ ...existing, status: "PENDING" });
        }

        const result = await db.collection("WarehouseAccess").insertOne(newRequest);

        return NextResponse.json({
            ...newRequest,
            id: result.insertedId.toString(),
            _id: undefined
        });
    } catch (error) {
        console.error("Request access failed", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
