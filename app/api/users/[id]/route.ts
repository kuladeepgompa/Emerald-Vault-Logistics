import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

/**
 * Admins can update user details (like email).
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;
        const { email, name } = await req.json();

        if (!email && !name) {
            return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
        }

        const db = await getDb();
        const updateDoc: any = { updatedAt: new Date() };
        if (email) updateDoc.email = email;
        if (name) updateDoc.name = name;

        const result = await db.collection("User").findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updateDoc },
            { returnDocument: "after" }
        );

        if (!result) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error("User Update Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
