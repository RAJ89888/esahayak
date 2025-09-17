import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { buyerCsvSchema } from "@/lib/validations";

// Rate limiting
const RATE_LIMIT = 10; // Max requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute
const ipRequestMap = new Map<string, { count: number; resetTime: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRequestMap.get(ip);

  if (!record) {
    ipRequestMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return false;
  }

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_WINDOW;
    return false;
  }

  if (record.count >= RATE_LIMIT) return true;

  record.count++;
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const page = parseInt(searchParams.get("page") || "1");
    const limit = 10;
    const skip = (page - 1) * limit;

    const city = searchParams.get("city") || null;
    const propertyType = searchParams.get("propertyType") || null;
    const status = searchParams.get("status") || null;
    const timeline = searchParams.get("timeline") || null;
    const search = searchParams.get("search");

    const where: any = {};
    if (city) where.city = city;
    if (propertyType) where.propertyType = propertyType;
    if (status) where.status = status;
    if (timeline) where.timeline = timeline;

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const buyers = await prisma.buyer.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    });

    const total = await prisma.buyer.count({ where });

    return NextResponse.json({
      buyers,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching buyers:", error);
    return NextResponse.json({ error: "Failed to fetch buyers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (rateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests, please try again later" },
      { status: 429 }
    );
  }

  try {
    const data = await request.json();
    const validatedData = buyerCsvSchema.parse(data);

    // Map BHK values
    let bhkValue: "One" | "Two" | "Three" | "Four" | "Studio" | null | undefined;
    switch (validatedData.bhk) {
      case "1": bhkValue = "One"; break;
      case "2": bhkValue = "Two"; break;
      case "3": bhkValue = "Three"; break;
      case "4": bhkValue = "Four"; break;
      case "Studio": bhkValue = "Studio"; break;
      default: bhkValue = null;
    }

    const { bhk, ...rest } = validatedData;
    const sourceValue = rest.source;
    const tagsValue = Array.isArray(rest.tags) ? rest.tags.join(",") : rest.tags;
    const purposeValue = rest.purpose ?? "Investment";

    const demoUserId = "demo-user-id"; // Assign demo user

    const buyer = await prisma.buyer.create({
      data: {
        ...rest,
        bhk: bhkValue,
        source: sourceValue,
        purpose: purposeValue,
        tags: tagsValue,
        ownerId: demoUserId,
      },
    });

    await prisma.buyerHistory.create({
      data: {
        buyerId: buyer.id,
        changedBy: demoUserId,
        diff: JSON.stringify({ action: "created", fields: Object.keys(validatedData) }),
      },
    });

    return NextResponse.json(buyer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", errors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    console.error("Error creating buyer lead:", error);
    return NextResponse.json(
      { error: "Failed to create buyer lead", details: (error as Error).message },
      { status: 500 }
    );
  }
}
