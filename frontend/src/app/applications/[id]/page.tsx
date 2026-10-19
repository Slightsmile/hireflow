"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LoadingState, ErrorState } from "@/components/States";
import StatusBadge from "@/components/StatusBadge";
import { apiRequest, ApiError } from "@/lib/api";
import type { ApplicationDetail, ApplicationStatus, MatchResult } from "@/types";

const STATUS_OPTIONS: ApplicationStatus[] = ["applied", "shortlisted", "interview", "hired", "rejected"];
const TERMINAL_STATUSES: ApplicationStatus[] = ["hired", "rejected"];

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<ApplicationDetail>(`/applications/${params.id}`);
      setApplication(data);
      setNotes(data.recruiter_notes || "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load application.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(status: ApplicationStatus) {
    setActionError(null);
    try {
      const updated = await apiRequest<ApplicationDetail>(`/applications/${params.id}/status`, {
        method: "PATCH",
        body: { status },
      });
      setApplication((prev) => (prev ? { ...prev, status: updated.status, updated_at: updated.updated_at } : prev));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to update status.");
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    setActionError(null);
    try {
      await apiRequest(`/applications/${params.id}`, { method: "PATCH", body: { recruiter_notes: notes } });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to save notes.");
    } finally {
      setSavingNotes(false);
    }
  }

  async function runMatch() {
    setMatching(true);
    setMatchError(null);
    try {
      const result = await apiRequest<MatchResult>(`/applications/${params.id}/match`, { method: "POST" });
      setMatchResult(result);
    } catch (err) {
      setMatchError(err instanceof ApiError ? err.message : "Failed to run match analysis.");
    } finally {
      setMatching(false);
    }
  }

  const isTerminal = application ? TERMINAL_STATUSES.includes(application.status) : false;

  return (
    <ProtectedRoute>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && application && (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{application.candidate.full_name}</h1>
              <p className="mt-1 text-sm text-slate-500">
                Applied to{" "}
                <Link href={`/jobs/${application.job.id}`} className="font-medium text-accent-500 hover:underline">
                  {application.job.title}
                </Link>
              </p>
            </div>
            <StatusBadge status={application.status} />
          </div>

          {actionError && (
            <div className="mt-4">
              <ErrorState message={actionError} />
            </div>
          )}

          <div className="mt-6 card">
            <h2 className="text-sm font-semibold text-slate-700">Status</h2>
            <p className="mt-1 text-xs text-slate-500">
              {isTerminal
                ? "This application has reached a terminal status and cannot be changed further."
                : "Update the application status as it moves through the pipeline."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  className="btn-secondary"
                  disabled={isTerminal || status === application.status}
                  onClick={() => updateStatus(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-sm font-semibold text-slate-700">Candidate</h2>
              <p className="mt-2 text-sm text-slate-600">{application.candidate.email}</p>
              <p className="text-sm text-slate-600">{application.candidate.phone || "No phone on file"}</p>
              <Link href={`/candidates/${application.candidate.id}`} className="mt-3 inline-block text-sm font-medium text-accent-500 hover:underline">
                View full profile
              </Link>
            </div>

            <div className="card">
              <h2 className="text-sm font-semibold text-slate-700">Job Requirements</h2>
              <p className="mt-2 text-sm text-slate-600">{application.job.required_skills || "None specified"}</p>
            </div>
          </div>

          <div className="mt-6 card">
            <h2 className="text-sm font-semibold text-slate-700">Recruiter Notes</h2>
            <textarea className="input mt-2 min-h-[100px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="mt-3 flex justify-end">
              <button className="btn-secondary" disabled={savingNotes} onClick={saveNotes}>
                {savingNotes ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </div>

          <div className="mt-6 card">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">AI CV Match Analysis</h2>
              <button className="btn-primary" disabled={matching} onClick={runMatch}>
                {matching ? "Analyzing..." : "Run Match Analysis"}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              This score is decision support only &mdash; it does not determine the outcome of the application.
            </p>

            {matchError && (
              <div className="mt-4">
                <ErrorState message={matchError} />
              </div>
            )}

            {!matchResult && application.match_score !== null && (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Last saved score: <span className="font-semibold text-slate-900">{application.match_score}%</span>.{" "}
                {application.match_explanation}
              </div>
            )}

            {matchResult && (
              <div className="mt-4 space-y-4">
                {matchResult.warning && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    {matchResult.warning}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="text-3xl font-semibold text-slate-900">{matchResult.match_score}%</div>
                  <div>
                    <span className="badge bg-slate-100 text-slate-700">
                      {matchResult.engine === "ai" ? "AI scoring" : "Local TF-IDF"}
                    </span>
                    <p className="mt-1 text-sm text-slate-600">{matchResult.explanation}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-500">Matched Skills</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {matchResult.matched_skills.length === 0 ? (
                        <span className="text-sm text-slate-500">None found</span>
                      ) : (
                        matchResult.matched_skills.map((skill) => (
                          <span key={skill} className="badge bg-green-100 text-green-700">
                            {skill}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-500">Missing Skills</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {matchResult.missing_skills.length === 0 ? (
                        <span className="text-sm text-slate-500">None</span>
                      ) : (
                        matchResult.missing_skills.map((skill) => (
                          <span key={skill} className="badge bg-red-100 text-red-700">
                            {skill}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </ProtectedRoute>
  );
}
