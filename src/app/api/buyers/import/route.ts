import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buyerCsvSchema } from "@/lib/validations";
import { z } from "zod";
import { BHK, PropertyType, Purpose, Source, Timeline, City, Status } from "@prisma/client";

// Rate limiting
const RATE_LIMIT = 3;
const RATE_WINDOW = 10 * 60 * 1000;
const importLimits = new Map<string, { count: number; timestamp: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of importLimits.entries()) {
    if (now - value.timestamp > RATE_WINDOW) importLimits.delete(key);
  }
}, 60 * 60 * 1000);

// Helper to safely convert string to enum
function toEnum<T>(enumObj: any, value: string, fieldName: string): T {
  if (Object.values(enumObj).includes(value)) return value as T;
  throw new Error(`Invalid ${fieldName} value: ${value}`);
}

interface ValidBuyerRow {
  fullName: string;
  email?: string | null;
  phone: string;
  city: City;
  propertyType: PropertyType;
  bhk?: BHK | null;
  purpose: Purpose;
  budgetMin?: number | null;
  budgetMax?: number | null;
  timeline: Timeline;
  source: Source;
  notes?: string | null;
  tags?: string[];
  status?: string;
  ownerId: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // Rate limiting
    const userId = session.user.id;
    const now = Date.now();
    const userLimit = importLimits.get(userId);
    if (userLimit) {
      if (now - userLimit.timestamp < RATE_WINDOW) {
        if (userLimit.count >= RATE_LIMIT) return NextResponse.json({ message: "Rate limit exceeded." }, { status: 429 });
        userLimit.count++;
      } else importLimits.set(userId, { count: 1, timestamp: now });
    } else importLimits.set(userId, { count: 1, timestamp: now });

    const body = await req.json();
    if (!body.data || !Array.isArray(body.data)) return NextResponse.json({ message: "Invalid request format" }, { status: 400 });
    if (body.data.length > 200) return NextResponse.json({ message: "CSV file exceeds maximum of 200 rows" }, { status: 400 });

    const validRows: ValidBuyerRow[] = [];
    const errors: { row: number; errors: string[] }[] = [];

    for (let i = 0; i < body.data.length; i++) {
      const row = body.data[i];

      try {
        // Handle tags
        let tags: string[] | undefined;
        if (row.tags) {
          if (typeof row.tags === "string") {
            try {
              const parsed = JSON.parse(row.tags);
              tags = Array.isArray(parsed) ? parsed : row.tags.split(",").map((t: string) => t.trim());
            } catch {
              tags = row.tags.split(",").map((t: string) => t.trim());
            }
          } else if (Array.isArray(row.tags)) tags = row.tags;
        }

        const validatedRow = buyerCsvSchema.parse({
          ...row,
          budgetMin: row.budgetMin ? parseInt(row.budgetMin) : undefined,
          budgetMax: row.budgetMax ? parseInt(row.budgetMax) : undefined,
          bhk: row.bhk || undefined,
          tags,
        });

        // Push to validRows with proper enum conversion
        validRows.push({
          fullName: validatedRow.fullName,
          email: validatedRow.email ?? null,
          phone: validatedRow.phone,
          city: toEnum<City>(City, validatedRow.city, "city"),
          propertyType: toEnum<PropertyType>(PropertyType, validatedRow.propertyType, "propertyType"),
          bhk: validatedRow.bhk ? toEnum<BHK>(BHK, validatedRow.bhk, "bhk") : null,
          purpose: toEnum<Purpose>(Purpose, validatedRow.purpose, "purpose"),
          budgetMin: validatedRow.budgetMin ?? null,
          budgetMax: validatedRow.budgetMax ?? null,
          timeline: toEnum<Timeline>(Timeline, validatedRow.timeline, "timeline"),
          source: toEnum<Source>(Source, validatedRow.source, "source"),
          notes: validatedRow.notes ?? null,
          tags: validatedRow.tags ?? undefined,
          status: validatedRow.status ?? "New",
          ownerId: session.user.id,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push({
            row: i + 1,
            errors: error.issues.map((e) => {
              const path = Array.isArray(e.path) ? e.path.map(String).join(".") : String(e.path);
              return `${path}: ${e.message}`;
            }),
          });
        } else {
          errors.push({ row: i + 1, errors: [`Validation error: ${(error as Error).message}`] });
        }
      }
    }

    if (errors.length > 0) return NextResponse.json({ message: "Validation errors", errors }, { status: 400 });

    // Insert into DB
    const result = await prisma.$transaction(async (tx) => {
      const inserted: typeof validRows = [];
      for (const row of validRows) {
        const buyer = await tx.buyer.create({
          data: {
            fullName: row.fullName,
            email: row.email,
            phone: row.phone,
            city: row.city,
            propertyType: row.propertyType,
            bhk: row.bhk,
            purpose: row.purpose,

            budgetMin: row.budgetMin,
            budgetMax: row.budgetMax,
            timeline: row.timeline,
            source: row.source,
            notes: row.notes,
            tags: row.tags ? row.tags.join(",") : null,
            status: (row.status as Status) || "New",
            ownerId: row.ownerId,
          },
        });

        await tx.buyerHistory.create({
          data: {
            buyerId: buyer.id,
            changedBy: row.ownerId,
            diff: JSON.stringify({ action: "created", fields: Object.keys(row).filter((k) => k !== "ownerId") }),
          },
        });

        inserted.push({
          ...row,
          // @ts-ignore - id property is needed for response but not part of ValidBuyerRow interface
          id: buyer.id,
          tags: buyer.tags ? buyer.tags.split(",") : undefined,
          createdAt: buyer.createdAt,
          updatedAt: buyer.updatedAt
        });
      }
      return inserted;
    });

    return NextResponse.json({ message: "Import successful", imported: result.length });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json({ message: `Import failed: ${(error as Error).message}` }, { status: 500 });
  }
}
