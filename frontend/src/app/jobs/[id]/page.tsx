"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LoadingState, ErrorState } from "@/components/States";
import StatusBadge from "@/components/StatusBadge";
import ConfirmDialog from "@/components/ConfirmDialog";
import { apiRequest, ApiError } from "@/lib/api";
import type { Job } from "@/types";

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<Job>(`/jobs/${params.id}`);
      setJob(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load job.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(status: string) {
    setActionError(null);
    try {
      const updated = await apiRequest<Job>(`/jobs/${params.id}`, { method: "PATCH", body: { status } });
      setJob(updated);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to update job status.");
    }
  }

  async function handleDelete() {
    try {
      await apiRequest(`/jobs/${params.id}`, { method: "DELETE" });
      router.push("/jobs");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to delete job.");
      setConfirmDelete(false);
    }
  }

  return (
    <ProtectedRoute>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && job && (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{job.title}</h1>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={job.status} />
                {job.department && <span className="text-sm text-slate-500">{job.department}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/jobs/${job.id}/edit`} className="btn-secondary">
                Edit
              </Link>
              <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            </div>
          </div>

          {actionError && (
            <div className="mt-4">
              <ErrorState message={actionError} />
            </div>
          )}

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="card">
              <p className="text-xs uppercase text-slate-500">Location</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{job.location || "—"}</p>
            </div>
            <div className="card">
              <p className="text-xs uppercase text-slate-500">Employment Type</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{job.employment_type.replace("_", " ")}</p>
            </div>
            <div className="card">
              <p className="text-xs uppercase text-slate-500">Experience</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{job.experience_level || "—"}</p>
            </div>
          </div>

          <div className="mt-6 card">
            <h2 className="text-sm font-semibold text-slate-700">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{job.description}</p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="card">
              <h2 className="text-sm font-semibold text-slate-700">Required Skills</h2>
              <p className="mt-2 text-sm text-slate-600">{job.required_skills || "None specified"}</p>
            </div>
            <div className="card">
              <h2 className="text-sm font-semibold text-slate-700">Preferred Skills</h2>
              <p className="mt-2 text-sm text-slate-600">{job.preferred_skills || "None specified"}</p>
            </div>
          </div>

          <div className="mt-6 card">
            <h2 className="text-sm font-semibold text-slate-700">Workflow Actions</h2>
            <div className="mt-3 flex gap-2">
              <button className="btn-secondary" disabled={job.status === "published"} onClick={() => updateStatus("published")}>
                Publish
              </button>
              <button className="btn-secondary" disabled={job.status === "closed"} onClick={() => updateStatus("closed")}>
                Close
              </button>
              <button className="btn-secondary" disabled={job.status === "archived"} onClick={() => updateStatus("archived")}>
                Archive
              </button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this job?"
        description="This action cannot be undone. Applications linked to this job will also be removed."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </ProtectedRoute>
  );
}
