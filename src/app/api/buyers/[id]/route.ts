import { buyerCsvSchema } from "@/lib/validations";
import { z } from "zod";
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const data = await req.json();

    // Validate the data
    try {
      buyerCsvSchema.parse(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { message: "Validation failed", errors: err.flatten().fieldErrors },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { message: "Invalid data" },
        { status: 400 }
      );
    }

    // Check if the buyer exists and ownership
    const buyer = await db.buyer.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!buyer) {
      return NextResponse.json(
        { message: "Buyer not found" },
        { status: 404 }
      );
    }
    // For demo: allow any signed-in user to edit

    // Map enums and tags for update
    let bhkValue: "One" | "Two" | "Three" | "Four" | "Studio" | null | undefined;
    switch (data.bhk) {
      case "1":
        bhkValue = "One";
        break;
      case "2":
        bhkValue = "Two";
        break;
      case "3":
        bhkValue = "Three";
        break;
      case "4":
        bhkValue = "Four";
        break;
      case "Studio":
        bhkValue = "Studio";
        break;
      default:
        bhkValue = null;
    }
    let sourceValue = data.source;
    let tagsValue = Array.isArray(data.tags) ? data.tags.join(",") : data.tags;
    const { bhk, source, tags, ...rest } = data;
    const updatedBuyer = await db.buyer.update({
      where: { id },
      data: {
        ...rest,
        bhk: bhkValue,
        source: sourceValue,
        tags: tagsValue,
      },
    });

    // Ensure demo user exists
    const demoUserId = "demo-user-id";
    await db.user.upsert({
      where: { id: demoUserId },
      update: {},
      create: {
        id: demoUserId,
        name: "Demo User",
        email: "demo@example.com",
      },
    });
    // Add history entry with demo user
    await db.buyerHistory.create({
      data: {
        buyerId: id,
        changedBy: demoUserId,
        diff: JSON.stringify({ action: "updated", fields: Object.keys(data) }),
      },
    });

    return NextResponse.json(updatedBuyer);
  } catch (error) {
    console.error("Error updating buyer:", error);
    return NextResponse.json(
      { message: `Error: ${(error as Error).message}`, details: (error as Error).stack },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma as db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    // Fetch the buyer with owner and history
    const buyer = await db.buyer.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
        history: {
          orderBy: {
            changedAt: "desc",
          },
          take: 5,
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!buyer) {
      return NextResponse.json(
        { message: "Buyer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(buyer);
  } catch (error) {
    console.error("Error fetching buyer:", error);
    return NextResponse.json(
      { message: `Error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const id = params.id;
    
    // Check if the buyer exists
    const buyer = await db.buyer.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!buyer) {
      return NextResponse.json(
        { message: "Buyer not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (buyer.ownerId !== session.user.id) {
      return NextResponse.json(
        { message: "You can only delete your own leads" },
        { status: 403 }
      );
    }

    // Delete the buyer and related history in a transaction
    await db.$transaction([
      db.buyerHistory.deleteMany({
        where: { buyerId: id },
      }),
      db.buyer.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ message: "Buyer deleted successfully" });
  } catch (error) {
    console.error("Error deleting buyer:", error);
    return NextResponse.json(
      { message: `Error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}