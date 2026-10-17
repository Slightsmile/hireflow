"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import JobForm, { JobFormValues } from "@/components/JobForm";
import { LoadingState, ErrorState } from "@/components/States";
import { apiRequest, ApiError } from "@/lib/api";
import type { Job } from "@/types";

export default function EditJobPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSubmit(values: JobFormValues) {
    await apiRequest<Job>(`/jobs/${params.id}`, { method: "PATCH", body: values });
    router.push(`/jobs/${params.id}`);
  }

  return (
    <ProtectedRoute>
      <h1 className="text-2xl font-semibold text-slate-900">Edit Job</h1>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && job && (
        <div className="mt-6 card max-w-3xl">
          <JobForm initial={job} onSubmit={handleSubmit} submitLabel="Save Changes" />
        </div>
      )}
    </ProtectedRoute>
  );
}
