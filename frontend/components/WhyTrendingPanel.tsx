"use client";

import { useEffect, useState } from "react";
import { fetchWhyTrending } from "@/lib/api";
import type { WhyTrendingData } from "@/lib/types";
import { Lightbulb, Loader2, ChevronDown, ChevronUp, Zap, Users, Clock, TrendingUp, Star } from "lucide-react";

const MOMENTUM_CONFIG = {
  flash:     { label: "Flash Trend",   color: "text-red-500 dark:text-red-400",    bg: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30" },
  building:  { label: "Building",      color: "text-accent",                       bg: "bg-accent/5 border-accent/20" },
  peaked:    { label: "Peaked",        color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/30" },
  fading:    { label: "Fading",        color: "text-text-secondary",               bg: "bg-surface-elevated border-border" },
};

const CONFIDENCE_COLOR = {
  low:    "text-text-secondary",
  medium: "text-yellow-500 dark:text-yellow-400",
  high:   "text-emerald-500 dark:text-emerald-400",
};

interface Props {
  clusterId: string;
}

export default function WhyTrendingPanel({ clusterId }: Props) {
  const [data, setData] = useState<WhyTrendingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!expanded || fetched) return;
    setLoading(true);
    setFetched(true);
    fetchWhyTrending(clusterId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [expanded, clusterId, fetched]);

  const momentum = data ? (MOMENTUM_CONFIG[data.trend_momentum] ?? MOMENTUM_CONFIG.building) : null;

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden transition-all duration-200">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          <Lightbulb size={16} className="text-accent" />
          <div className="text-left">
            <div className="text-xs font-semibold text-text-primary">Why Is This Trending?</div>
            <div className="text-[10px] text-text-secondary">AI-powered root cause analysis</div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-text-secondary" />
        ) : (
          <ChevronDown size={14} className="text-text-secondary" />
        )}
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border">
          {loading && (
            <div className="flex items-center gap-2 text-text-secondary text-xs py-4">
              <Loader2 size={13} className="animate-spin text-accent" />
              Analyzing root cause…
            </div>
          )}

          {!loading && !data && (
            <p className="text-text-secondary text-xs pt-4">
              Analysis not yet available — check back after the next poll cycle (60s).
            </p>
          )}

          {!loading && data && (
            <div className="space-y-3 pt-3">
              {/* Momentum + confidence */}
              <div className="flex items-center gap-2">
                {momentum && (
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${momentum.bg} ${momentum.color}`}>
                    {momentum.label}
                  </span>
                )}
                <span className={`text-[10px] font-medium ${CONFIDENCE_COLOR[data.confidence]}`}>
                  {data.confidence === "high" ? "High confidence" : data.confidence === "medium" ? "Medium confidence" : "Low confidence"}
                </span>
              </div>

              {/* Trigger event */}
              <div className="bg-surface-elevated rounded p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-accent">
                  <Zap size={11} /> Trigger Event
                </div>
                <p className="text-xs text-text-primary leading-normal">{data.trigger_event}</p>
              </div>

              {/* Target Audience */}
              <div className="bg-surface-elevated rounded p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-accent">
                  <Users size={11} /> Target Audience
                </div>
                <p className="text-xs text-text-primary leading-normal">{data.target_audience}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Sentiment driver */}
                <div className="bg-surface-elevated rounded p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-accent">
                    <TrendingUp size={11} /> Emotion
                  </div>
                  <p className="text-xs text-text-primary capitalize">{data.sentiment_driver}</p>
                </div>
                {/* Momentum */}
                <div className="bg-surface-elevated rounded p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-accent">
                    <Clock size={11} /> Momentum
                  </div>
                  <p className="text-xs text-text-primary capitalize">{data.trend_momentum}</p>
                </div>
              </div>

              {/* Action angle */}
              {data.action_angle && (
                <div className="bg-accent/5 border border-accent/20 rounded p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-accent">
                    <Star size={11} /> Action Angle
                  </div>
                  <p className="text-xs text-text-primary leading-normal">{data.action_angle}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
