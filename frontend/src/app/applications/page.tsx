"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";
import StatusBadge from "@/components/StatusBadge";
import { apiRequest, ApiError } from "@/lib/api";
import type { Application, ApplicationStatus, Candidate, Job, PaginatedResponse } from "@/types";

const PAGE_SIZE = 10;

interface EnrichedApplication extends Application {
  candidateName?: string;
  jobTitle?: string;
}

export default function ApplicationsPage() {
  const [status, setStatus] = useState<ApplicationStatus | "">("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedResponse<Application> | null>(null);
  const [enriched, setEnriched] = useState<EnrichedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<PaginatedResponse<Application>>("/applications", {
        params: { status, page, page_size: PAGE_SIZE },
      });
      setData(result);

      const candidateIds = Array.from(new Set(result.items.map((a) => a.candidate_id)));
      const jobIds = Array.from(new Set(result.items.map((a) => a.job_id)));

      const [candidates, jobs] = await Promise.all([
        Promise.all(candidateIds.map((id) => apiRequest<Candidate>(`/candidates/${id}`).catch(() => null))),
        Promise.all(jobIds.map((id) => apiRequest<Job>(`/jobs/${id}`).catch(() => null))),
      ]);

      const candidateMap = new Map(candidates.filter(Boolean).map((c) => [c!.id, c!.full_name]));
      const jobMap = new Map(jobs.filter(Boolean).map((j) => [j!.id, j!.title]));

      setEnriched(
        result.items.map((app) => ({
          ...app,
          candidateName: candidateMap.get(app.candidate_id) || "Unknown",
          jobTitle: jobMap.get(app.job_id) || "Unknown",
        }))
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <ProtectedRoute>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Applications</h1>
          <p className="mt-1 text-sm text-slate-500">Track candidates through the hiring pipeline.</p>
        </div>
        <Link href="/applications/new" className="btn-primary">
          New Application
        </Link>
      </div>

      <div className="mt-6">
        <select
          className="input max-w-[200px]"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as ApplicationStatus | "");
          }}
        >
          <option value="">All statuses</option>
          <option value="applied">Applied</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="interview">Interview</option>
          <option value="hired">Hired</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="mt-6">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {!loading && !error && enriched.length === 0 && (
          <EmptyState title="No applications found" description="Create an application to link a candidate to a job." />
        )}

        {!loading && !error && enriched.length > 0 && (
          <div className="card overflow-x-auto !p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Match Score</th>
                  <th className="px-4 py-3">Applied</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {enriched.map((app) => (
                  <tr key={app.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{app.candidateName}</td>
                    <td className="px-4 py-3 text-slate-600">{app.jobTitle}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{app.match_score !== null ? `${app.match_score}%` : "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(app.applied_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/applications/${app.id}`} className="font-medium text-accent-500 hover:underline">
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
