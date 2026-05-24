/**
 * Trend Detail Page — /trends/[id]
 */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  fetchTrendById,
  fetchTrendSummary,
} from "@/lib/api";
import type { Trend, TrendSummaryResponse } from "@/lib/types";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  MessageCircle,
  ThumbsUp,
  Loader2,
  Users,
  Zap,
  Flame,
  Minus,
  Brain,
  Globe,
} from "lucide-react";
import SparklineChart from "@/components/SparklineChart";
import WhyTrendingPanel from "@/components/WhyTrendingPanel";
import ForecastBadge from "@/components/ForecastBadge";
import ContentIdeaPanel from "@/components/ContentIdeaPanel";
import CrossPlatformChart from "@/components/CrossPlatformChart";
import WatchlistButton from "@/components/WatchlistButton";
import ProtectedRoute from "@/components/ProtectedRoute";


const TREND_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  rising:          { label: "Rising",          color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30" },
  emerging:        { label: "Emerging",         color: "text-accent",                       bg: "bg-accent/5 border-accent/20" },
  controversial:   { label: "Controversial",    color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/30" },
  cross_community: { label: "Cross-Community",  color: "text-sky-500 dark:text-sky-400",    bg: "bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/30" },
  declining:       { label: "Declining",        color: "text-red-500 dark:text-red-400",    bg: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30" },
  stable:          { label: "Stable",           color: "text-text-secondary",               bg: "bg-surface-elevated border-border" },
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 text-center">
      <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">{label}</div>
      <div className="text-xl font-bold text-text-primary">{value}</div>
      {sub && <div className="text-[10px] text-text-secondary mt-0.5">{sub}</div>}
    </div>
  );
}

function SubredditChart({ posts }: { posts: Trend["posts"] }) {
  const totalPosts = posts.length;

  // Group by source
  const sourceGroups: Record<string, { count: number; totalScore: number; totalComments: number }> = {};
  
  // Group by subreddit (only for reddit source)
  const subredditGroups: Record<string, number> = {};

  posts.forEach((p) => {
    const src = p.source?.toLowerCase() || "unknown";
    if (!sourceGroups[src]) {
      sourceGroups[src] = { count: 0, totalScore: 0, totalComments: 0 };
    }
    sourceGroups[src].count += 1;
    sourceGroups[src].totalScore += p.score || 0;
    sourceGroups[src].totalComments += p.num_comments || 0;

    if (src === "reddit" && p.subreddit) {
      subredditGroups[p.subreddit] = (subredditGroups[p.subreddit] || 0) + 1;
    }
  });

  if (totalPosts <= 1) {
    const singlePost = posts[0];
    if (!singlePost) return null;
    const srcKey = singlePost.source?.toLowerCase() || "unknown";
    const srcCfg = SOURCE_BADGES[srcKey] || { label: singlePost.source || "Unknown", text: "text-text-secondary", brandColor: "#9CA3AF", bg: "bg-surface-elevated border-border" };
    return (
      <div className="bg-surface border border-border rounded-lg p-5">
        <h3 className="text-xs font-semibold text-text-primary tracking-tight mb-3">Platform Activity & Distribution</h3>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded bg-surface-elevated/50 border border-border/40 text-xs">
          <div className="space-y-1">
            <p className="text-text-secondary leading-relaxed">
              This trend consists of a single signal detected on <span className={`font-semibold ${srcCfg.text}`}>{srcCfg.label}</span>.
            </p>
            {singlePost.subreddit && (
              <p className="text-[10px] text-text-secondary">
                Community: <span className="font-semibold text-text-primary"># {singlePost.subreddit}</span>
              </p>
            )}
          </div>
          <div className="flex gap-4 shrink-0">
            <div className="text-center bg-surface px-4 py-1.5 rounded border border-border/40 min-w-[70px]">
              <div className="text-[9px] text-text-secondary uppercase">Score</div>
              <div className="text-xs font-bold text-text-primary">{singlePost.score.toLocaleString()}</div>
            </div>
            {singlePost.num_comments > 0 && (
              <div className="text-center bg-surface px-4 py-1.5 rounded border border-border/40 min-w-[70px]">
                <div className="text-[9px] text-text-secondary uppercase">Comments</div>
                <div className="text-xs font-bold text-text-primary">{singlePost.num_comments}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Sort sources by count
  const sortedSources = Object.entries(sourceGroups)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, data]) => {
      const cfg = SOURCE_BADGES[name] || { label: name, text: "text-text-secondary", brandColor: "#9CA3AF", bg: "bg-surface-elevated border-border" };
      return {
        name,
        ...data,
        ...cfg,
        percentage: (data.count / totalPosts) * 100,
      };
    });

  // Sort subreddits
  const sortedSubreddits = Object.entries(subredditGroups)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="bg-surface border border-border rounded-lg p-5 space-y-5">
      <div>
        <h3 className="text-xs font-semibold text-text-primary tracking-tight mb-1">Platform Activity & Distribution</h3>
        <p className="text-[10px] text-text-secondary font-medium">Breakdown of sources and community engagement for this trend.</p>
      </div>

      {/* Segmented Bar */}
      <div className="h-2 w-full rounded-full overflow-hidden flex bg-surface-elevated">
        {sortedSources.map((src) => (
          <div
            key={src.name}
            style={{
              width: `${src.percentage}%`,
              backgroundColor: src.brandColor,
            }}
            title={`${src.label}: ${src.count} posts (${src.percentage.toFixed(0)}%)`}
            className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300"
          />
        ))}
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {sortedSources.map((src) => (
          <div key={src.name} className="p-3 rounded border border-border/40 bg-surface-elevated/30 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: src.brandColor }}
                />
                <span className="text-[11px] font-bold text-text-primary leading-none">{src.label}</span>
              </div>
              <div className="text-[10px] text-text-secondary">
                {src.count} {src.count === 1 ? "post" : "posts"} ({src.percentage.toFixed(0)}%)
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[8px] text-text-secondary uppercase tracking-wider mb-0.5">Engagement</div>
              <div className="text-[11px] font-bold text-text-primary">
                {src.totalScore.toLocaleString()} pts
              </div>
              {src.totalComments > 0 && (
                <div className="text-[9px] text-text-secondary font-medium">
                  {src.totalComments} comments
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Subreddit breakdown */}
      {sortedSubreddits.length > 0 && (
        <div className="pt-3.5 border-t border-border/40">
          <h4 className="text-[9px] font-bold text-text-secondary uppercase tracking-wider mb-2">Active Communities</h4>
          <div className="flex flex-wrap gap-1.5">
            {sortedSubreddits.map(([sub, count]) => (
              <span
                key={sub}
                className="text-[10px] px-2 py-0.5 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 rounded-md font-semibold"
              >
                # {sub} <span className="opacity-60 font-normal">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const SOURCE_BADGES: Record<string, { label: string; bg: string; text: string; brandColor: string }> = {
  hackernews: { label: "Tech Community", bg: "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800/30", text: "text-orange-500 dark:text-orange-400", brandColor: "#F97316" },
  github: { label: "Open Source Hub", bg: "bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800/30", text: "text-purple-500 dark:text-purple-400", brandColor: "#A855F7" },
  "google-trends": { label: "Search Interest", bg: "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/30", text: "text-blue-500 dark:text-blue-400", brandColor: "#3B82F6" },
  newsapi: { label: "Tech News", bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/30", text: "text-emerald-500 dark:text-emerald-400", brandColor: "#10B981" },
  reddit: { label: "Social Communities", bg: "bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/30", text: "text-rose-500 dark:text-rose-400", brandColor: "#F43F5E" },
  devto: { label: "Developer Blogs", bg: "bg-neutral-50 border-neutral-200 dark:bg-neutral-950/20 dark:border-neutral-800/30", text: "text-neutral-900 dark:text-neutral-200", brandColor: "#0A0A0A" },
};

function PostRow({ post, index }: { post: Trend["posts"][0]; index: number }) {
  const timeAgo = post.created_utc
    ? Math.round((Date.now() / 1000 - post.created_utc) / 3600)
    : null;

  const sourceKey = post.source?.toLowerCase();
  const source = SOURCE_BADGES[sourceKey] || { label: post.source || "Unknown", bg: "bg-surface-elevated border-border", text: "text-text-secondary" };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0 hover:bg-surface-elevated/40 rounded px-2 transition-colors duration-200">
      <span className="text-[10px] text-text-secondary font-mono w-5 mt-0.5 shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-[9px] px-1.5 py-0.5 font-semibold border rounded ${source.bg} ${source.text}`}>
            {source.label}
          </span>
          {post.subreddit && (
            <span className="text-[9px] px-1.5 py-0.5 bg-surface-elevated border border-border text-text-secondary rounded font-medium">
              {post.subreddit}
            </span>
          )}
        </div>
        <a
          href={post.url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-text-primary hover:text-accent font-medium transition-colors line-clamp-2 group"
        >
          {post.title}
          <ExternalLink size={10} className="inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
        <div className="flex items-center gap-3 mt-1 text-[10px] text-text-secondary">
          {timeAgo !== null && <span>{timeAgo}h ago</span>}
          <span className="flex items-center gap-1">
            <ThumbsUp size={10} />
            {post.score.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle size={10} />
            {post.num_comments.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function TrendDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clusterId = params?.id as string;

  const [trend, setTrend] = useState<Trend | null>(null);
  const [summaryData, setSummaryData] = useState<TrendSummaryResponse | null>(null);
  const [loadingTrend, setLoadingTrend] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clusterId) return;
    setLoadingTrend(true);
    fetchTrendById(clusterId)
      .then(setTrend)
      .catch(() => setError("Could not load trend data."))
      .finally(() => setLoadingTrend(false));
  }, [clusterId]);

  useEffect(() => {
    if (!trend) return;
    setLoadingSummary(true);
    fetchTrendSummary(trend.cluster_id)
      .then(setSummaryData)
      .catch(() => {})
      .finally(() => setLoadingSummary(false));
  }, [trend]);

  const badge = trend ? (TREND_BADGES[trend.trend_type] ?? TREND_BADGES.stable) : null;

  if (loadingTrend) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-accent" />
      </div>
    );
  }

  if (error || !trend) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-text-secondary text-xs">{error || "Trend not found."}</p>
        <button onClick={() => router.push("/dashboard")} className="text-accent hover:underline flex items-center gap-2 text-xs">
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>
    );
  }

  const sentimentLabel =
    trend.sentiment_score > 0.2 ? "Positive" : trend.sentiment_score < -0.2 ? "Negative" : "Mixed";
  const sentimentColor =
    trend.sentiment_score > 0.2 ? "text-emerald-500 dark:text-emerald-400" : trend.sentiment_score < -0.2 ? "text-red-500 dark:text-red-400" : "text-yellow-500 dark:text-yellow-400";
  const sentimentPct = Math.round(((trend.sentiment_score + 1) / 2) * 100);

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-background text-text-primary transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2 text-xs mb-6"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-4 space-y-6">
        {/* Title + badge */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {badge && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded border text-[10px] font-semibold ${badge.bg} ${badge.color}`}>
                {trend.trend_type === "rising" && <TrendingUp size={11} />}
                {trend.trend_type === "emerging" && <Zap size={11} />}
                {trend.trend_type === "controversial" && <Flame size={11} />}
                {trend.trend_type === "cross_community" && <Users size={11} />}
                {trend.trend_type === "declining" && <TrendingDown size={11} />}
                {trend.trend_type === "stable" && <Minus size={11} />}
                {badge.label}
              </span>
            )}
            {trend.is_cross_platform && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-sky-50 border border-sky-200 dark:bg-sky-950/20 dark:border-sky-800/30 text-sky-500 dark:text-sky-400 text-[10px] font-semibold">
                <Globe size={11} /> Cross-Platform
              </span>
            )}
            <WatchlistButton
              clusterId={trend.cluster_id}
              clusterTitle={trend.title}
              className="ml-auto"
            />
          </div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight leading-tight">
            {trend.title}
          </h1>
          <p className="text-text-secondary text-[10px]">
            Last updated {new Date(trend.last_updated).toLocaleString()}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Trend Score" value={`${trend.trend_score.toFixed(0)}/100`} />
          <StatCard label="Posts" value={trend.post_count} sub={`${trend.subreddit_diversity} subreddits`} />
          <StatCard
            label="Velocity"
            value={`${trend.velocity > 0 ? "+" : ""}${trend.velocity.toFixed(2)}/m`}
            sub="posts per minute"
          />
          <StatCard
            label="Growth"
            value={`${trend.growth_rate > 0 ? "+" : ""}${trend.growth_rate.toFixed(1)}%`}
            sub="since last snapshot"
          />
        </div>

        {/* Charts & Panels */}
        <SparklineChart clusterId={trend.cluster_id} variant="full" />
        <ForecastBadge clusterId={trend.cluster_id} />
        <WhyTrendingPanel clusterId={trend.cluster_id} />
        <CrossPlatformChart keyword={trend.title.split(' · ')[0]} />

        <div className="grid md:grid-cols-2 gap-6">
          {/* AI Summary */}
          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={14} className="text-accent" />
              <h3 className="text-xs font-semibold text-text-primary tracking-tight">AI Analysis</h3>
            </div>

            {loadingSummary ? (
              <div className="flex items-center gap-2 text-text-secondary text-xs">
                <Loader2 size={12} className="animate-spin text-accent" />
                Generating AI summary…
              </div>
            ) : summaryData ? (
              <div className="space-y-4 text-xs">
                <p className="text-text-primary leading-relaxed">{summaryData.summary}</p>

                {summaryData.insights && (
                  <div className="space-y-2 pt-3 border-t border-border">
                    {summaryData.insights.why_trending && (
                      <div>
                        <span className="text-text-secondary font-medium">Why trending: </span>
                        <span className="text-text-primary">{summaryData.insights.why_trending}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                        summaryData.insights.impact_level === "high"
                          ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30 text-red-500 dark:text-red-400"
                          : summaryData.insights.impact_level === "medium"
                          ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800/30 text-yellow-500 dark:text-yellow-400"
                          : "bg-surface-elevated border-border text-text-secondary"
                      }`}>
                        {summaryData.insights.impact_level} impact
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30 text-blue-500 dark:text-blue-400 font-semibold">
                        ~{summaryData.insights.predicted_duration}
                      </span>
                    </div>
                    {summaryData.insights.related_keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {summaryData.insights.related_keywords.map((kw) => (
                          <span key={kw} className="text-[10px] px-1.5 py-0.5 bg-surface-elevated border border-border text-text-secondary rounded">
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-text-secondary text-xs">AI summary not yet available — check back shortly.</p>
            )}
          </div>

          {/* Sentiment */}
          <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
            <h3 className="text-xs font-semibold text-text-primary tracking-tight">Community Sentiment</h3>

            <div className="text-center py-4">
              <div className={`text-3xl font-bold ${sentimentColor}`}>{sentimentLabel}</div>
              <div className="text-text-secondary text-[11px] mt-1 font-medium">
                {trend.sentiment_score > 0 ? "+" : ""}{trend.sentiment_score.toFixed(2)} composite score
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-text-secondary mb-1.5">
                <span>Negative</span>
                <span>Positive</span>
              </div>
              <div className="h-1 w-full bg-surface-elevated rounded overflow-hidden">
                <div
                  className={`h-full rounded transition-all duration-500 ${
                    trend.sentiment_score > 0.2 ? "bg-emerald-500" : trend.sentiment_score < -0.2 ? "bg-red-500" : "bg-yellow-500"
                  }`}
                  style={{ width: `${sentimentPct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-surface-elevated rounded p-2.5 text-center border border-border/40">
                <div className="text-[10px] text-text-secondary">Avg Score</div>
                <div className="text-sm font-bold text-text-primary">{Math.round(trend.avg_score)}</div>
              </div>
              <div className="bg-surface-elevated rounded p-2.5 text-center border border-border/40">
                <div className="text-[10px] text-text-secondary">Total Upvotes</div>
                <div className="text-sm font-bold text-text-primary">{trend.total_score.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        <SubredditChart posts={trend.posts} />

        {/* Posts list */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <h3 className="text-xs font-semibold text-text-primary tracking-tight mb-4">
            All Posts ({trend.posts.length})
          </h3>
          <div className="divide-y divide-border/60">
            {trend.posts
              .slice()
              .sort((a, b) => b.score - a.score)
              .map((post, i) => (
                <PostRow key={post.id || i} post={post} index={i} />
              ))}
          </div>
        </div>

        <ContentIdeaPanel
          clusterId={trend.cluster_id}
          trendTitle={trend.title}
        />
      </div>
    </main>
    </ProtectedRoute>
  );
}
