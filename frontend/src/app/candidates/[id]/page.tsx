"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LoadingState, ErrorState, EmptyState } from "@/components/States";
import StatusBadge from "@/components/StatusBadge";
import ConfirmDialog from "@/components/ConfirmDialog";
import { apiDownload, apiRequest, apiUpload, ApiError } from "@/lib/api";
import type { Application, Candidate, PaginatedResponse } from "@/types";

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [candidateData, appsData] = await Promise.all([
        apiRequest<Candidate>(`/candidates/${params.id}`),
        apiRequest<PaginatedResponse<Application>>("/applications", { params: { page_size: 50 } }),
      ]);
      setCandidate(candidateData);
      setApplications(appsData.items.filter((a) => a.candidate_id === params.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load candidate.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    try {
      await apiRequest(`/candidates/${params.id}`, { method: "DELETE" });
      router.push("/candidates");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to delete candidate.");
      setConfirmDelete(false);
    }
  }

  async function uploadCv() {
    if (!cvFile) return;
    setUploading(true);
    setCvError(null);
    try {
      const formData = new FormData();
      formData.append("file", cvFile);
      const updated = await apiUpload<Candidate>(`/candidates/${params.id}/cv`, formData);
      setCandidate(updated);
      setCvFile(null);
    } catch (err) {
      setCvError(err instanceof ApiError ? err.message : "Failed to upload CV.");
    } finally {
      setUploading(false);
    }
  }

  async function downloadCv() {
    setCvError(null);
    try {
      const { blob, filename } = await apiDownload(`/candidates/${params.id}/cv`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || candidate?.cv_filename || "cv.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setCvError(err instanceof ApiError ? err.message : "Failed to download CV.");
    }
  }

  return (
    <ProtectedRoute>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && candidate && (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{candidate.full_name}</h1>
              <p className="mt-1 text-sm text-slate-500">{candidate.email}</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/candidates/${candidate.id}/edit`} className="btn-secondary">
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

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="card">
              <p className="text-xs uppercase text-slate-500">Phone</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{candidate.phone || "—"}</p>
            </div>
            <div className="card">
              <p className="text-xs uppercase text-slate-500">Experience Summary</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{candidate.experience_summary || "—"}</p>
            </div>
          </div>

          <div className="mt-6 card">
            <h2 className="text-sm font-semibold text-slate-700">Skills</h2>
            <p className="mt-2 text-sm text-slate-600">{candidate.skills || "None specified"}</p>
          </div>

          <div className="mt-6 card">
            <h2 className="text-sm font-semibold text-slate-700">CV File</h2>
            {candidate.cv_filename ? (
              <div className="mt-2 flex items-center gap-3">
                <span className="text-sm text-slate-600">{candidate.cv_filename}</span>
                <button className="btn-secondary" onClick={downloadCv}>
                  Download CV
                </button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No CV file uploaded for this candidate.</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="input max-w-sm"
                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
              />
              <button className="btn-primary" disabled={!cvFile || uploading} onClick={uploadCv}>
                {uploading ? "Uploading..." : candidate.cv_filename ? "Replace CV" : "Upload CV"}
              </button>
            </div>
            {cvError && (
              <div className="mt-3">
                <ErrorState message={cvError} />
              </div>
            )}
            <p className="mt-2 text-xs text-slate-400">
              PDF only. Uploading extracts the text for AI matching and stores the original file.
            </p>
          </div>

          <div className="mt-6 card">
            <h2 className="text-sm font-semibold text-slate-700">CV Text</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
              {candidate.cv_text || "No CV text has been added for this candidate."}
            </p>
          </div>

          <div className="mt-6 card">
            <h2 className="text-sm font-semibold text-slate-700">Applications</h2>
            {applications.length === 0 ? (
              <div className="mt-3">
                <EmptyState title="No applications" description="This candidate has not applied to any jobs yet." />
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {applications.map((app) => (
                  <Link
                    key={app.id}
                    href={`/applications/${app.id}`}
                    className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
                  >
                    <StatusBadge status={app.status} />
                    <span className="text-sm text-slate-500">{new Date(app.applied_at).toLocaleDateString()}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this candidate?"
        description="This action cannot be undone. All related applications will also be removed."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </ProtectedRoute>
  );
}
