"use client";

import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import CandidateForm, { CandidateFormValues } from "@/components/CandidateForm";
import { apiRequest } from "@/lib/api";
import type { Candidate } from "@/types";

export default function NewCandidatePage() {
  const router = useRouter();

  async function handleSubmit(values: CandidateFormValues) {
    const candidate = await apiRequest<Candidate>("/candidates", { method: "POST", body: values });
    router.push(`/candidates/${candidate.id}`);
  }

  return (
    <ProtectedRoute>
      <h1 className="text-2xl font-semibold text-slate-900">Add Candidate</h1>
      <p className="mt-1 text-sm text-slate-500">Create a new candidate profile.</p>
      <div className="mt-6 card max-w-3xl">
        <CandidateForm onSubmit={handleSubmit} submitLabel="Add Candidate" />
      </div>
    </ProtectedRoute>
  );
}
