"use client";

import { useCallback, useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LoadingState, ErrorState } from "@/components/States";
import { apiRequest, ApiError } from "@/lib/api";
import type { AIProvider, AISettings, AISettingsTestResult } from "@/types";

const PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: "openai", label: "OpenAI-compatible (OpenAI, Azure, OpenRouter, Ollama)" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "gemini", label: "Google Gemini" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<AISettingsTestResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<AISettings>("/settings/ai");
      setSettings(data);
      setProvider(data.provider);
      setModel(data.model || "");
      setBaseUrl(data.base_url || "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    setTestResult(null);
    try {
      const data = await apiRequest<AISettings>("/settings/ai", {
        method: "PUT",
        body: {
          provider,
          model,
          base_url: baseUrl,
          ...(apiKey ? { api_key: apiKey } : {}),
        },
      });
      setSettings(data);
      setApiKey("");
      setProvider(data.provider);
      setMessage("Settings saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearKey() {
    setSaving(true);
    setError(null);
    setMessage(null);
    setTestResult(null);
    try {
      const data = await apiRequest<AISettings>("/settings/ai", {
        method: "PUT",
        body: { clear_api_key: true },
      });
      setSettings(data);
      setApiKey("");
      setMessage("API key removed.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove the API key.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setError(null);
    setTestResult(null);
    try {
      const result = await apiRequest<AISettingsTestResult>("/settings/ai/test", { method: "POST" });
      setTestResult(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to test the connection.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <ProtectedRoute adminOnly>
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Configure the AI provider used for CV matching. Admins only.
      </p>

      {loading && <LoadingState />}

      {!loading && (
        <div className="mt-6 card max-w-3xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">AI Matching Provider</h2>
            <span
              className={`badge ${
                settings?.has_api_key ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              {settings?.has_api_key ? "Active" : "Not configured"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            When a key is saved, CV matching and Top Matches use this provider. Without a key, matching falls back to
            local TF-IDF scoring.
          </p>

          {error && (
            <div className="mt-4">
              <ErrorState message={error} />
            </div>
          )}
          {message && (
            <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {message}
            </div>
          )}

          <form onSubmit={handleSave} className="mt-5 space-y-4">
            <div>
              <label className="label">Provider</label>
              <select
                className="input"
                value={provider}
                onChange={(e) => setProvider(e.target.value as AIProvider)}
              >
                {PROVIDERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">API Key</label>
              <input
                type="password"
                className="input"
                autoComplete="off"
                placeholder={
                  settings?.has_api_key
                    ? `Saved: ${settings.api_key_masked} — leave blank to keep the current key`
                    : "Paste your provider API key"
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-400">
                Stored on the server and never returned to the browser. Leave blank to keep the saved key.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Model (optional)</label>
                <input
                  className="input"
                  placeholder="e.g. gpt-4o-mini, claude-3-5-sonnet-latest"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Base URL (optional)</label>
                <input
                  className="input"
                  placeholder="e.g. https://api.openai.com/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save Settings"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={testing || !settings?.has_api_key}
                  onClick={handleTest}
                >
                  {testing ? "Testing..." : "Test Connection"}
                </button>
              </div>
              {settings?.has_api_key && (
                <button type="button" className="btn-danger" disabled={saving} onClick={handleClearKey}>
                  Remove Key
                </button>
              )}
            </div>
          </form>

          {testResult && (
            <div
              className={`mt-4 rounded-md border px-3 py-2 text-sm ${
                testResult.ok
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {testResult.message}
            </div>
          )}
        </div>
      )}
    </ProtectedRoute>
  );
}
