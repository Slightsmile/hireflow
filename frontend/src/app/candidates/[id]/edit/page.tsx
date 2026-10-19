"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import CandidateForm, { CandidateFormValues } from "@/components/CandidateForm";
import { LoadingState, ErrorState } from "@/components/States";
import { apiRequest, apiUpload, ApiError } from "@/lib/api";
import type { Candidate } from "@/types";

export default function EditCandidatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<Candidate>(`/candidates/${params.id}`);
      setCandidate(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load candidate.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(values: CandidateFormValues) {
    const { cv_file, ...body } = values;
    await apiRequest<Candidate>(`/candidates/${params.id}`, { method: "PATCH", body });
    if (cv_file) {
      const formData = new FormData();
      formData.append("file", cv_file);
      await apiUpload<Candidate>(`/candidates/${params.id}/cv`, formData);
    }
    router.push(`/candidates/${params.id}`);
  }

  return (
    <ProtectedRoute>
      <h1 className="text-2xl font-semibold text-slate-900">Edit Candidate</h1>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && candidate && (
        <div className="mt-6 card max-w-3xl">
          <CandidateForm initial={candidate} onSubmit={handleSubmit} submitLabel="Save Changes" />
        </div>
      )}
    </ProtectedRoute>
  );
}
