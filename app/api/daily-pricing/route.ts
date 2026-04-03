import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Admins only" },
        { status: 403 },
      );
    }

    const { productId, warehouseId, price, date } = await req.json();

    if (!productId || !warehouseId || price === undefined || !date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const db = await getDb();

    // Ensure date is in YYYY-MM-DD format
    const formattedDate = new Date(date).toISOString().split("T")[0];

    let result;
    if (price === null) {
      // Delete the override
      result = await db.collection("DailyPricing").findOneAndDelete({
        productId: new ObjectId(productId),
        warehouseId: new ObjectId(warehouseId),
        date: formattedDate,
      });
    } else {
      // Upsert the override
      result = await db.collection("DailyPricing").findOneAndUpdate(
        {
          productId: new ObjectId(productId),
          warehouseId: new ObjectId(warehouseId),
          date: formattedDate,
        },
        {
          $set: {
            price: Number(price),
            updatedAt: new Date(),
          },
        },
        { upsert: true, returnDocument: "after" },
      );
    }
    revalidatePath("/dashboard");
    revalidatePath("/stock");

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to set daily price", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const warehouseId = searchParams.get("warehouseId");
  const date =
    searchParams.get("date") || new Date().toISOString().split("T")[0];

  if (!warehouseId) {
    return NextResponse.json(
      { error: "Warehouse ID is required" },
      { status: 400 },
    );
  }

  try {
    const db = await getDb();
    const pricing = await db
      .collection("DailyPricing")
      .find({
        warehouseId: new ObjectId(warehouseId),
        date: date,
      })
      .toArray();

    return NextResponse.json(pricing);
  } catch (error) {
    console.error("Failed to fetch daily pricing", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
