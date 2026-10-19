"use client";

import { useState } from "react";
import type { Candidate } from "@/types";

export interface CandidateFormValues {
  full_name: string;
  email: string;
  phone: string;
  cv_text: string;
  skills: string;
  experience_summary: string;
  cv_file: File | null;
}

export default function CandidateForm({
  initial,
  onSubmit,
  submitLabel = "Save",
}: {
  initial?: Partial<Candidate>;
  onSubmit: (values: CandidateFormValues) => Promise<void>;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<CandidateFormValues>({
    full_name: initial?.full_name || "",
    email: initial?.email || "",
    phone: initial?.phone || "",
    cv_text: initial?.cv_text || "",
    skills: initial?.skills || "",
    experience_summary: initial?.experience_summary || "",
    cv_file: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof CandidateFormValues>(key: K, value: CandidateFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.full_name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!isValidEmail(values.email)) {
      setError("A valid email address is required.");
      return;
    }
    if (values.cv_file && !values.cv_file.name.toLowerCase().endsWith(".pdf")) {
      setError("The CV file must be a PDF.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save candidate.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Full Name</label>
          <input className="input" value={values.full_name} onChange={(e) => update("full_name", e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={values.email} onChange={(e) => update("email", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Phone</label>
          <input className="input" value={values.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>
        <div>
          <label className="label">Skills (comma-separated)</label>
          <input className="input" value={values.skills} onChange={(e) => update("skills", e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">Experience Summary</label>
        <input className="input" value={values.experience_summary} onChange={(e) => update("experience_summary", e.target.value)} />
      </div>

      <div>
        <label className="label">CV File (PDF)</label>
        <input
          type="file"
          accept="application/pdf,.pdf"
          className="input"
          onChange={(e) => update("cv_file", e.target.files?.[0] || null)}
        />
        {initial?.cv_filename && !values.cv_file && (
          <p className="mt-1 text-xs text-slate-500">Current file: {initial.cv_filename}</p>
        )}
        {values.cv_file && <p className="mt-1 text-xs text-slate-500">Selected: {values.cv_file.name}</p>}
        <p className="mt-1 text-xs text-slate-400">
          Uploading a PDF extracts its text to use for AI matching and is stored for download.
        </p>
      </div>

      <div>
        <label className="label">CV Text</label>
        <textarea
          className="input min-h-[160px]"
          placeholder="Paste the candidate's CV content here..."
          value={values.cv_text}
          onChange={(e) => update("cv_text", e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
