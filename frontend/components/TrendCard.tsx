"use client";

import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, Flame, Zap, Users, Minus, Shield } from "lucide-react";
import { SOURCE_LABELS, type Trend, type TrendType } from "@/lib/types";

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

function SentimentBar({ score }: { score: number }) {
  const pct = Math.round(((score + 1) / 2) * 100);
  const color =
    score > 0.2 ? "bg-emerald-500" : score < -0.2 ? "bg-red-500" : "bg-yellow-500";
  const label =
    score > 0.2 ? "Positive" : score < -0.2 ? "Negative" : "Mixed";
  const textColor =
    score > 0.2 ? "text-emerald-500 dark:text-emerald-400" : score < -0.2 ? "text-red-500 dark:text-red-400" : "text-yellow-500 dark:text-yellow-400";

  return (
    <div className="mt-2.5">
      <div className="flex justify-between text-[10px] text-text-secondary mb-1">
        <span>Sentiment</span>
        <span className={`${textColor} font-medium`}>{label}</span>
      </div>
      <div className="h-1 w-full bg-surface-elevated rounded overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ImpactBar({ score }: { score: number }) {
  const pct = Math.round(score);
  const color =
    score >= 70 ? "bg-accent" : score >= 40 ? "bg-accent/70" : "bg-text-secondary";
  const label =
    score >= 70 ? "Critical Adoption" : score >= 40 ? "Growing" : "Initial Signal";
  const textColor =
    score >= 40 ? "text-accent" : "text-text-secondary";

  return (
    <div className="mt-2.5">
      <div className="flex justify-between text-[10px] text-text-secondary mb-1 items-center">
        <span className="flex items-center gap-1">
          <Shield size={11} className="text-accent" />
          Developer Impact
        </span>
        <span className={`${textColor} font-medium`}>{label} ({pct}%)</span>
      </div>
      <div className="h-1 w-full bg-surface-elevated rounded overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface TrendCardProps {
  trend: Trend;
}

export default function TrendCard({ trend }: TrendCardProps) {
  const router = useRouter();
  const config = TREND_CONFIG[trend.trend_type] ?? TREND_CONFIG.stable;
  const { Icon } = config;

  const subreddits = [
    ...new Set(trend.posts.map((p) => p.subreddit).filter(Boolean)),
  ].slice(0, 2) as string[];

  const topPost = trend.posts[0];
  const hasDescription = topPost?.selftext && topPost.selftext.trim().length > 20;

  function handleViewDetails() {
    router.push(`/trends/${trend.cluster_id}`);
  }

  return (
    <div
      className="group bg-surface border border-border rounded-lg p-4 hover:border-accent/40 transition-all duration-200 flex flex-col cursor-pointer"
      onClick={handleViewDetails}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-xs font-semibold text-text-primary leading-snug line-clamp-2 flex-1 group-hover:text-accent transition-colors duration-200">
          {trend.title}
        </h3>
        <span className="text-xs font-bold text-accent tracking-tight bg-accent/5 px-2 py-0.5 border border-accent/10 rounded">
          {trend.trend_score.toFixed(0)}
        </span>
      </div>

      {/* Badges Row */}
      <div className="flex flex-wrap gap-1 mb-3">
        <div
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-semibold ${config.bg} ${config.color}`}
        >
          <Icon size={10} />
          {config.label}
        </div>
        {trend.sources?.map((src) => {
          const lbl = SOURCE_LABELS[src.toLowerCase()] || src;
          return (
            <span
              key={src}
              className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded border border-border bg-surface-elevated text-text-secondary font-medium"
            >
              {lbl}
            </span>
          );
        })}
      </div>

      {/* Description */}
      {hasDescription && (
        <p className="text-[11px] text-text-secondary line-clamp-2 mb-3 leading-relaxed">
          {topPost.selftext!.slice(0, 120)}…
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1.5 mb-3 text-center">
        <div className="bg-surface-elevated/50 border border-border/40 rounded p-1.5">
          <div className="text-[9px] text-text-secondary mb-0.5">Posts</div>
          <div className="text-xs font-semibold text-text-primary">{trend.post_count}</div>
        </div>
        <div className="bg-surface-elevated/50 border border-border/40 rounded p-1.5">
          <div className="text-[9px] text-text-secondary mb-0.5">Avg Score</div>
          <div className="text-xs font-semibold text-text-primary">{Math.round(trend.avg_score)}</div>
        </div>
        <div className="bg-surface-elevated/50 border border-border/40 rounded p-1.5">
          <div className="text-[9px] text-text-secondary mb-0.5">Velocity</div>
          <div
            className={`text-xs font-semibold ${
              trend.velocity > 0 ? "text-emerald-500 dark:text-emerald-400" : "text-text-secondary"
            }`}
          >
            {trend.velocity > 0 ? "+" : ""}
            {trend.velocity.toFixed(2)}/m
          </div>
        </div>
      </div>

      {/* Subreddit pills */}
      {subreddits.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {subreddits.map((sub) => (
            <span
              key={sub}
              className="text-[9px] px-1 py-0.5 bg-surface-elevated border border-border/40 text-text-secondary rounded"
            >
              #{sub}
            </span>
          ))}
          {trend.subreddit_diversity > 2 && (
            <span className="text-[9px] px-1 py-0.5 text-text-secondary/70">
              +{trend.subreddit_diversity - 2} more
            </span>
          )}
        </div>
      )}

      {/* Sentiment or Impact bar */}
      {trend.is_cross_platform ? (
        <ImpactBar score={trend.trend_score} />
      ) : (
        <SentimentBar score={trend.sentiment_score} />
      )}
    </div>
  );
}
