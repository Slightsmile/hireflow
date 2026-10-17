"use client";

import { useState } from "react";
import type { EmploymentType, Job, JobStatus } from "@/types";

export interface JobFormValues {
  title: string;
  department: string;
  description: string;
  required_skills: string;
  preferred_skills: string;
  experience_level: string;
  employment_type: EmploymentType;
  location: string;
  status: JobStatus;
}

export default function JobForm({
  initial,
  onSubmit,
  submitLabel = "Save",
}: {
  initial?: Partial<Job>;
  onSubmit: (values: JobFormValues) => Promise<void>;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<JobFormValues>({
    title: initial?.title || "",
    department: initial?.department || "",
    description: initial?.description || "",
    required_skills: initial?.required_skills || "",
    preferred_skills: initial?.preferred_skills || "",
    experience_level: initial?.experience_level || "",
    employment_type: initial?.employment_type || "full_time",
    location: initial?.location || "",
    status: initial?.status || "draft",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.title.trim()) {
      setError("Job title is required.");
      return;
    }
    if (!values.description.trim()) {
      setError("Job description is required.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save job.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Job Title</label>
          <input className="input" value={values.title} onChange={(e) => update("title", e.target.value)} />
        </div>
        <div>
          <label className="label">Department</label>
          <input className="input" value={values.department} onChange={(e) => update("department", e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">Description</label>
        <textarea className="input min-h-[120px]" value={values.description} onChange={(e) => update("description", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Required Skills (comma-separated)</label>
          <input className="input" value={values.required_skills} onChange={(e) => update("required_skills", e.target.value)} />
        </div>
        <div>
          <label className="label">Preferred Skills (comma-separated)</label>
          <input className="input" value={values.preferred_skills} onChange={(e) => update("preferred_skills", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Experience Level</label>
          <input className="input" value={values.experience_level} onChange={(e) => update("experience_level", e.target.value)} />
        </div>
        <div>
          <label className="label">Employment Type</label>
          <select className="input" value={values.employment_type} onChange={(e) => update("employment_type", e.target.value as EmploymentType)}>
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
        </div>
        <div>
          <label className="label">Location</label>
          <input className="input" value={values.location} onChange={(e) => update("location", e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">Status</label>
        <select className="input" value={values.status} onChange={(e) => update("status", e.target.value as JobStatus)}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
