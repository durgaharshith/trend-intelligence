"use client";

import { useState } from "react";
import { createAlert, deleteAlert } from "@/lib/api";
import type { Alert } from "@/lib/types";
import { Bell, Trash2, Plus, Loader2, CheckCircle } from "lucide-react";

interface AlertFormProps {
  onCreated: (alert: Alert) => void;
}

export function AlertForm({ onCreated }: AlertFormProps) {
  const [keyword, setKeyword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim() || !email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await createAlert(keyword.trim(), email.trim());
      onCreated(res.alert);
      setKeyword("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to create alert. Check your inputs and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-lg p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Bell size={14} className="text-accent" />
        <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Create Keyword Alert</h3>
      </div>
      <p className="text-text-secondary text-xs">Get emailed when a keyword you care about starts trending.</p>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-text-secondary mb-1 block uppercase tracking-wider">Keyword</label>
          <input
            type="text"
            placeholder="e.g. OpenAI, climate, bitcoin"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            required
            className="w-full bg-surface border border-border rounded px-3 py-1.5 text-xs text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div>
          <label className="text-[10px] text-text-secondary mb-1 block uppercase tracking-wider">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-surface border border-border rounded px-3 py-1.5 text-xs text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading || !keyword.trim() || !email.trim()}
        className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white px-4 py-2 rounded text-xs font-semibold transition-all duration-200"
      >
        {loading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : success ? (
          <CheckCircle size={12} />
        ) : (
          <Plus size={12} />
        )}
        {success ? "Alert created!" : "Create Alert"}
      </button>
    </form>
  );
}

interface AlertListProps {
  alerts: Alert[];
  onDelete: (id: string) => void;
}

export function AlertList({ alerts, onDelete }: AlertListProps) {
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deleteAlert(id);
      onDelete(id);
    } catch {
      /* ignore */
    } finally {
      setDeleting(null);
    }
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <Bell size={28} className="mx-auto mb-3 opacity-30 text-text-secondary" />
        <p className="text-xs">No alerts yet. Create one above to get notified when keywords trend.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="flex items-center justify-between bg-surface border border-border rounded p-4"
        >
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${alert.active ? "bg-emerald-500 animate-pulse" : "bg-text-secondary"}`} />
            <div>
              <div className="text-xs font-semibold text-text-primary">
                "{alert.keyword}"
              </div>
              <div className="text-[10px] text-text-secondary">
                {alert.email} · Created {new Date(alert.created_at).toLocaleDateString()}
                {alert.last_triggered && ` · Last fired ${new Date(alert.last_triggered).toLocaleDateString()}`}
              </div>
            </div>
          </div>
          <button
            onClick={() => handleDelete(alert.id)}
            disabled={deleting === alert.id}
            className="text-text-secondary hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
          >
            {deleting === alert.id ? (
              <Loader2 size={12} className="animate-spin text-red-500" />
            ) : (
              <Trash2 size={12} />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
