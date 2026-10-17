"use client";

import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import JobForm, { JobFormValues } from "@/components/JobForm";
import { apiRequest } from "@/lib/api";
import type { Job } from "@/types";

export default function NewJobPage() {
  const router = useRouter();

  async function handleSubmit(values: JobFormValues) {
    const job = await apiRequest<Job>("/jobs", { method: "POST", body: values });
    router.push(`/jobs/${job.id}`);
  }

  return (
    <ProtectedRoute>
      <h1 className="text-2xl font-semibold text-slate-900">New Job</h1>
      <p className="mt-1 text-sm text-slate-500">Create a new job opening.</p>
      <div className="mt-6 card max-w-3xl">
        <JobForm onSubmit={handleSubmit} submitLabel="Create Job" />
      </div>
    </ProtectedRoute>
  );
}
