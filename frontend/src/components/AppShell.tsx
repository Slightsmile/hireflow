"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/candidates", label: "Candidates" },
  { href: "/applications", label: "Applications" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems =
    user?.role === "admin"
      ? [...NAV_ITEMS, { href: "/users", label: "Users" }, { href: "/settings", label: "Settings" }]
      : NAV_ITEMS;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col bg-navy-900 text-slate-100">
        <div className="px-6 py-5 text-xl font-semibold tracking-tight">HireFlow</div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-navy-700 text-white" : "text-slate-300 hover:bg-navy-800 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-navy-800 px-4 py-4">
          <p className="truncate text-sm font-medium text-white">{user?.name}</p>
          <p className="truncate text-xs text-slate-400">{user?.email}</p>
          <button onClick={logout} className="mt-3 w-full rounded-md bg-navy-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-navy-700">
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
