"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LoadingState, EmptyState, ErrorState } from "@/components/States";
import { apiRequest, ApiError } from "@/lib/api";
import type { User } from "@/types";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiRequest<User[]>("/users");
        setUsers(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load users.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <ProtectedRoute adminOnly>
      <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
      <p className="mt-1 text-sm text-slate-500">All registered accounts in HireFlow.</p>

      <div className="mt-6">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {!loading && !error && users.length === 0 && <EmptyState title="No users found" />}

        {!loading && !error && users.length > 0 && (
          <div className="card overflow-x-auto !p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="badge bg-slate-100 text-slate-700">{user.role}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(user.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
