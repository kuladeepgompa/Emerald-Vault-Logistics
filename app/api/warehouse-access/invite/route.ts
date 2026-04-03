import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

/**
 * Admins can manually add a staff member via email.
 * This directly creates an APPROVED access record.
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { email, warehouseId } = await req.json();

        if (!email || !warehouseId) {
            return NextResponse.json({ error: "Email and WarehouseID are required" }, { status: 400 });
        }

        const db = await getDb();

        /**
         * 1. Find or create user placeholder
         * Note: If user exists, we use their current ID.
         * If not, we create a placeholder so they can log in later.
         */
        const user = await db.collection("User").findOneAndUpdate(
            { email },
            {
                $setOnInsert: {
                    email,
                    role: "STAFF",
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            },
            { upsert: true, returnDocument: "after" }
        );

        if (!user) {
            return NextResponse.json({ error: "Failed to manage user" }, { status: 500 });
        }

        /**
         * 2. Create or Update WarehouseAccess to APPROVED
         */
        const access = await db.collection("WarehouseAccess").findOneAndUpdate(
            { userId: user._id, warehouseId: new ObjectId(warehouseId) },
            {
                $set: {
                    status: "APPROVED",
                    role: "STAFF",
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    createdAt: new Date()
                }
            },
            { upsert: true, returnDocument: "after" }
        );

        return NextResponse.json({
            success: true,
            userId: user._id.toString(),
            accessId: access?._id.toString()
        });

    } catch (error) {
        console.error("Invitation Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
