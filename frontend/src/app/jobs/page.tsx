"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";
import StatusBadge from "@/components/StatusBadge";
import { apiRequest, ApiError } from "@/lib/api";
import type { Job, JobStatus, PaginatedResponse } from "@/types";

const PAGE_SIZE = 10;

export default function JobsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <JobsPageContent />
    </Suspense>
  );
}

function JobsPageContent() {
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState<JobStatus | "">((searchParams.get("status") as JobStatus) || "");
  const [department, setDepartment] = useState(searchParams.get("department") || "");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PaginatedResponse<Job> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<PaginatedResponse<Job>>("/jobs", {
        params: { search, status, department, page, page_size: PAGE_SIZE },
      });
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  }, [search, status, department, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <ProtectedRoute>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Jobs</h1>
          <p className="mt-1 text-sm text-slate-500">Manage job openings and track their status.</p>
        </div>
        <Link href="/jobs/new" className="btn-primary">
          New Job
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <select
          className="input max-w-[180px]"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as JobStatus | "");
          }}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>
        <input
          className="input max-w-[200px]"
          placeholder="Filter by department"
          value={department}
          onChange={(e) => {
            setPage(1);
            setDepartment(e.target.value);
          }}
        />
      </div>

      <div className="mt-6">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {!loading && !error && data && data.items.length === 0 && (
          <EmptyState title="No jobs found" description="Try adjusting your search or filters, or create a new job." />
        )}

        {!loading && !error && data && data.items.length > 0 && (
          <div className="card overflow-x-auto !p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((job) => (
                  <tr key={job.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{job.title}</td>
                    <td className="px-4 py-3 text-slate-600">{job.department || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{job.location || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(job.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
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
