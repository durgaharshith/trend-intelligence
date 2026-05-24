"use client";

import { useEffect, useState } from "react";
import TrendDashboard from "@/components/TrendDashboard";
import ColdStartBanner from "@/components/ColdStartBanner";
import { useTrendSocket } from "@/lib/useTrendSocket";
import { fetchTrends, fetchGeoConfig } from "@/lib/api";
import type { Trend } from "@/lib/types";
import { AlertTriangle } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardPage() {
  const [initialTrends, setInitialTrends] = useState<Trend[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geo, setGeo] = useState<string>("US");

  useEffect(() => {
    fetchGeoConfig()
      .then((data) => {
        setGeo(data.geo);
        return fetchTrends({ limit: 30, geo: data.geo });
      })
      .then((data) => {
        if (data) setInitialTrends(data.trends);
      })
      .catch(() => setError("Could not reach the backend."))
      .finally(() => setInitialLoading(false));
  }, []);

  const { trends, status, lastUpdated } = useTrendSocket(initialTrends);
  const displayTrends = trends.length > 0 ? trends : initialTrends;
  const loading = initialLoading && displayTrends.length === 0;

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-background text-text-primary transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {error && !displayTrends.length && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle size={16} /> {error}
            </div>
          )}
          <TrendDashboard
            trends={displayTrends}
            loading={loading}
            wsStatus={status}
            lastUpdated={lastUpdated}
            geo={geo}
          />
        </div>
        {/* Tier 4 — cold start UX for Render free tier */}
        <ColdStartBanner isBackendDown={!!error} />
      </main>
    </ProtectedRoute>
  );
}
