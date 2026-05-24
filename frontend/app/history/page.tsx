"use client";

import { useEffect, useState } from "react";
import { fetchGlobalHistory } from "@/lib/api";
import TrendTimeline from "@/components/TrendTimeline";
import ProtectedRoute from "@/components/ProtectedRoute";
import { SOURCE_LABELS, type GlobalHistorySnapshot } from "@/lib/types";
import { History, Loader2 } from "lucide-react";

export default function HistoryPage() {
  const [snapshots, setSnapshots] = useState<GlobalHistorySnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalHistory()
      .then((data) => setSnapshots(data.snapshots))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const timeRange =
    snapshots.length >= 2
      ? `${new Date(snapshots[0].timestamp).toLocaleTimeString()} → ${new Date(
          snapshots[snapshots.length - 1].timestamp
        ).toLocaleTimeString()}`
      : null;

  const allSources = Array.from(
    new Set(
      snapshots.flatMap((s) => s.trends.flatMap((t) => (t as any).sources || []))
    )
  );
  const sourcesLabel = allSources.length > 0
    ? allSources
        .map((s) => SOURCE_LABELS[s.toLowerCase()] || s)
        .join(" + ")
    : "Social Communities + Tech Community";

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-background transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-accent/10 border border-accent/20 p-2 rounded">
              <History size={16} className="text-accent" />
            </div>
            <h1 className="text-xl font-bold text-text-primary">Trend History</h1>
          </div>
          <p className="text-text-secondary text-xs">
            How the top trends have evolved over the last{" "}
            {snapshots.length} poll cycles.
            {timeRange && <span className="text-text-secondary"> ({timeRange})</span>}
          </p>
        </div>

        {/* Chart */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              Top Trends — Score Over Time
            </h2>
            <span className="text-[10px] text-text-secondary">
              Polled every 60s · {sourcesLabel}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 text-text-secondary py-16">
              <Loader2 size={16} className="animate-spin text-accent" />
              <span className="text-xs">Loading history…</span>
            </div>
          ) : (
            <TrendTimeline snapshots={snapshots} sourcesLabel={sourcesLabel} />
          )}
        </div>

        {/* Stats row */}
        {!loading && snapshots.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Poll Cycles", value: snapshots.length },
              {
                label: "Unique Trends Tracked",
                value: new Set(
                  snapshots.flatMap((s) => s.trends.map((t) => t.cluster_id))
                ).size,
              },
              {
                label: "Cross-Platform Events",
                value: snapshots
                  .flatMap((s) => s.trends)
                  .filter((t) => t.is_cross_platform).length,
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-surface border border-border rounded-lg p-4 text-center"
              >
                <div className="text-xl font-bold text-text-primary">{value}</div>
                <div className="text-[10px] text-text-secondary mt-1 uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      </main>
    </ProtectedRoute>
  );
}
