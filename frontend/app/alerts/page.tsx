"use client";

import { useEffect, useState } from "react";
import { fetchAlerts } from "@/lib/api";
import { AlertForm, AlertList } from "@/components/AlertForm";
import ProtectedRoute from "@/components/ProtectedRoute";
import type { Alert } from "@/lib/types";
import { Bell, Loader2 } from "lucide-react";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts()
      .then((data) => setAlerts(data.alerts))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleCreated(alert: Alert) {
    setAlerts((prev) => [alert, ...prev]);
  }

  function handleDeleted(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-background transition-colors duration-200">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-accent/10 border border-accent/20 p-2 rounded">
              <Bell size={16} className="text-accent" />
            </div>
            <h1 className="text-xl font-bold text-text-primary">Keyword Alerts</h1>
          </div>
          <p className="text-text-secondary text-xs">
            Get emailed the moment a keyword you care about starts trending.
            Notifications fire at most once every 6 hours per keyword.
          </p>
        </div>

        {/* Create form */}
        <AlertForm onCreated={handleCreated} />

        {/* List */}
        <div>
          <h2 className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">
            Your Alerts {!loading && `(${alerts.length})`}
          </h2>
          {loading ? (
            <div className="flex items-center gap-2 text-text-secondary text-xs">
              <Loader2 size={14} className="animate-spin text-accent" />
              Loading alerts…
            </div>
          ) : (
            <AlertList alerts={alerts} onDelete={handleDeleted} />
          )}
        </div>
      </div>
      </main>
    </ProtectedRoute>
  );
}
