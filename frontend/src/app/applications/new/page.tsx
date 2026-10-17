"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LoadingState, ErrorState } from "@/components/States";
import { apiRequest, ApiError } from "@/lib/api";
import type { Application, Candidate, Job, PaginatedResponse } from "@/types";

export default function NewApplicationPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobId, setJobId] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobsData, candidatesData] = await Promise.all([
        apiRequest<PaginatedResponse<Job>>("/jobs", { params: { page_size: 100, status: "published" } }),
        apiRequest<PaginatedResponse<Candidate>>("/candidates", { params: { page_size: 100 } }),
      ]);
      setJobs(jobsData.items);
      setCandidates(candidatesData.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load jobs and candidates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!jobId || !candidateId) {
      setError("Please select both a job and a candidate.");
      return;
    }

    setSubmitting(true);
    try {
      const application = await apiRequest<Application>("/applications", {
        method: "POST",
        body: { job_id: jobId, candidate_id: candidateId, recruiter_notes: notes || undefined },
      });
      router.push(`/applications/${application.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProtectedRoute>
      <h1 className="text-2xl font-semibold text-slate-900">New Application</h1>
      <p className="mt-1 text-sm text-slate-500">Link a candidate to an open job.</p>

      {loading && <LoadingState />}
      {error && (
        <div className="mt-4">
          <ErrorState message={error} />
        </div>
      )}

      {!loading && (
        <form onSubmit={handleSubmit} className="mt-6 card max-w-xl space-y-4">
          <div>
            <label className="label">Job</label>
            <select className="input" value={jobId} onChange={(e) => setJobId(e.target.value)}>
              <option value="">Select a job...</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Candidate</label>
            <select className="input" value={candidateId} onChange={(e) => setCandidateId(e.target.value)}>
              <option value="">Select a candidate...</option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.full_name} ({candidate.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Recruiter Notes (optional)</label>
            <textarea className="input min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Creating..." : "Create Application"}
            </button>
          </div>
        </form>
      )}
    </ProtectedRoute>
  );
}
