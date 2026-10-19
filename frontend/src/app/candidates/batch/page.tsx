"use client";

import { useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ErrorState } from "@/components/States";
import { apiUpload, ApiError } from "@/lib/api";
import type { CandidateBatchResult } from "@/types";

export default function BatchUploadCandidatesPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CandidateBatchResult | null>(null);

  function handleSelect(selected: FileList | null) {
    setFiles(Array.from(selected || []));
    setResult(null);
    setError(null);
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      const data = await apiUpload<CandidateBatchResult>("/candidates/batch", formData);
      setResult(data);
      setFiles([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to upload CVs.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Batch Upload CVs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload multiple PDF CVs at once. Each file becomes a candidate profile.
          </p>
        </div>
        <Link href="/candidates" className="btn-secondary">
          Back to Candidates
        </Link>
      </div>

      <div className="mt-6 card max-w-3xl">
        <label className="label">CV Files (PDF)</label>
        <input
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="input"
          onChange={(e) => handleSelect(e.target.files)}
        />
        <p className="mt-2 text-xs text-slate-400">
          Up to 25 PDF files. The candidate name, email and phone are extracted from each CV when possible;
          files without an email are given a placeholder email you can edit later.
        </p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-slate-500">{files.length} file(s) selected</span>
          <button className="btn-primary" disabled={files.length === 0 || uploading} onClick={handleUpload}>
            {uploading ? "Uploading..." : "Upload CVs"}
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
          <h2 className="text-sm font-semibold text-slate-700">Upload Summary</h2>
          <p className="mt-1 text-sm text-slate-500">
            {result.created.length} candidate(s) created, {result.errors.length} file(s) skipped.
          </p>

          {result.created.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">File</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {result.created.map((candidate) => (
                    <tr key={candidate.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2 font-medium text-slate-900">{candidate.full_name}</td>
                      <td className="px-3 py-2 text-slate-600">{candidate.email}</td>
                      <td className="px-3 py-2 text-slate-500">{candidate.cv_filename || "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/candidates/${candidate.id}`}
                          className="font-medium text-accent-500 hover:underline"
                        >
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
              <p className="text-xs font-medium uppercase text-slate-500">Skipped Files</p>
              <ul className="mt-2 space-y-1 text-sm text-red-700">
                {result.errors.map((item, index) => (
                  <li key={`${item.filename}-${index}`}>
                    <span className="font-medium">{item.filename}</span>: {item.error}
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
