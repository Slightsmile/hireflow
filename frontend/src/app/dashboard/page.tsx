"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";
import StatusBadge from "@/components/StatusBadge";
import { apiRequest, ApiError } from "@/lib/api";
import type { Application, DashboardStats } from "@/types";

function StatCard({ label, value, href }: { label: string; value: number; href?: string }) {
  const content = (
    <div className="card">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [statsData, recentData] = await Promise.all([
          apiRequest<DashboardStats>("/dashboard/stats"),
          apiRequest<{ items: Application[] }>("/dashboard/recent-applications"),
        ]);
        setStats(statsData);
        setRecent(recentData.items);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <ProtectedRoute>
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Overview of recruitment activity.</p>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && stats && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total Jobs" value={stats.total_jobs} href="/jobs" />
            <StatCard label="Open Jobs" value={stats.open_jobs} href="/jobs?status=published" />
            <StatCard label="Total Candidates" value={stats.total_candidates} href="/candidates" />
            <StatCard label="Total Applications" value={stats.total_applications} href="/applications" />
            <StatCard label="Awaiting Review" value={stats.applications_awaiting_review} href="/applications?status=applied" />
          </div>

          <div className="mt-8 card">
            <h2 className="text-sm font-semibold text-slate-700">Applications by Status</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {Object.entries(stats.status_counts).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5">
                  <StatusBadge status={status} />
                  <span className="text-sm font-medium text-slate-700">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 card">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Recent Applications</h2>
              <Link href="/applications" className="text-sm font-medium text-accent-500 hover:underline">
                View all
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="No applications yet" description="Applications will appear here once candidates apply to jobs." />
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Match Score</th>
                      <th className="py-2 pr-4">Applied</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((app) => (
                      <tr key={app.id} className="border-b border-slate-100">
                        <td className="py-2 pr-4">
                          <StatusBadge status={app.status} />
                        </td>
                        <td className="py-2 pr-4">{app.match_score !== null ? `${app.match_score}%` : "—"}</td>
                        <td className="py-2 pr-4 text-slate-500">{new Date(app.applied_at).toLocaleDateString()}</td>
                        <td className="py-2 text-right">
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
          </div>
        </>
      )}
    </ProtectedRoute>
  );
}
