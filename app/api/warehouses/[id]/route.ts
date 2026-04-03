import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function DELETE(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRole = (session?.user as any)?.role;

    if (!session || userRole !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized: Admins only" }, { status: 403 });
    }

    try {
        const db = await getDb();
        const warehouseId = new ObjectId(params.id);

        // Delete the warehouse
        const result = await db.collection("Warehouse").deleteOne({ _id: warehouseId });

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
        }

        // Cascade delete: Remove all products associated with this warehouse
        await db.collection("Product").deleteMany({ warehouseId: warehouseId });

        // Optional: Remove access requests/staff associated with this warehouse?
        // await db.collection("WarehouseAccess").deleteMany({ warehouseId: warehouseId });

        return NextResponse.json({ message: "Warehouse and associated data deleted successfully" });
    } catch (error) {
        console.error("Error deleting warehouse", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
