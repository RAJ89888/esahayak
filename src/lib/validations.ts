import { z } from "zod";

const CityEnum = z.enum(["Chandigarh", "Mohali", "Zirakpur", "Panchkula", "Other"]);
const PropertyTypeEnum = z.enum(["Apartment", "Villa", "Plot", "Office", "Retail"]);
const BHKEnum = z.enum(["1", "2", "3", "4", "Studio"]);
const PurposeEnum = z.enum(["Buy", "Rent"]);
const TimelineEnum = z.enum(["ZeroToThreeMonths", "ThreeToSixMonths", "MoreThanSixMonths", "Exploring"]);
const SourceEnum = z.enum(["Website", "Referral", "WalkIn", "Call", "Other"]);
const StatusEnum = z.enum(["New", "Qualified", "Contacted", "Visited", "Negotiation", "Converted", "Dropped"]);

// Schema using superRefine to validate dependent fields
export const buyerCsvSchema = z.object({
  fullName: z.string().min(2).max(80),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(10).max(15),
  city: CityEnum,
  propertyType: PropertyTypeEnum,
  bhk: z.union([BHKEnum, z.null()]).optional(),
  purpose: PurposeEnum,
  budgetMin: z.number().int().positive().optional().nullable(),
  budgetMax: z.number().int().positive().optional().nullable(),
  timeline: TimelineEnum,
  source: SourceEnum,
  notes: z.string().max(1000).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  status: StatusEnum.default("New").optional(),
}).superRefine((data, ctx) => {
  // BHK check
  if ((data.propertyType === "Apartment" || data.propertyType === "Villa") && !data.bhk) {
    ctx.addIssue({
      path: ["bhk"],
      message: "BHK is required for Apartment and Villa property types",
      code: "custom",
    });
  }

  // Budget check
  if (data.budgetMin && data.budgetMax && data.budgetMax < data.budgetMin) {
    ctx.addIssue({
      path: ["budgetMax"],
      message: "Maximum budget must be greater than or equal to minimum budget",
      code: "custom",
    });
  }
});

export const module = {
  buyerCsvSchema,
};
  