"use client";

import { useState, useMemo } from "react";
import TrendCard from "./TrendCard";
import SparklineChart from "./SparklineChart";
import {
  Loader2, Wifi, WifiOff, AlertCircle, RefreshCw, Search, SlidersHorizontal,
  TrendingUp, Zap, Flame, Globe, Minus, TrendingDown, ChevronRight, Activity, Users
} from "lucide-react";
import { SOURCE_LABELS, type Trend, type TrendType } from "@/lib/types";
import { triggerManualFetch } from "@/lib/api";
import type { ElementType } from "react";

type FilterType = "all" | TrendType;
type SortKey = "trend_score" | "velocity" | "growth_rate" | "post_count";

const FILTER_OPTIONS: { value: FilterType; label: string; Icon?: ElementType }[] = [
  { value: "all",            label: "All" },
  { value: "rising",         label: "Rising",          Icon: TrendingUp },
  { value: "emerging",       label: "Emerging",        Icon: Zap },
  { value: "controversial",  label: "Controversial",   Icon: Flame },
  { value: "cross_community",label: "Cross-Community", Icon: Globe },
  { value: "stable",         label: "Stable",          Icon: Minus },
  { value: "declining",      label: "Declining",       Icon: TrendingDown },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "trend_score",  label: "Trend Score" },
  { value: "velocity",     label: "Velocity" },
  { value: "growth_rate",  label: "Growth Rate" },
  { value: "post_count",   label: "Post Count" },
];

const GEO_FLAGS: Record<string, string> = {
  US: "🇺🇸",
  IN: "🇮🇳",
  GB: "🇬🇧",
  DE: "🇩🇪",
  JP: "🇯🇵",
  BR: "🇧🇷",
  FR: "🇫🇷",
  CA: "🇨🇦",
  AU: "🇦🇺",
  KR: "🇰🇷",
};

const TREND_CONFIG: Record<
  TrendType,
  { label: string; color: string; bg: string; Icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  rising:          { label: "Rising",         color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30", Icon: TrendingUp },
  emerging:        { label: "Emerging",        color: "text-accent",                       bg: "bg-accent/5 border-accent/20",                                        Icon: Zap },
  controversial:   { label: "Controversial",   color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/30", Icon: Flame },
  cross_community: { label: "Cross-Community", color: "text-sky-500 dark:text-sky-400",    bg: "bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/30",        Icon: Users },
  declining:       { label: "Declining",       color: "text-red-500 dark:text-red-400",    bg: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30",        Icon: TrendingDown },
  stable:          { label: "Stable",          color: "text-text-secondary",               bg: "bg-surface-elevated border-border",                                   Icon: Minus },
};

interface ConnectionStatusBarProps {
  status: string;
  lastUpdated: Date | null;
  trendCount: number;
  geo?: string;
}

function ConnectionStatusBar({ status, lastUpdated, trendCount, geo = "US" }: ConnectionStatusBarProps) {
  const isLive = status === "connected";
  const isError = status === "error" || status === "disconnected";

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs">
      <div
        className={`flex items-center gap-1.5 ${
          isLive ? "text-emerald-500" : isError ? "text-red-500" : "text-yellow-500"
        }`}
      >
        {isLive ? (
          <Wifi size={12} />
        ) : isError ? (
          <WifiOff size={12} />
        ) : (
          <Loader2 size={12} className="animate-spin text-accent" />
        )}
        <span className="font-semibold">
          {isLive ? "Live" : isError ? "Reconnecting…" : "Connecting…"}
        </span>
      </div>
      {trendCount > 0 && <span className="text-text-secondary">{trendCount} trends detected</span>}
      {lastUpdated && (
        <span className="text-text-secondary">Updated {lastUpdated.toLocaleTimeString()}</span>
      )}
      {geo && (
        <span className="bg-surface-elevated border border-border text-text-primary px-2.5 py-0.5 rounded flex items-center gap-1 font-semibold text-[10px] uppercase tracking-wider">
          <span>{GEO_FLAGS[geo.toUpperCase()] || "🌐"}</span>
          <span>{geo.toUpperCase()} Region</span>
        </span>
      )}
    </div>
  );
}

const SOURCES_OPTIONS = [
  { value: "all", label: "All Sources" },
  { value: "hackernews", label: "Tech Community" },
  { value: "github", label: "Open Source Hub" },
  { value: "google-trends", label: "Search Interest" },
  { value: "newsapi", label: "Tech News" },
  { value: "devto", label: "Developer Blogs" },
];

interface TrendDashboardProps {
  trends: Trend[];
  loading: boolean;
  wsStatus?: string;
  lastUpdated?: Date | null;
  geo?: string;
}

export default function TrendDashboard({
  trends,
  loading,
  wsStatus = "connecting",
  lastUpdated = null,
  geo = "US",
}: TrendDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [activeSource, setActiveSource] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("trend_score");
  const [search, setSearch] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchMessage, setFetchMessage] = useState<string | null>(null);

  const handleManualFetch = async () => {
    setFetching(true);
    setFetchMessage(null);
    try {
      await triggerManualFetch();
      setFetchMessage("Refreshed!");
      setTimeout(() => setFetchMessage(null), 3000);
    } catch (err: any) {
      setFetchMessage("Failed to fetch.");
      setTimeout(() => setFetchMessage(null), 4000);
    } finally {
      setFetching(false);
    }
  };

  const filteredTrends = useMemo(() => {
    let result = activeFilter === "all"
      ? trends
      : trends.filter((t) => t.trend_type === activeFilter);

    if (activeSource !== "all") {
      result = result.filter((t) =>
        t.sources.some((s) => s.toLowerCase() === activeSource.toLowerCase())
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.posts.some((p) => p.title?.toLowerCase().includes(q) || p.subreddit?.toLowerCase().includes(q))
      );
    }

    return [...result].sort((a, b) => b[sortKey] - a[sortKey]);
  }, [trends, activeFilter, activeSource, search, sortKey]);

  const heroTrend = filteredTrends[0];
  const gridTrends = filteredTrends.slice(1);

  const totalVelocity = useMemo(() => {
    return trends.reduce((acc, t) => acc + (t.velocity || 0), 0);
  }, [trends]);

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    trends.forEach((t) => {
      t.sources.forEach((s) => {
        const name = s.toLowerCase();
        counts[name] = (counts[name] || 0) + 1;
      });
    });
    return counts;
  }, [trends]);

  const sentimentInsight = useMemo(() => {
    if (trends.length === 0) return "No sentiment data available.";
    const positiveCount = trends.filter((t) => t.sentiment_score > 0.2).length;
    const negativeCount = trends.filter((t) => (t.sentiment_score || 0) < -0.2).length;
    
    // Find the top sentiment trend
    const sortedBySentiment = [...trends].sort((a, b) => (b.sentiment_score || 0) - (a.sentiment_score || 0));
    const topPositive = sortedBySentiment[0];
    
    if (positiveCount > negativeCount) {
      return `Strong positive sentiment observed across developer networks, led by interest in "${topPositive?.title.split('·')[0].trim() || 'emerging tools'}".`;
    } else if (negativeCount > positiveCount) {
      return `Cautious or mixed sentiment detected in recent updates, with increased critical discussion in multiple clusters.`;
    } else {
      return `Balanced developer sentiment across active topics. Sentiment signals show steady adoption and feedback rates.`;
    }
  }, [trends]);

  const regionalInsight = useMemo(() => {
    if (trends.length === 0) return `No regional data gathered for ${geo} yet.`;
    
    // Find the highest velocity trend
    const highestVelocityTrend = [...trends].sort((a, b) => (b.velocity || 0) - (a.velocity || 0))[0];
    
    if (highestVelocityTrend) {
      return `Highest momentum in region ${geo} is currently centered around "${highestVelocityTrend.title.split('·')[0].trim()}" with a velocity of +${(highestVelocityTrend.velocity || 0).toFixed(2)}/min.`;
    }
    return `Search trends in region ${geo} show steady velocity in monitored categories.`;
  }, [trends, geo]);

  const systemInsight = useMemo(() => {
    const totalPosts = trends.reduce((acc, t) => acc + (t.posts?.length || 0), 0);
    const activeSourcesList = Object.keys(sourceCounts).map((k) => SOURCE_LABELS[k] || k).join(", ");
    
    if (trends.length === 0) {
      return "Crawl engines standby. Awaiting new polling ticks.";
    }
    return `Crawler engines online. Last poll parsed ${totalPosts} threads across active networks: ${activeSourcesList || "all sources"}.`;
  }, [trends, sourceCounts]);


  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-surface border border-border rounded p-5 transition-all duration-200">
        <div>
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Status</div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${wsStatus === "connected" ? "bg-emerald-500 animate-pulse" : "bg-yellow-500"}`} />
            <span className="text-xs font-semibold text-text-primary capitalize">{wsStatus === "connected" ? "Live Feed" : "Connecting..."}</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Active Sources</div>
          <div className="text-xs font-semibold text-text-primary">{Object.keys(sourceCounts).length || 4} verified</div>
        </div>
        <div>
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Total Trends</div>
          <div className="text-xs font-semibold text-text-primary">{trends.length} clusters</div>
        </div>
        <div>
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Total Velocity</div>
          <div className="text-xs font-semibold text-accent">+{totalVelocity.toFixed(1)}/min</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface border border-border rounded p-3 transition-all duration-200">
        <div className="flex flex-wrap items-center gap-1.5">
          {SOURCES_OPTIONS.map((src) => {
            const count = src.value === "all" ? trends.length : (sourceCounts[src.value] || 0);
            return (
              <button
                key={src.value}
                onClick={() => setActiveSource(src.value)}
                className={`px-3 py-1.5 text-xs rounded border transition-all duration-200 ${
                  activeSource === src.value
                    ? "bg-accent text-white border-accent font-semibold"
                    : "bg-surface-elevated border-border text-text-secondary hover:text-text-primary"
                }`}
              >
                {src.label}
                {count > 0 && <span className="ml-1.5 opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as FilterType)}
            className="bg-surface border border-border rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent cursor-pointer font-medium"
          >
            {FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <div className="relative flex-1 md:w-56">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Filter by keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface border border-border rounded pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent"
            />
          </div>

          <button
            onClick={handleManualFetch}
            disabled={fetching}
            title="Fetch new trends from APIs now"
            className="px-3 py-1.5 text-xs rounded border border-border bg-surface-elevated text-text-primary hover:text-accent hover:border-accent/40 font-semibold transition-all duration-200 flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
          >
            <RefreshCw size={12} className={fetching ? "animate-spin text-accent" : ""} />
            <span>{fetching ? "Fetching..." : fetchMessage || "Fetch New"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {loading && (
            <div className="bg-surface border border-border rounded flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-accent" size={24} />
              <span className="text-text-secondary text-xs">Analyzing clusters in real time...</span>
            </div>
          )}

          {!loading && filteredTrends.length === 0 && (
            <div className="bg-surface border border-border rounded text-center py-16">
              <AlertCircle size={20} className="text-text-secondary mx-auto mb-2" />
              <p className="text-text-secondary text-xs">No active trends matching current query.</p>
              <button
                onClick={() => { setActiveFilter("all"); setActiveSource("all"); setSearch(""); }}
                className="mt-3 text-xs text-accent hover:underline flex items-center gap-1 mx-auto"
              >
                Clear filters
              </button>
            </div>
          )}

          {heroTrend && !loading && (
            <div className="bg-surface border border-border rounded p-6 space-y-4 hover:border-accent/40 transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-accent/10 border border-accent/20 text-accent font-semibold px-2 py-0.5 rounded tracking-wide uppercase">Featured Signal</span>
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <span>Region: {GEO_FLAGS[geo.toUpperCase()] || "🌐"} {geo.toUpperCase()}</span>
                  {lastUpdated && <span>· Updated {lastUpdated.toLocaleTimeString()}</span>}
                </div>
              </div>

              <div className="space-y-1">
                <h2 className="text-base font-bold text-text-primary tracking-tight leading-snug">
                  {heroTrend.title}
                </h2>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Active across {heroTrend.sources.map((src) => SOURCE_LABELS[src.toLowerCase()] || src).join(", ")} with an average activity score of {heroTrend.avg_score?.toFixed(0) || 0}.
                </p>
              </div>

              <SparklineChart clusterId={heroTrend.cluster_id} variant="full" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="bg-surface-elevated border border-border/50 rounded p-3">
                  <div className="text-[9px] text-text-secondary uppercase mb-0.5 font-semibold tracking-wider">Trend Score</div>
                  <div className="text-base font-bold text-accent">{heroTrend.trend_score.toFixed(0)}</div>
                </div>
                <div className="bg-surface-elevated border border-border/50 rounded p-3">
                  <div className="text-[9px] text-text-secondary uppercase mb-0.5 font-semibold tracking-wider">Post Count</div>
                  <div className="text-base font-bold text-text-primary">{heroTrend.post_count}</div>
                </div>
                <div className="bg-surface-elevated border border-border/50 rounded p-3">
                  <div className="text-[9px] text-text-secondary uppercase mb-0.5 font-semibold tracking-wider">Velocity</div>
                  <div className="text-base font-bold text-emerald-500">+{heroTrend.velocity.toFixed(2)}/m</div>
                </div>
                <div className="bg-surface-elevated border border-border/50 rounded p-3">
                  <div className="text-[9px] text-text-secondary uppercase mb-0.5 font-semibold tracking-wider">Diversity</div>
                  <div className="text-base font-bold text-text-primary">{heroTrend.subreddit_diversity} Subs</div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <a
                  href={`/trends/${heroTrend.cluster_id}`}
                  className="bg-accent hover:bg-accent/90 text-white text-xs font-semibold px-4 py-2 rounded transition-all duration-200"
                >
                  Explore Detailed Analysis →
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-surface border border-border rounded p-5 space-y-4">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Global System Insights</h3>
            <div className="space-y-4 text-xs text-text-secondary">
              <div className="flex gap-3">
                <div className="p-2 bg-accent/5 border border-accent/10 rounded h-fit shrink-0 text-accent">
                  <TrendingUp size={14} />
                </div>
                <div>
                  <p className="font-semibold text-text-primary mb-0.5">Developer Sentiment Shift</p>
                  <p className="leading-relaxed">{sentimentInsight}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="p-2 bg-accent/5 border border-accent/10 rounded h-fit shrink-0 text-accent">
                  <Globe size={14} />
                </div>
                <div>
                  <p className="font-semibold text-text-primary mb-0.5">Regional Momentum</p>
                  <p className="leading-relaxed">{regionalInsight}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="p-2 bg-accent/5 border border-accent/10 rounded h-fit shrink-0 text-accent">
                  <Activity size={14} />
                </div>
                <div>
                  <p className="font-semibold text-text-primary mb-0.5">System Health</p>
                  <p className="leading-relaxed">{systemInsight}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded p-5 space-y-3">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Monitoring Configuration</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-text-secondary">Google Trends Region</span>
                <span className="font-semibold text-text-primary">{geo}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-text-secondary">Polling Interval</span>
                <span className="font-semibold text-text-primary">60 seconds</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Database Archiver</span>
                <span className="font-semibold text-emerald-500">Active (Auto-save)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {gridTrends.length > 0 && !loading && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Trending Clusters</div>
          <div className="border border-border rounded bg-surface overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto divide-y divide-border/60">
              {gridTrends.map((trend) => {
                const config = TREND_CONFIG[trend.trend_type] ?? TREND_CONFIG.stable;
                const TrendIcon = config.Icon;
                
                // Sentiment helper
                const sScore = trend.sentiment_score;
                const sLabel = sScore > 0.2 ? "Positive" : sScore < -0.2 ? "Negative" : "Mixed";
                const sColor = sScore > 0.2 ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30" : sScore < -0.2 ? "text-red-500 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30" : "text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30";
                
                return (
                  <div
                    key={trend.cluster_id}
                    onClick={() => window.location.href = `/trends/${trend.cluster_id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-surface-elevated/40 transition-colors duration-150 cursor-pointer gap-3"
                  >
                    {/* Title and Badge */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1.5">
                        <span className={`p-1 rounded border shrink-0 ${config.bg} ${config.color} mt-0.5`}>
                          <TrendIcon size={11} />
                        </span>
                        <h4 className="text-xs font-semibold text-text-primary hover:text-accent transition-colors truncate">
                          {trend.title}
                        </h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-text-secondary">
                        <span>Score: <strong className="text-text-primary">{trend.trend_score.toFixed(0)}</strong></span>
                        <span>·</span>
                        <span>Velocity: <strong className={trend.velocity > 0 ? "text-emerald-500" : "text-text-secondary"}>{trend.velocity > 0 ? "+" : ""}{trend.velocity.toFixed(2)}/m</strong></span>
                        <span>·</span>
                        <span>Posts: <strong className="text-text-primary">{trend.post_count}</strong></span>
                      </div>
                    </div>

                    {/* Sources & Sentiment tags */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Sources list */}
                      <div className="flex gap-1">
                        {trend.sources.slice(0, 2).map((src) => (
                          <span
                            key={src}
                            className="text-[9px] px-1.5 py-0.5 rounded border border-border bg-surface-elevated text-text-secondary font-medium uppercase tracking-wider"
                          >
                            {SOURCE_LABELS[src.toLowerCase()] || src}
                          </span>
                        ))}
                      </div>

                      {/* Sentiment tag */}
                      <span className={`text-[9px] px-2 py-0.5 rounded border font-semibold ${sColor}`}>
                        {sLabel}
                      </span>

                      {/* Chevron */}
                      <div className="text-text-secondary/50 pl-1">
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
