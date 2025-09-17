"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { AlertCircle, ArrowLeft, Edit, Trash } from "lucide-react";
import Link from "next/link";

interface BuyerHistory {
  id: string;
  buyerId: string;
  changedBy: string;
  changedAt: string;
  diff: string;
  user: { name: string; email: string };
}
interface Buyer {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  city: string;
  propertyType: string;
  bhk: string | null;
  purpose: string;
  budgetMin: number | null;
  budgetMax: number | null;
  timeline: string;
  source: string;
  status: string;
  notes: string | null;
  tags: string[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner: { name: string; email: string };
  history: BuyerHistory[];
}

import { use } from "react";

export default function BuyerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  // ...no session enforcement...
  const { id } = use(params) as { id: string };
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchBuyer = async () => {
      try {
        const response = await fetch(`/api/buyers/${id}`);
        if (!response.ok) throw new Error("Failed to fetch buyer details");
        const data = await response.json();
        setBuyer(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBuyer();
  }, [id]);



  const handleDelete = async () => {
  if (!buyer) return;
    if (!confirm("Are you sure you want to delete this buyer lead?")) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/buyers/${buyer.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete buyer lead");
      router.push("/buyers");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (error || !buyer) {
    return (
      <div className="container mx-auto py-10 space-y-4">
        <div className="flex items-center space-x-2 rounded-md border p-4 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <div>
            <h5 className="font-medium">Error</h5>
            <p className="text-sm">{error || "Buyer not found"}</p>
          </div>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md border bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
          onClick={() => router.push("/buyers")}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Buyers
        </button>
      </div>
    );
  }

  // const isOwner = false; // If you need owner logic, implement it differently

  const formatDiff = (diffString: string) => {
    try {
      const diff = JSON.parse(diffString);
      if (diff.action === "created") return "Lead created";

      const changes = [];
      for (const [key, value] of Object.entries(diff)) {
        if (key !== "action") {
          const oldValue = (value as any).old;
          const newValue = (value as any).new;
          changes.push(`${key}: ${oldValue} → ${newValue}`);
        }
      }
      return changes.join(", ");
    } catch {
      return "Changed lead information";
    }
  };

  return (
    <div className="container mx-auto py-10 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-md border bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
            onClick={() => router.push("/buyers")}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="text-2xl font-bold">{buyer.fullName}</h1>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
            {buyer.status}
          </span>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/buyers/${buyer.id}/edit`}
            className="inline-flex items-center gap-2 rounded-md border bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
          >
            <Edit className="h-4 w-4" /> Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
          >
            <Trash className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>

      {/* Buyer Info + History */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Buyer Information */}
        <div className="md:col-span-2 border rounded-lg p-6 space-y-4 bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Buyer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Full Name</p>
              <p>{buyer.fullName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Phone</p>
              <p>{buyer.phone}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p>{buyer.email || "—"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">City</p>
              <p>{buyer.city}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Property Type</p>
              <p>{buyer.propertyType}</p>
            </div>
            {(buyer.propertyType === "Apartment" || buyer.propertyType === "Villa") && (
              <div>
                <p className="text-sm font-medium text-gray-500">BHK</p>
                <p>{buyer.bhk}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">Purpose</p>
              <p>{buyer.purpose}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Budget</p>
              <p>
                {buyer.budgetMin ? `₹${buyer.budgetMin.toLocaleString()}` : "—"} to{" "}
                {buyer.budgetMax ? `₹${buyer.budgetMax.toLocaleString()}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Timeline</p>
              <p>{buyer.timeline}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Source</p>
              <p>{buyer.source}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p>{buyer.status}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Owner</p>
              <p>
                {buyer.owner.name} ({buyer.owner.email})
              </p>
            </div>
          </div>

          <hr className="my-4" />

          <div>
            <p className="text-sm font-medium text-gray-500">Notes</p>
            <p className="whitespace-pre-wrap">{buyer.notes || "—"}</p>
          </div>

          {Array.isArray(buyer.tags) && buyer.tags.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {buyer.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-gray-200 rounded-full text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="text-sm text-gray-500 flex justify-between mt-4">
            <span>Created: {format(new Date(buyer.createdAt), "PPP")}</span>
            <span>Last Updated: {format(new Date(buyer.updatedAt), "PPP")}</span>
          </div>
        </div>

        {/* History */}
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-1">History</h2>
          <p className="text-sm text-gray-500 mb-4">Recent changes to this lead</p>
          {buyer.history && buyer.history.length > 0 ? (
            <div className="overflow-auto max-h-72">
              <table className="min-w-full border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="border px-4 py-2 text-left text-sm font-medium">Date</th>
                    <th className="border px-4 py-2 text-left text-sm font-medium">Changes</th>
                    <th className="border px-4 py-2 text-left text-sm font-medium">By</th>
                  </tr>
                </thead>
                <tbody>
                  {buyer.history.slice(0, 5).map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="border px-4 py-2 whitespace-nowrap">
                        {format(new Date(entry.changedAt), "PP")}
                      </td>
                      <td className="border px-4 py-2">{formatDiff(entry.diff)}</td>
                      <td className="border px-4 py-2">{entry.user.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No history available</p>
          )}
        </div>
      </div>
    </div>
  );
}
