import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { checkWarehouseAccess } from "@/lib/access";
import { revalidatePath } from "next/cache";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const body = await req.json();
        const db = await getDb();
        const user = session.user as any;

        // Check if ID is VIRTUAL
        if (id.startsWith("VIRTUAL-")) {
            const mainProductId = id.replace("VIRTUAL-", "");

            // Fetch the MAIN product to get template details
            const mainProduct = await db.collection("Product").findOne({ _id: new ObjectId(mainProductId) });

            if (!mainProduct) return NextResponse.json({ error: "Original product not found" }, { status: 404 });

            // Ensure access to target warehouse (which should be in body or inferred?)
            // StockTable edit form usually sends just fields.
            // BUT for VIRTUAL products, I need to know the TARGET WAREHOUSE ID.
            // My GET endpoint returned them with `warehouseId: targetWarehouseId`.
            // But the client sends `warehouseId`? 
            // Let's assume the body includes `warehouseId` OR we must fetch it from context?
            // Wait, standard `editForm` in frontend does NOT send `warehouseId`.
            // However, the `GET` endpoint injected the current `warehouseId` into the virtual product object.
            // So when `editForm` is populated via `{...product}`, it SHOULD contain `warehouseId`.

            if (!body.warehouseId) {
                // Return error asking for warehouseId if missing
                return NextResponse.json({ error: "Warehouse ID required for first-time setup" }, { status: 400 });
            }

            const hasAccess = await checkWarehouseAccess(user.id, user.role, body.warehouseId);
            if (!hasAccess) return NextResponse.json({ error: "Access denied" }, { status: 403 });

            // Create NEW Product
            const newProduct = {
                name: mainProduct.name,
                sku: mainProduct.sku,
                quantity: Number(body.quantity ?? 0),
                price: Number(body.price ?? mainProduct.price),
                location: body.location ?? "",
                pack: mainProduct.pack,
                flavour: mainProduct.flavour,
                invoiceCost: Number(body.invoiceCost ?? mainProduct.invoiceCost ?? 0),
                salePrice: Number(body.salePrice ?? mainProduct.salePrice ?? 0),
                warehouseId: new ObjectId(body.warehouseId),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await db.collection("Product").insertOne(newProduct);

            revalidatePath("/dashboard");
            revalidatePath("/stock");

            return NextResponse.json({
                ...newProduct,
                id: result.insertedId.toString(),
                _id: undefined
            });
        }

        // Standard Update for Real Products
        // Fetch product to get warehouseId
        const product = await db.collection("Product").findOne({ _id: new ObjectId(id) });
        if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

        const hasAccess = await checkWarehouseAccess(user.id, user.role, product.warehouseId.toString());
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied or expired" }, { status: 403 });
        }

        // Prepare update data
        const updateData: any = { ...body };
        // Remove immutable/system fields
        delete updateData.id;
        delete updateData._id;
        delete updateData.warehouseId; // Don't move products between warehouses via PATCH
        delete updateData.isVirtual;
        delete updateData.originalMainId;

        if (updateData.quantity !== undefined) updateData.quantity = Number(updateData.quantity);
        if (updateData.price !== undefined) updateData.price = Number(updateData.price);
        if (updateData.invoiceCost !== undefined) updateData.invoiceCost = Number(updateData.invoiceCost);
        if (updateData.salePrice !== undefined) updateData.salePrice = Number(updateData.salePrice);

        updateData.updatedAt = new Date();

        const result = await db.collection("Product").findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updateData },
            { returnDocument: "after" }
        );

        if (!result) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        revalidatePath("/dashboard");
        revalidatePath("/stock");

        return NextResponse.json({
            ...result,
            id: result._id.toString(),
            _id: undefined
        });
    } catch (error) {
        console.error("Failed to update stock", error);
        return NextResponse.json({ error: "Failed to update stock" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const db = await getDb();
        const user = session.user as any;

        // Fetch product to get warehouseId
        const product = await db.collection("Product").findOne({ _id: new ObjectId(id) });
        if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

        const hasAccess = await checkWarehouseAccess(user.id, user.role, product.warehouseId.toString());
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied or expired" }, { status: 403 });
        }

        const result = await db.collection("Product").deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        revalidatePath("/dashboard");
        revalidatePath("/stock");

        return NextResponse.json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("Failed to delete product", error);
        return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }
}
