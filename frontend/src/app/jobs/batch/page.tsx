"use client";

import { useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ErrorState } from "@/components/States";
import StatusBadge from "@/components/StatusBadge";
import { apiDownload, apiUpload, ApiError } from "@/lib/api";
import type { JobBatchResult } from "@/types";

const COLUMNS = [
  "title",
  "department",
  "description",
  "required_skills",
  "preferred_skills",
  "experience_level",
  "employment_type",
  "location",
  "status",
];

export default function BatchAddJobsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JobBatchResult | null>(null);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await apiUpload<JobBatchResult>("/jobs/batch", formData);
      setResult(data);
      setFile(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to upload jobs.");
    } finally {
      setUploading(false);
    }
  }

  async function downloadTemplate() {
    setError(null);
    try {
      const { blob } = await apiDownload("/jobs/batch/template");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "jobs-template.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to download the template.");
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Batch Add Jobs</h1>
          <p className="mt-1 text-sm text-slate-500">Create many job openings at once from a CSV file.</p>
        </div>
        <Link href="/jobs" className="btn-secondary">
          Back to Jobs
        </Link>
      </div>

      <div className="mt-6 card max-w-3xl">
        <label className="label">Jobs CSV</label>
        <input type="file" accept=".csv,text/csv" className="input" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <p className="mt-2 text-xs text-slate-400">
          Required columns: <span className="font-medium">title</span>, <span className="font-medium">description</span>.
          Optional: {COLUMNS.filter((c) => c !== "title" && c !== "description").join(", ")}. Rows missing required
          values or with invalid values are reported and skipped.
        </p>

        <div className="mt-4 flex items-center justify-between">
          <button className="btn-secondary" onClick={downloadTemplate}>
            Download CSV Template
          </button>
          <button className="btn-primary" disabled={!file || uploading} onClick={handleUpload}>
            {uploading ? "Uploading..." : "Upload Jobs"}
          </button>
        </div>

        {error && (
          <div className="mt-4">
            <ErrorState message={error} />
          </div>
        )}
      </div>

      {result && (
        <div className="mt-6 card max-w-3xl">
          <h2 className="text-sm font-semibold text-slate-700">Import Summary</h2>
          <p className="mt-1 text-sm text-slate-500">
            {result.created.length} job(s) created, {result.errors.length} row(s) skipped.
          </p>

          {result.created.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {result.created.map((job) => (
                    <tr key={job.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2 font-medium text-slate-900">{job.title}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link href={`/jobs/${job.id}`} className="font-medium text-accent-500 hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase text-slate-500">Skipped Rows</p>
              <ul className="mt-2 space-y-1 text-sm text-red-700">
                {result.errors.map((item) => (
                  <li key={item.row}>
                    Row {item.row}: {item.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </ProtectedRoute>
  );
}
