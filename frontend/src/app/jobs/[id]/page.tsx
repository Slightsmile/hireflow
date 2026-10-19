"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LoadingState, ErrorState, EmptyState } from "@/components/States";
import StatusBadge from "@/components/StatusBadge";
import ConfirmDialog from "@/components/ConfirmDialog";
import { apiRequest, ApiError } from "@/lib/api";
import type { Candidate, Job, JobMatchResponse, PaginatedResponse } from "@/types";

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<JobMatchResponse | null>(null);

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

  useEffect(() => {
    async function loadCandidates() {
      try {
        const data = await apiRequest<PaginatedResponse<Candidate>>("/candidates", {
          params: { page_size: 100 },
        });
        setCandidates(data.items);
      } catch {
        // Scoring will surface an error if there are no candidates to work with.
      }
    }
    loadCandidates();
  }, []);

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

  const filteredCandidates = candidates.filter((candidate) => {
    const term = candidateSearch.trim().toLowerCase();
    if (!term) return true;
    return (
      candidate.full_name.toLowerCase().includes(term) || candidate.email.toLowerCase().includes(term)
    );
  });

  function toggleCandidate(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filteredCandidates.map((candidate) => candidate.id)));
  }

  async function runMatches() {
    setMatching(true);
    setMatchError(null);
    try {
      const body = selected.size > 0 ? { candidate_ids: Array.from(selected), limit: 10 } : { limit: 10 };
      const result = await apiRequest<JobMatchResponse>(`/jobs/${params.id}/matches`, { method: "POST", body });
      setMatchResult(result);
    } catch (err) {
      setMatchError(err instanceof ApiError ? err.message : "Failed to score candidates.");
    } finally {
      setMatching(false);
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
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-700">Top 10 Matches</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Select candidates to score against this job, then find the best 10. Uses your configured AI
                  provider, or local TF-IDF matching when no AI key is set.
                </p>
              </div>
              <button className="btn-primary shrink-0" disabled={matching} onClick={runMatches}>
                {matching ? "Scoring..." : "Score & Find Top Matches"}
              </button>
            </div>

            {matchError && (
              <div className="mt-4">
                <ErrorState message={matchError} />
              </div>
            )}

            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  className="input max-w-xs"
                  placeholder="Filter candidates by name or email..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                />
                <button className="btn-secondary" onClick={selectAll} disabled={filteredCandidates.length === 0}>
                  Select all
                </button>
                <button className="btn-secondary" onClick={() => setSelected(new Set())} disabled={selected.size === 0}>
                  Clear
                </button>
                <span className="text-xs text-slate-500">
                  {selected.size === 0
                    ? "No candidates selected — all candidates will be scored."
                    : `${selected.size} candidate(s) selected.`}
                </span>
              </div>

              <div className="mt-3 max-h-64 overflow-y-auto rounded-md border border-slate-200">
                {filteredCandidates.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-slate-500">No candidates available.</p>
                ) : (
                  filteredCandidates.map((candidate) => (
                    <label
                      key={candidate.id}
                      className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-0 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(candidate.id)}
                        onChange={() => toggleCandidate(candidate.id)}
                      />
                      <span className="font-medium text-slate-900">{candidate.full_name}</span>
                      <span className="text-slate-500">{candidate.email}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {matchResult && (
              <div className="mt-5">
                <p className="text-xs text-slate-500">
                  Scored {matchResult.total_scored} candidate(s) using{" "}
                  <span className="font-medium text-slate-700">
                    {matchResult.engine === "ai" ? "AI scoring" : "local TF-IDF scoring"}
                  </span>
                  .
                </p>

                {matchResult.items.length === 0 ? (
                  <div className="mt-3">
                    <EmptyState title="No matches" description="No candidates were available to score." />
                  </div>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Candidate</th>
                          <th className="px-3 py-2">Score</th>
                          <th className="px-3 py-2">Matched</th>
                          <th className="px-3 py-2">Missing</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchResult.items.map((item, index) => (
                          <tr key={item.candidate_id} className="border-b border-slate-100 last:border-0 align-top">
                            <td className="px-3 py-3 text-slate-500">{index + 1}</td>
                            <td className="px-3 py-3">
                              <div className="font-medium text-slate-900">{item.full_name}</div>
                              <div className="text-xs text-slate-500">{item.email}</div>
                              <div className="mt-1 text-xs text-slate-500">{item.explanation}</div>
                            </td>
                            <td className="px-3 py-3">
                              <span className="badge bg-slate-100 text-slate-800">{item.match_score}%</span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex max-w-[180px] flex-wrap gap-1">
                                {item.matched_skills.length === 0 ? (
                                  <span className="text-xs text-slate-400">None</span>
                                ) : (
                                  item.matched_skills.map((skill) => (
                                    <span key={skill} className="badge bg-green-100 text-green-700">
                                      {skill}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex max-w-[180px] flex-wrap gap-1">
                                {item.missing_skills.length === 0 ? (
                                  <span className="text-xs text-slate-400">None</span>
                                ) : (
                                  item.missing_skills.map((skill) => (
                                    <span key={skill} className="badge bg-red-100 text-red-700">
                                      {skill}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <Link
                                href={`/candidates/${item.candidate_id}`}
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
              </div>
            )}
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
