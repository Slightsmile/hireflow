"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";
import { apiRequest, ApiError } from "@/lib/api";
import type { Candidate, PaginatedResponse } from "@/types";

const PAGE_SIZE = 10;

export default function CandidatesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse<Candidate> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<PaginatedResponse<Candidate>>("/candidates", {
        params: { search, page, page_size: PAGE_SIZE },
      });
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load candidates.");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <ProtectedRoute>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Candidates</h1>
          <p className="mt-1 text-sm text-slate-500">Browse and manage candidate profiles.</p>
        </div>
        <Link href="/candidates/new" className="btn-primary">
          Add Candidate
        </Link>
      </div>

      <div className="mt-6">
        <input
          className="input max-w-sm"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
      </div>

      <div className="mt-6">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {!loading && !error && data && data.items.length === 0 && (
          <EmptyState title="No candidates found" description="Try a different search, or add a new candidate." />
        )}

        {!loading && !error && data && data.items.length > 0 && (
          <div className="card overflow-x-auto !p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Added</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((candidate) => (
                  <tr key={candidate.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{candidate.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{candidate.email}</td>
                    <td className="px-4 py-3 text-slate-600">{candidate.phone || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(candidate.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/candidates/${candidate.id}`} className="font-medium text-accent-500 hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>
              Page {page} of {totalPages} ({data.total} total)
            </span>
            <div className="flex gap-2">
              <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
