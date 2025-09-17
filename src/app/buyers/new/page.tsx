"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { buyerCsvSchema } from "@/lib/validations";

export default function NewBuyerPage() {
  const router = useRouter(); // ✅ must be inside the component
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = {};

    for (const [key, value] of formData.entries()) {
      if (key === "budgetMin" || key === "budgetMax") {
        data[key] = value ? parseInt(value as string) : null;
      } else if (key === "bhk") {
        if (value === "") data[key] = null;
        else if (value === "One") data[key] = "1";
        else if (value === "Two") data[key] = "2";
        else if (value === "Three") data[key] = "3";
        else if (value === "Four") data[key] = "4";
        else data[key] = value;
      } else if (key === "tags" && typeof value === "string") {
        data[key] = value
          ? value.split(",").map(tag => tag.trim()).filter(tag => tag !== "")
          : [];
      } else if (typeof value === "string") data[key] = value || null;
    }

    try {
      buyerCsvSchema.parse(data);

      const response = await fetch("/api/buyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const resData = await response.json();
        setErrors({ form: resData.error || "Failed to create buyer lead" });
      } else {
        // ✅ Redirect to /buyers on success
        router.push("/buyers");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        const formattedErrors = error.format();
        Object.entries(formattedErrors).forEach(([field, err]) => {
          if (field !== "_errors" && typeof err === "object" && "_errors" in err) {
            fieldErrors[field] = err._errors[0] || "Invalid input";
          }
        });
        setErrors(fieldErrors);
      } else {
        setErrors({ form: "An unexpected error occurred" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-8 text-indigo-700 text-center">
          Create New Buyer Lead
        </h1>
        {errors.form && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {errors.form}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
              {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                City *
              </label>
              <select
                id="city"
                name="city"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              >
                <option value="">Select City</option>
                <option value="Chandigarh">Chandigarh</option>
                <option value="Mohali">Mohali</option>
                <option value="Zirakpur">Zirakpur</option>
                <option value="Panchkula">Panchkula</option>
                <option value="Other">Other</option>
              </select>
              {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
            </div>

            {/* Property Type */}
            <div>
              <label htmlFor="propertyType" className="block text-sm font-medium text-gray-700">
                Property Type *
              </label>
              <select
                id="propertyType"
                name="propertyType"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              >
                <option value="">Select Property Type</option>
                <option value="Apartment">Apartment</option>
                <option value="Villa">Villa</option>
                <option value="Plot">Plot</option>
                <option value="Office">Office</option>
                <option value="Retail">Retail</option>
              </select>
              {errors.propertyType && (
                <p className="mt-1 text-sm text-red-600">{errors.propertyType}</p>
              )}
            </div>

            {/* BHK */}
            <div>
              <label htmlFor="bhk" className="block text-sm font-medium text-gray-700">
                BHK (Required for Apartment/Villa)
              </label>
              <select
                id="bhk"
                name="bhk"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Select BHK</option>
                <option value="Studio">Studio</option>
                <option value="One">1 BHK</option>
                <option value="Two">2 BHK</option>
                <option value="Three">3 BHK</option>
                <option value="Four">4 BHK</option>
              </select>
              {errors.bhk && <p className="mt-1 text-sm text-red-600">{errors.bhk}</p>}
            </div>

            {/* Purpose */}
            <div>
              <label htmlFor="purpose" className="block text-sm font-medium text-gray-700">
                Purpose *
              </label>
              <select
                id="purpose"
                name="purpose"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              >
                <option value="">Select Purpose</option>
                <option value="Buy">Buy</option>
                <option value="Rent">Rent</option>
              </select>
              {errors.purpose && <p className="mt-1 text-sm text-red-600">{errors.purpose}</p>}
            </div>

            {/* Budget Min */}
            <div>
              <label htmlFor="budgetMin" className="block text-sm font-medium text-gray-700">
                Budget Min (INR)
              </label>
              <input
                type="number"
                id="budgetMin"
                name="budgetMin"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              {errors.budgetMin && <p className="mt-1 text-sm text-red-600">{errors.budgetMin}</p>}
            </div>

            {/* Budget Max */}
            <div>
              <label htmlFor="budgetMax" className="block text-sm font-medium text-gray-700">
                Budget Max (INR)
              </label>
              <input
                type="number"
                id="budgetMax"
                name="budgetMax"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              {errors.budgetMax && <p className="mt-1 text-sm text-red-600">{errors.budgetMax}</p>}
            </div>

            {/* Timeline */}
            <div>
              <label htmlFor="timeline" className="block text-sm font-medium text-gray-700">
                Timeline *
              </label>
              <select
                id="timeline"
                name="timeline"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              >
                <option value="">Select Timeline</option>
                <option value="ZeroToThreeMonths">0-3 months</option>
                <option value="ThreeToSixMonths">3-6 months</option>
                <option value="MoreThanSixMonths">&gt;6 months</option>
                <option value="Exploring">Exploring</option>
              </select>
              {errors.timeline && <p className="mt-1 text-sm text-red-600">{errors.timeline}</p>}
            </div>

            {/* Source */}
            <div>
              <label htmlFor="source" className="block text-sm font-medium text-gray-700">
                Source *
              </label>
              <select
                id="source"
                name="source"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              >
                <option value="">Select Source</option>
                <option value="Website">Website</option>
                <option value="Referral">Referral</option>
                <option value="WalkIn">Walk-in</option>
                <option value="Call">Call</option>
                <option value="Other">Other</option>
              </select>
              {errors.source && <p className="mt-1 text-sm text-red-600">{errors.source}</p>}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
              Tags (comma separated)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="e.g. premium, urgent, follow-up"
            />
            {errors.tags && <p className="mt-1 text-sm text-red-600">{errors.tags}</p>}
          </div>

          {/* Status */}
          <input type="hidden" name="status" value="New" />

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            ></textarea>
            {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes}</p>}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Buyer Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
