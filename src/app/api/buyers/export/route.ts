import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { stringify } from "csv-stringify/sync";

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query parameters for filtering
    const url = new URL(req.url);
    const city = url.searchParams.get("city");
    const propertyType = url.searchParams.get("propertyType");
    const status = url.searchParams.get("status");
    const timeline = url.searchParams.get("timeline");
    const search = url.searchParams.get("search");
    const sort = url.searchParams.get("sort") || "updatedAt";
    const order = url.searchParams.get("order") || "desc";

    // Build the query
    const where: any = {};

    if (city) {
      where.city = city;
    }

    if (propertyType) {
      where.propertyType = propertyType;
    }

    if (status) {
      where.status = status;
    }

    if (timeline) {
      where.timeline = timeline;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    // Fetch the data
    const buyers = await db.buyer.findMany({
      where,
      orderBy: {
        [sort]: order,
      },
      select: {
        fullName: true,
        email: true,
        phone: true,
        city: true,
        propertyType: true,
        bhk: true,
        purpose: true,
        budgetMin: true,
        budgetMax: true,
        timeline: true,
        source: true,
        notes: true,
        tags: true,
        status: true,
        updatedAt: true,
      },
    });

    // Format the data for CSV
    const formattedData = buyers.map(buyer => ({
      ...buyer,
      tags: buyer.tags ? JSON.stringify(buyer.tags) : "",
      updatedAt: buyer.updatedAt.toISOString(),
    }));

    // Generate CSV
    const csv = stringify(formattedData, {
      header: true,
      columns: [
        "fullName",
        "email",
        "phone",
        "city",
        "propertyType",
        "bhk",
        "purpose",
        "budgetMin",
        "budgetMax",
        "timeline",
        "source",
        "notes",
        "tags",
        "status",
        "updatedAt"
      ]
    });

    // Set headers for file download
    const headers = new Headers();
    headers.set("Content-Type", "text/csv");
    headers.set("Content-Disposition", `attachment; filename="buyer-leads-${new Date().toISOString().split('T')[0]}.csv"`);

    return new NextResponse(csv, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("CSV export error:", error);
    return NextResponse.json(
      { message: `Export failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}