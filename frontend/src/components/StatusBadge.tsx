const COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  published: "bg-green-100 text-green-700",
  closed: "bg-red-100 text-red-700",
  archived: "bg-slate-200 text-slate-600",
  applied: "bg-blue-100 text-blue-700",
  shortlisted: "bg-amber-100 text-amber-700",
  interview: "bg-purple-100 text-purple-700",
  hired: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function StatusBadge({ status }: { status: string }) {
  const color = COLORS[status] || "bg-slate-100 text-slate-700";
  return <span className={`badge ${color}`}>{status.replace("_", " ")}</span>;
}
