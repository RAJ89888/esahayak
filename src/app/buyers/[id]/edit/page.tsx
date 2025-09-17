
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// import { useSession } from "next-auth/react";
import { buyerCsvSchema } from "@/lib/validations";
import { z } from "zod";

type FormData = z.infer<typeof buyerCsvSchema>;

export default function EditBuyerPage({ params }: { params: Promise<{ id: string }> }) {
	const router = useRouter();
		// const { data: session, status: sessionStatus } = useSession();
		// ...no session enforcement...
	const [buyer, setBuyer] = useState<FormData | null>(null);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [loading, setLoading] = useState(true);
	const [unwrappedParams, setUnwrappedParams] = useState<{ id: string } | null>(null);

		useEffect(() => {
				let isMounted = true;
				Promise.resolve(params).then((resolved) => {
						if (isMounted) setUnwrappedParams(resolved);
				});
				return () => { isMounted = false; };
		}, [params]);

	useEffect(() => {
		if (!unwrappedParams?.id) return;
		const fetchBuyer = async () => {
			setLoading(true);
			try {
				const response = await fetch(`/api/buyers/${unwrappedParams.id}`);
				if (!response.ok) throw new Error("Failed to fetch buyer");
				const data = await response.json();
				setBuyer(data);
			} catch (err) {
				setBuyer(null);
			} finally {
				setLoading(false);
			}
		};
		fetchBuyer();
	}, [unwrappedParams]);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		try {
			e.preventDefault();
			setIsSubmitting(true);
			setErrors({});
			if (!unwrappedParams?.id) {
				setErrors({ form: "Buyer ID not found. Cannot update." });
				setIsSubmitting(false);
				return;
			}
			const formData = new FormData(e.currentTarget);
			const debugData: Record<string, any> = {};
			for (const [key, value] of formData.entries()) {
				debugData[key] = value;
			}
			console.log("FormData before processing:", debugData);
			const data: Record<string, any> = {};
			for (const [key, value] of formData.entries()) {
				if (key === "budgetMin" || key === "budgetMax") {
					data[key] = value ? parseInt(value as string) : null;
				} else if (key === "bhk" && value === "") {
					data[key] = null;
				} else if (key === "tags" && typeof value === "string") {
					data[key] = value ? value.split(",").map(tag => tag.trim()).filter(tag => tag !== "") : [];
				} else if (typeof value === "string") {
					data[key] = value || null;
				}
			}
			console.log("Processed data for API:", data);
			buyerCsvSchema.parse(data);
			console.log("Validation passed, sending PUT request...");
			const response = await fetch(`/api/buyers/${unwrappedParams.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			console.log("API response status:", response.status);
					if (response.ok) {
						console.log("Update successful, redirecting...");
						await router.push(`/buyers`);
						await router.refresh();
			} else {
				let errorData;
				try {
					errorData = await response.json();
				} catch (err) {
					errorData = { message: "Failed to parse error response" };
				}
				console.error("API error response:", errorData);
				setErrors(errorData.errors || { form: errorData.message || errorData.error || "Failed to update buyer lead" });
				// Prevent redirect on error
				return;
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
						console.error("Full Zod error:", error);
						console.error("Validation errors:", fieldErrors);
						if (Object.keys(fieldErrors).length === 0) {
							setErrors({ form: "Validation failed. Please check all required fields and try again." });
						} else {
							setErrors(fieldErrors);
						}
					} else {
						console.error("Unexpected error:", error);
						setErrors({ form: "An unexpected error occurred" });
					}
		} finally {
			setIsSubmitting(false);
		}
	};

			if (loading || !unwrappedParams?.id) {
				return <div className="container mx-auto py-8">Loading...</div>;
			}
				// if (!session) {
				// 	router.push("/auth/signin");
				// 	return null;
				// }
			if (!buyer) {
				return <div className="container mx-auto py-8">Buyer not found.</div>;
			}

	return (
		<div className="container mx-auto py-8 px-4">
			<div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
				<h1 className="text-3xl font-bold mb-8 text-indigo-700 text-center">Edit Buyer Lead</h1>
				{errors.form && (
					<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
						{errors.form}
					</div>
				)}
				<form onSubmit={handleSubmit} className="space-y-8">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						<div>
							<label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name *</label>
							<input type="text" id="fullName" name="fullName" defaultValue={buyer.fullName ?? ""} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
							{errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
						</div>
						<div>
							<label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
							<input type="email" id="email" name="email" defaultValue={buyer.email ?? ""} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
							{errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
						</div>
						<div>
							<label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone *</label>
							<input type="tel" id="phone" name="phone" defaultValue={buyer.phone ?? ""} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
							{errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
						</div>
						<div>
							<label htmlFor="city" className="block text-sm font-medium text-gray-700">City *</label>
							<select id="city" name="city" defaultValue={buyer.city ?? ""} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
								<option value="">Select City</option>
								<option value="Chandigarh">Chandigarh</option>
								<option value="Mohali">Mohali</option>
								<option value="Zirakpur">Zirakpur</option>
								<option value="Panchkula">Panchkula</option>
								<option value="Other">Other</option>
							</select>
							{errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
						</div>
						<div>
							<label htmlFor="propertyType" className="block text-sm font-medium text-gray-700">Property Type *</label>
							<select id="propertyType" name="propertyType" defaultValue={buyer.propertyType ?? ""} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
								<option value="">Select Property Type</option>
								<option value="Apartment">Apartment</option>
								<option value="Villa">Villa</option>
								<option value="Plot">Plot</option>
								<option value="Office">Office</option>
								<option value="Retail">Retail</option>
							</select>
							{errors.propertyType && <p className="mt-1 text-sm text-red-600">{errors.propertyType}</p>}
						</div>
						<div>
							<label htmlFor="bhk" className="block text-sm font-medium text-gray-700">BHK (Required for Apartment/Villa)</label>
							<select id="bhk" name="bhk" defaultValue={buyer.bhk ?? ""} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
								<option value="">Select BHK</option>
								<option value="Studio">Studio</option>
								<option value="1">1 BHK</option>
								<option value="2">2 BHK</option>
								<option value="3">3 BHK</option>
								<option value="4">4 BHK</option>
							</select>
							{errors.bhk && <p className="mt-1 text-sm text-red-600">{errors.bhk}</p>}
						</div>
						<div>
							<label htmlFor="purpose" className="block text-sm font-medium text-gray-700">Purpose *</label>
							<select id="purpose" name="purpose" defaultValue={buyer.purpose ?? ""} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
								<option value="">Select Purpose</option>
								<option value="Buy">Buy</option>
								<option value="Rent">Rent</option>
							</select>
							{errors.purpose && <p className="mt-1 text-sm text-red-600">{errors.purpose}</p>}
						</div>
						<div>
							<label htmlFor="budgetMin" className="block text-sm font-medium text-gray-700">Budget Min (INR)</label>
							<input type="number" id="budgetMin" name="budgetMin" defaultValue={buyer.budgetMin ?? ""} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
							{errors.budgetMin && <p className="mt-1 text-sm text-red-600">{errors.budgetMin}</p>}
						</div>
						<div>
							<label htmlFor="budgetMax" className="block text-sm font-medium text-gray-700">Budget Max (INR)</label>
							<input type="number" id="budgetMax" name="budgetMax" defaultValue={buyer.budgetMax ?? ""} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
							{errors.budgetMax && <p className="mt-1 text-sm text-red-600">{errors.budgetMax}</p>}
						</div>
						<div>
							<label htmlFor="timeline" className="block text-sm font-medium text-gray-700">Timeline *</label>
							<select id="timeline" name="timeline" defaultValue={buyer.timeline ?? ""} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
								<option value="">Select Timeline</option>
								<option value="ZeroToThreeMonths">0-3 months</option>
								<option value="ThreeToSixMonths">3-6 months</option>
								<option value="MoreThanSixMonths">&gt;6 months</option>
								<option value="Exploring">Exploring</option>
							</select>
							{errors.timeline && <p className="mt-1 text-sm text-red-600">{errors.timeline}</p>}
						</div>
						<div>
							<label htmlFor="source" className="block text-sm font-medium text-gray-700">Source *</label>
							<select id="source" name="source" defaultValue={buyer.source ?? ""} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
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
					<div>
						<label htmlFor="tags" className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
						<input type="text" id="tags" name="tags" defaultValue={Array.isArray(buyer.tags) ? buyer.tags.join(", ") : buyer.tags ?? ""} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="e.g. premium, urgent, follow-up" />
						{errors.tags && <p className="mt-1 text-sm text-red-600">{errors.tags}</p>}
					</div>
					<div>
						<label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
						<textarea id="notes" name="notes" rows={4} defaultValue={buyer.notes ?? ""} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"></textarea>
						{errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes}</p>}
					</div>
					<div className="flex justify-end">
						<button type="submit" disabled={isSubmitting || !buyer || !unwrappedParams?.id} className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50">
							{isSubmitting ? "Updating..." : "Update Buyer Lead"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
