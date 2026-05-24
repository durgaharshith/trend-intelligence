"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  TrendingUp, TrendingDown, Minus, Zap,
  Loader2, Clock, Target, AlertTriangle
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine
} from "recharts";

interface ForecastData {
  cluster_id: string;
  trajectory: "rising" | "declining" | "stable" | "volatile";
  slope: number;
  r_squared: number;
  peak_score: number;
  estimated_peak_in_hours?: number;
  estimated_fade_in_hours?: number;
  forecast_points: Array<{ timestamp: string; predicted_score: number }>;
  confidence: "low" | "medium" | "high";
  data_points: number;
  cached: boolean;
}

const TRAJECTORY_CONFIG = {
  rising:   { label: "Rising",   color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", Icon: TrendingUp },
  declining:{ label: "Declining",color: "text-red-400",     bg: "bg-red-500/10 border-red-500/30",        Icon: TrendingDown },
  stable:   { label: "Stable",   color: "text-slate-400",  bg: "bg-slate-600/20 border-slate-600/30",   Icon: Minus },
  volatile: { label: "Volatile", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", Icon: Zap },
};

const CONFIDENCE_COLOR = { low: "text-slate-500", medium: "text-yellow-400", high: "text-emerald-400" };
const LINE_COLOR = { rising: "#10b981", declining: "#ef4444", stable: "#64748b", volatile: "#f97316" };

interface Props {
  clusterId: string;
}

export default function ForecastBadge({ clusterId }: Props) {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/forecast/${clusterId}`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [clusterId]);

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-5 flex items-center gap-2 text-text-secondary text-sm">
        <Loader2 size={14} className="animate-spin text-accent" />
        Computing forecast…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-surface border border-border rounded-xl p-5 text-sm text-text-secondary flex items-center gap-2">
        <Target size={16} className="shrink-0 text-accent" /> Forecast unavailable — need at least 3 poll cycles of data (~3 minutes).
      </div>
    );
  }

  const config = TRAJECTORY_CONFIG[data.trajectory];
  const { Icon } = config;
  const chartColor = LINE_COLORS[data.trajectory] ?? "#64748b";

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">24h Forecast</h3>
        <span className={`text-xs ${CONFIDENCE_COLOR[data.confidence]}`}>
          {data.confidence} confidence (R²={data.r_squared.toFixed(2)})
        </span>
      </div>

      {/* Trajectory badge + prediction */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${config.bg} ${config.color}`}>
          <Icon size={12} />
          {config.label}
        </span>

        {data.estimated_peak_in_hours !== undefined && data.estimated_peak_in_hours !== null && (
          <span className="flex items-center gap-1 text-xs text-emerald-500 font-semibold">
            <Clock size={12} />
            Peak in ~{Math.round(data.estimated_peak_in_hours)}h
          </span>
        )}

        {data.estimated_fade_in_hours !== undefined && data.estimated_fade_in_hours !== null && (
          <span className="flex items-center gap-1 text-xs text-red-500 font-semibold">
            <AlertTriangle size={12} />
            Fades in ~{Math.round(data.estimated_fade_in_hours)}h
          </span>
        )}

        <span className="flex items-center gap-1 text-xs text-text-secondary">
          <Target size={12} />
          Peak score: {data.peak_score.toFixed(0)}/100
        </span>
      </div>

      {/* Forecast sparkline */}
      {data.forecast_points.length > 1 && (
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.forecast_points}>
              <defs>
                <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="timestamp" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11, color: "var(--text-primary)" }}
                labelFormatter={formatTime}
                formatter={(v: number) => [v.toFixed(1), "Predicted Score"]}
              />
              <ReferenceLine y={50} stroke="var(--border)" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="predicted_score"
                stroke={chartColor}
                fill="url(#fcGrad)"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-[10px] text-text-secondary/70">
        Based on {data.data_points} data points · Slope: {data.slope > 0 ? "+" : ""}{data.slope.toFixed(2)} pts/h
      </p>
    </div>
  );
}

// Fix: use correct variable name
const LINE_COLORS: Record<string, string> = LINE_COLOR;
