"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import {
  Activity, Database, Clock, Zap, Bell,
  Lightbulb, TrendingUp, Globe, CheckCircle2, XCircle, Loader2, AlertTriangle
} from "lucide-react";

interface StatusData {
  status: string;
  version: string;
  timestamp: string;
  environment: string;
  redis: { connected: boolean; mode: string };
  scheduler: { mode: string; last_poll: string | null; last_forecast: string | null; polls_today: number };
  trends: { count: number; cross_platform: number };
  activity: {
    groq_calls_today: number;
    alerts_fired_today: number;
    content_ideas_today: number;
    hn_stories_fetched: number;
    github_repos_fetched: number;
    google_trends_fetched: number;
    newsapi_articles_fetched: number;
  };
  features: Record<string, boolean>;
}

function StatCard({ label, value, sub, icon: Icon, ok }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; ok?: boolean;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-text-secondary uppercase tracking-wider">{label}</span>
        <Icon size={12} className="text-text-secondary" />
      </div>
      <div className="flex items-end gap-2">
        <span className="text-xl font-bold text-text-primary">{value}</span>
        {ok !== undefined && (
          ok
            ? <CheckCircle2 size={14} className="text-emerald-500 mb-0.5" />
            : <XCircle size={14} className="text-red-500 mb-0.5" />
        )}
      </div>
      {sub && <p className="text-[10px] text-text-secondary mt-1">{sub}</p>}
    </div>
  );
}

function FeaturePill({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded border text-[10px] font-semibold ${
      enabled
        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30 text-emerald-500 dark:text-emerald-400"
        : "bg-surface-elevated border-border text-text-secondary"
    }`}>
      {enabled ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
      {label}
    </span>
  );
}

export default function StatusPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (!authLoading && user && user.role !== "admin") {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/api/status/");
      setData(res.data);
      setLastRefresh(new Date());
    } catch { setData(null); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, []);

  const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString() : "—";

  if (authLoading || (user && user.role !== "admin")) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-accent" size={28} />
        <span className="text-xs text-text-secondary">Redirecting...</span>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-background text-text-primary transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-accent/10 border border-accent/20 p-2 rounded">
                <Activity size={16} className="text-accent" />
              </div>
              <h1 className="text-xl font-bold text-text-primary">System Status</h1>
              {data && (
                <span className="text-[10px] px-2 py-0.5 bg-accent/5 border border-accent/10 text-accent rounded font-medium">
                  v{data.version}
                </span>
              )}
            </div>
            <p className="text-text-secondary text-xs">Live API health, activity counters, and feature flags.</p>
          </div>
          <button onClick={load} className="text-text-secondary hover:text-text-primary transition-colors" title="Refresh">
            <Loader2 size={14} className={loading ? "animate-spin text-accent" : ""} />
          </button>
        </div>

        {!data && !loading && (
          <div className="text-center py-16 text-text-secondary text-xs">
            Could not reach the backend — is it running?
          </div>
        )}

        {data && (
          <>
            {/* Health row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Backend" value="Online" icon={Activity} ok={true} sub={data.environment} />
              <StatCard label="Redis" value={data.redis.mode} icon={Database} ok={data.redis.connected} sub={data.redis.connected ? "Connected" : "Using fallback"} />
              <StatCard label="Scheduler" value={data.scheduler.mode === "qstash" ? "QStash" : "APScheduler"} icon={Clock} sub={`${data.scheduler.polls_today} polls today`} />
              <StatCard label="Trends" value={data.trends.count} icon={TrendingUp} sub={`${data.trends.cross_platform} cross-platform`} />
            </div>

            {/* Activity row */}
            <div className="bg-surface border border-border rounded-lg p-6">
              <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-5">Today's Activity</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                {[
                  { label: "Groq Calls", value: data.activity.groq_calls_today, Icon: Zap },
                  { label: "Alerts Fired", value: data.activity.alerts_fired_today, Icon: Bell },
                  { label: "Content Ideas", value: data.activity.content_ideas_today, Icon: Lightbulb },
                  { label: "Community Stories", value: data.activity.hn_stories_fetched, Icon: Globe },
                  { label: "Open Source Repos", value: data.activity.github_repos_fetched, Icon: Activity },
                  { label: "Search Volumes", value: data.activity.google_trends_fetched, Icon: TrendingUp },
                  { label: "Tech News Articles", value: data.activity.newsapi_articles_fetched, Icon: Globe },
                ].map(({ label, value, Icon }) => (
                  <div key={label} className="text-center space-y-1">
                    <Icon size={14} className="text-text-secondary mx-auto mb-1" />
                    <div className="text-lg font-bold text-text-primary">{value}</div>
                    <div className="text-[10px] text-text-secondary leading-tight uppercase tracking-wider">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scheduler times */}
            <div className="bg-surface border border-border rounded-lg p-6">
              <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Scheduler</h2>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-[10px] text-text-secondary mb-1 uppercase tracking-wider">Last poll</div>
                  <div className="text-text-primary font-semibold">{fmtTime(data.scheduler.last_poll)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-text-secondary mb-1 uppercase tracking-wider">Last forecast</div>
                  <div className="text-text-primary font-semibold">{fmtTime(data.scheduler.last_forecast)}</div>
                </div>
              </div>
              {data.scheduler.mode === "apscheduler" && (
                <p className="text-[11px] text-amber-500 mt-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded p-3 flex items-center gap-2">
                  <AlertTriangle size={12} className="shrink-0" /> Using APScheduler — jobs stop when Render sleeps. Set up QStash for reliability.
                </p>
              )}
            </div>

            {/* Feature flags */}
            <div className="bg-surface border border-border rounded-lg p-6">
              <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Feature Flags</h2>
              <div className="flex flex-wrap gap-2">
                <FeaturePill label="Groq AI" enabled={data.features.groq_ai} />
                <FeaturePill label="Email Alerts (Resend)" enabled={data.features.email_alerts} />
                <FeaturePill label="QStash Scheduler" enabled={data.features.qstash_scheduler} />
                <FeaturePill label="Search Trends" enabled={data.features.google_trends} />
              </div>
            </div>

            <p className="text-center text-[10px] text-text-secondary font-medium">
              Last refreshed: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 30s
            </p>
          </>
        )}
      </div>
      </main>
    </ProtectedRoute>
  );
}
