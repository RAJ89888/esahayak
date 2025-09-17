"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertCircle, Upload } from "lucide-react";
import { buyerCsvSchema } from "@/lib/validations";
import Papa from "papaparse";

interface CSVRow {
  fullName: string;
  email?: string;
  phone: string;
  city: string;
  propertyType: string;
  bhk?: string;
  purpose: string;
  budgetMin?: string;
  budgetMax?: string;
  timeline: string;
  source: string;
  notes?: string;
  tags?: string;
  status?: string;
}

interface ValidationError {
  row: number;
  errors: string[];
}

export default function ImportPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-[450px] rounded-lg border bg-white shadow-sm p-6">
          <h3 className="text-2xl font-semibold">Authentication Required</h3>
          <p className="text-sm text-gray-500">Please sign in to access this page.</p>
        </div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidationErrors([]);
      setSuccessMessage("");
      setErrorMessage("");

      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as CSVRow[];
          setParsedData(data);

          if (data.length > 200) {
            setErrorMessage("CSV file exceeds maximum of 200 rows");
            return;
          }

          const requiredHeaders = [
            "fullName",
            "phone",
            "city",
            "propertyType",
            "purpose",
            "timeline",
            "source",
          ];

          const headers = results.meta.fields || [];
          const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

          if (missingHeaders.length > 0) {
            setErrorMessage(`Missing required headers: ${missingHeaders.join(", ")}`);
            return;
          }
        },
        error: (error) => {
          setErrorMessage(`Error parsing CSV: ${error.message}`);
        },
      });
    }
  };

  const validateData = async () => {
    if (!parsedData.length) return;

    const errors: ValidationError[] = [];

    parsedData.forEach((row, index) => {
      try {
        if (row.tags) {
          try {
            if (row.tags.startsWith("[") && row.tags.endsWith("]")) {
              JSON.parse(row.tags);
            }
          } catch (e) {
            errors.push({
              row: index + 1,
              errors: [`Invalid tags format. Use comma-separated values or JSON array`],
            });
          }
        }

        const result = buyerCsvSchema.safeParse({
          ...row,
          budgetMin: row.budgetMin ? parseInt(row.budgetMin) : undefined,
          budgetMax: row.budgetMax ? parseInt(row.budgetMax) : undefined,
          bhk: row.bhk || undefined,
          tags: row.tags ? row.tags.split(",").map((tag) => tag.trim()) : undefined,
        });

        if (!result.success) {
          const issues = result.error.issues.map(
            (e) => `${e.path.join(".")}: ${e.message}`
          );
          errors.push({ row: index + 1, errors: issues });
        }
      } catch (error) {
        errors.push({
          row: index + 1,
          errors: [`Validation error: ${(error as Error).message}`],
        });
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleImport = async () => {
    if (!file || !parsedData.length) return;

    setIsUploading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const isValid = await validateData();
      if (!isValid) {
        setIsUploading(false);
        return;
      }

      const response = await fetch("/api/buyers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: parsedData }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to import data");
      }

      setSuccessMessage(`Successfully imported ${result.imported} buyer leads`);
      router.refresh();

      setFile(null);
      setParsedData([]);

      setTimeout(() => router.push("/buyers"), 2000);
    } catch (error) {
      setErrorMessage(`Import failed: ${(error as Error).message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="rounded-lg border bg-white shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-2xl font-semibold">Import Buyer Leads</h3>
          <p className="text-sm text-gray-500">
            Upload a CSV file with buyer lead data. Maximum 200 rows.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="flex-1 h-10 px-3 py-2 border rounded-md text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={validateData}
            disabled={!file || isUploading}
            className="px-4 py-2 rounded-md border bg-gray-100 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Validate
          </button>
          <button
            onClick={handleImport}
            disabled={!file || isUploading || validationErrors.length > 0}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Data
          </button>
        </div>

        {file && (
          <div className="text-sm text-gray-500">
            Selected file: {file.name} ({Math.round(file.size / 1024)} KB)
          </div>
        )}

        {successMessage && (
          <div className="relative w-full rounded-lg border border-green-200 bg-green-50 p-4">
            <h5 className="font-medium text-green-700">Success</h5>
            <div className="text-sm">{successMessage}</div>
          </div>
        )}

        {errorMessage && (
          <div className="relative w-full rounded-lg border border-red-400 bg-red-50 p-4 flex items-start gap-2">
            <AlertCircle className="text-red-600 mt-1" />
            <div>
              <h5 className="font-medium text-red-700">Error</h5>
              <div className="text-sm">{errorMessage}</div>
            </div>
          </div>
        )}

        {validationErrors.length > 0 && (
          <div className="border rounded-md p-4 max-h-72 overflow-auto">
            <h3 className="text-lg font-medium mb-2">Validation Errors</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border px-4 py-2 text-left w-1/6">Row</th>
                  <th className="border px-4 py-2 text-left w-5/6">Errors</th>
                </tr>
              </thead>
              <tbody>
                {validationErrors.map((error) => (
                  <tr key={error.row} className="hover:bg-gray-100">
                    <td className="border px-4 py-2">{error.row}</td>
                    <td className="border px-4 py-2">
                      <ul className="list-disc pl-5 text-red-600">
                        {error.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {parsedData.length > 0 && validationErrors.length === 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Preview ({parsedData.length} rows)</h3>
            <div className="overflow-auto max-h-96 border rounded-md">
              <table className="w-full border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-4 py-2 text-left">Name</th>
                    <th className="border px-4 py-2 text-left">Phone</th>
                    <th className="border px-4 py-2 text-left">City</th>
                    <th className="border px-4 py-2 text-left">Property Type</th>
                    <th className="border px-4 py-2 text-left">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="border px-4 py-2">{row.fullName}</td>
                      <td className="border px-4 py-2">{row.phone}</td>
                      <td className="border px-4 py-2">{row.city}</td>
                      <td className="border px-4 py-2">{row.propertyType}</td>
                      <td className="border px-4 py-2">{row.purpose}</td>
                    </tr>
                  ))}
                  {parsedData.length > 5 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="border px-4 py-2 text-center text-gray-500"
                      >
                        {parsedData.length - 5} more rows...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
