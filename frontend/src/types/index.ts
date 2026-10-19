export type UserRole = "admin" | "recruiter";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export type JobStatus = "draft" | "published" | "closed" | "archived";
export type EmploymentType = "full_time" | "part_time" | "contract" | "internship";

export interface Job {
  id: string;
  title: string;
  department: string | null;
  description: string;
  required_skills: string;
  preferred_skills: string | null;
  experience_level: string | null;
  employment_type: EmploymentType;
  location: string | null;
  status: JobStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cv_text: string | null;
  cv_filename: string | null;
  cv_file_path: string | null;
  skills: string | null;
  experience_summary: string | null;
  created_at: string;
  updated_at: string;
}

export type ApplicationStatus = "applied" | "shortlisted" | "interview" | "hired" | "rejected";

export interface Application {
  id: string;
  candidate_id: string;
  job_id: string;
  status: ApplicationStatus;
  match_score: number | null;
  match_explanation: string | null;
  recruiter_notes: string | null;
  applied_at: string;
  updated_at: string;
}

export interface ApplicationDetail extends Application {
  candidate: Candidate;
  job: Job;
}

export interface MatchResult {
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  explanation: string;
  warning: string | null;
  is_saved: boolean;
  engine: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface DashboardStats {
  total_jobs: number;
  open_jobs: number;
  total_candidates: number;
  total_applications: number;
  applications_awaiting_review: number;
  status_counts: Record<string, number>;
}

export type AIProvider = "openai" | "anthropic" | "gemini";

export interface AISettings {
  provider: AIProvider;
  model: string | null;
  base_url: string | null;
  enabled: boolean;
  has_api_key: boolean;
  api_key_masked: string | null;
  updated_at: string | null;
}

export interface AISettingsUpdate {
  provider?: AIProvider;
  api_key?: string;
  model?: string;
  base_url?: string;
  clear_api_key?: boolean;
}

export interface AISettingsTestResult {
  ok: boolean;
  message: string;
}

export interface BatchUploadError {
  filename: string;
  error: string;
}

export interface CandidateBatchResult {
  created: Candidate[];
  errors: BatchUploadError[];
}

export interface JobBatchRowError {
  row: number;
  error: string;
}

export interface JobBatchResult {
  created: Job[];
  errors: JobBatchRowError[];
}

export interface JobMatchItem {
  candidate_id: string;
  full_name: string;
  email: string;
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  explanation: string;
  warning: string | null;
  engine: string;
}

export interface JobMatchResponse {
  engine: string;
  items: JobMatchItem[];
  total_scored: number;
}
