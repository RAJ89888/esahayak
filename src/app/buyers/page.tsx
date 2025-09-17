"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// Define enums locally instead of importing from Prisma client
const City = {
  Chandigarh: "Chandigarh",
  Mohali: "Mohali",
  Zirakpur: "Zirakpur",
  Panchkula: "Panchkula",
  Other: "Other"
} as const;

const PropertyType = {
  Apartment: "Apartment",
  Villa: "Villa",
  Plot: "Plot",
  Office: "Office",
  Retail: "Retail"
} as const;

const Status = {
  New: "New",
  Qualified: "Qualified",
  Contacted: "Contacted",
  Visited: "Visited",
  Negotiation: "Negotiation",
  Converted: "Converted",
  Dropped: "Dropped"
} as const;

const Timeline = {
  ZeroToThreeMonths: "ZeroToThreeMonths",
  ThreeToSixMonths: "ThreeToSixMonths",
  MoreThanSixMonths: "MoreThanSixMonths",
  Exploring: "Exploring"
} as const;

type City = typeof City[keyof typeof City];
type PropertyType = typeof PropertyType[keyof typeof PropertyType];
type Status = typeof Status[keyof typeof Status];
type Timeline = typeof Timeline[keyof typeof Timeline];
// Using Tailwind CSS directly instead of component imports

interface Buyer {
  id: string;
  fullName: string;
  phone: string;
  city: string;
  propertyType: string;
  budgetMin: number | null;
  budgetMax: number | null;
  timeline: string;
  status: string;
  updatedAt: string;
}

export default function BuyersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isClient, setIsClient] = useState(false);
  
  // Set isClient to true when component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Get filter values from URL
  const cityFilter = searchParams.get("city") || "";
  const propertyTypeFilter = searchParams.get("propertyType") || "";
  const statusFilter = searchParams.get("status") || "";
  const timelineFilter = searchParams.get("timeline") || "";
  
  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Fetch buyers when filters or page changes
  useEffect(() => {
    const fetchBuyers = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        
        if (cityFilter) queryParams.append("city", cityFilter);
        if (propertyTypeFilter) queryParams.append("propertyType", propertyTypeFilter);
        if (statusFilter) queryParams.append("status", statusFilter);
        if (timelineFilter) queryParams.append("timeline", timelineFilter);
        if (debouncedSearchTerm) queryParams.append("search", debouncedSearchTerm);
        queryParams.append("page", page.toString());
        
        const response = await fetch(`/api/buyers?${queryParams.toString()}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        setBuyers(data.buyers || []);
        setTotalPages(Math.ceil(data.total / 10) || 1);
      } catch (error) {
        console.error("Error fetching buyers:", error);
        setBuyers([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBuyers();
  }, [cityFilter, propertyTypeFilter, statusFilter, timelineFilter, debouncedSearchTerm, page]);
  
  // Update URL with filters
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    // Reset to page 1 when filters change
    params.set("page", "1");
    setPage(1);
    
    router.push(`/buyers?${params.toString()}`);
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Buyer Leads</h1>
        <div className="flex gap-2">
          <Link href="/buyers/import">
            <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Import CSV</button>
          </Link>
          <Link href="/buyers/new">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Add New Lead</button>
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name, phone, or email"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        
        {/* City Filter */}
        <div className="relative">
          <select
            value={cityFilter}
            onChange={(e) => updateFilter("city", e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Cities</option>
            <option value="Chandigarh">Chandigarh</option>
            <option value="Mohali">Mohali</option>
            <option value="Zirakpur">Zirakpur</option>
            <option value="Panchkula">Panchkula</option>
            <option value="Other">Other</option>
          </select>
        </div>
        
        {/* Property Type Filter */}
        <div className="relative">
          <select
            value={propertyTypeFilter}
            onChange={(e) => updateFilter("propertyType", e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="Apartment">Apartment</option>
            <option value="Villa">Villa</option>
            <option value="Plot">Plot</option>
            <option value="Office">Office</option>
            <option value="Retail">Retail</option>
          </select>
        </div>
        
        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => updateFilter("status", e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="New">New</option>
            <option value="Qualified">Qualified</option>
            <option value="Contacted">Contacted</option>
            <option value="Visited">Visited</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Converted">Converted</option>
            <option value="Dropped">Dropped</option>
          </select>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <svg className="animate-spin h-8 w-8 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Phone</th>
                  <th className="p-3 text-left">City</th>
                  <th className="p-3 text-left">Property Type</th>
                  <th className="p-3 text-left">Budget</th>
                  <th className="p-3 text-left">Timeline</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Updated</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isClient && buyers && buyers.length > 0 ? (
                  buyers.map((buyer) => (
                    <tr key={buyer.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{buyer.fullName}</td>
                      <td className="p-3">{buyer.phone}</td>
                      <td className="p-3">{buyer.city}</td>
                      <td className="p-3">{buyer.propertyType}</td>
                      <td className="p-3">
                        {buyer.budgetMin && buyer.budgetMax
                          ? `₹${buyer.budgetMin.toLocaleString()} - ₹${buyer.budgetMax.toLocaleString()}`
                          : buyer.budgetMin
                          ? `₹${buyer.budgetMin.toLocaleString()}+`
                          : buyer.budgetMax
                          ? `Up to ₹${buyer.budgetMax.toLocaleString()}`
                          : "-"}
                      </td>
                      <td className="p-3">{formatTimeline(buyer.timeline)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(buyer.status)}`}>
                          {buyer.status}
                        </span>
                      </td>
                      <td className="p-3">{new Date(buyer.updatedAt).toLocaleDateString('en-US', {year: 'numeric', month: 'numeric', day: 'numeric'})}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Link href={`/buyers/${buyer.id}`}>
                            <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">View</button>
                          </Link>
                          <Link href={`/buyers/${buyer.id}/edit`}>
                            <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">Edit</button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-500">
                      No buyers found. Try adjusting your filters or add a new lead.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6 gap-2">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <div className="flex items-center px-4">
                Page {page} of {totalPages}
              </div>
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Helper functions
function formatTimeline(timeline: Timeline): string {
  switch (timeline) {
    case "ZeroToThreeMonths":
      return "0-3 months";
    case "ThreeToSixMonths":
      return "3-6 months";
    case "MoreThanSixMonths":
      return ">6 months";
    case "Exploring":
      return "Exploring";
    default:
      return timeline;
  }
}

function getStatusColor(status: Status): string {
  switch (status) {
    case "New":
      return "bg-blue-100 text-blue-800";
    case "Qualified":
      return "bg-purple-100 text-purple-800";
    case "Contacted":
      return "bg-yellow-100 text-yellow-800";
    case "Visited":
      return "bg-indigo-100 text-indigo-800";
    case "Negotiation":
      return "bg-orange-100 text-orange-800";
    case "Converted":
      return "bg-green-100 text-green-800";
    case "Dropped":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}