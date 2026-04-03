import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { checkWarehouseAccess } from "@/lib/access";
import { revalidatePath } from "next/cache";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;
        const db = await getDb();

        const vehicle = await db.collection("Vehicle").findOne({ _id: new ObjectId(id) });
        if (!vehicle) {
            return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
        }

        const user = session.user as any;
        const hasAccess = await checkWarehouseAccess(user.id, user.role, vehicle.warehouseId.toString());
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Check if vehicle is currently on a trip
        const activeTrip = await db.collection("Trip").findOne({
            vehicleId: new ObjectId(id),
            status: { $in: ["LOADED", "RETURNED"] }
        });

        if (activeTrip) {
            return NextResponse.json({ error: "Cannot delete vehicle with active or unverified trips" }, { status: 400 });
        }

        await db.collection("Vehicle").deleteOne({ _id: new ObjectId(id) });
        revalidatePath("/dashboard");
        revalidatePath("/vehicles");

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Vehicle Deletion Error:", error);
        return NextResponse.json({ error: "Failed to delete vehicle" }, { status: 500 });
    }
}
