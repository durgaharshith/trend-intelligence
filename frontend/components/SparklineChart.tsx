"use client";

/**
 * SparklineChart — mini trend velocity chart.
 * Used on both TrendCard (tiny) and detail page (full size).
 */

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";

interface SnapshotPoint {
  timestamp: string;
  post_count: number;
  trend_score: number;
  velocity: number;
}

interface SparklineChartProps {
  clusterId: string;
  /** "compact" = tiny sparkline for card, "full" = labelled chart for detail page */
  variant?: "compact" | "full";
  dataKey?: keyof SnapshotPoint;
  color?: string;
}

export default function SparklineChart({
  clusterId,
  variant = "compact",
  dataKey = "trend_score",
  color = "#3b82f6",
}: SparklineChartProps) {
  const [data, setData] = useState<SnapshotPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    api
      .get(`/api/history/${clusterId}`, { params: { hours: 24 } })
      .then((res) => setData(res.data.snapshots || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [clusterId]);

  if (loading || data.length < 2) return null;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const activeColor = isDark ? "#8B5CF6" : "#4F46E5";

  if (variant === "compact") {
    return (
      <div className="h-10 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={activeColor}
              fill={`${activeColor}10`}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Full variant
  return (
    <div className="bg-surface border border-border rounded-lg p-5 transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-text-secondary tracking-tight">Trend Velocity (24h)</h3>
        <div className="flex gap-3 text-xs text-text-secondary">
          {(["trend_score", "post_count"] as const).map((k) => (
            <span key={k} className={k === dataKey ? "text-accent font-medium" : ""}>
              {k === "trend_score" ? "Score" : "Posts"}
            </span>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`sparkGrad-${clusterId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={activeColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={activeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
            tick={{ fill: isDark ? "#9CA3AF" : "#6B7280", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: isDark ? "#9CA3AF" : "#6B7280", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              background: isDark ? "#0F1115" : "#FFFFFF",
              border: `1px solid ${isDark ? "#1F222B" : "#E5E7EB"}`,
              borderRadius: 4,
              fontSize: 11,
              color: isDark ? "#FFFFFF" : "#111827",
            }}
            labelFormatter={formatTime}
            formatter={(v: number) => [v.toFixed(1), dataKey === "trend_score" ? "Score" : "Posts"]}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={activeColor}
            fill={`url(#sparkGrad-${clusterId})`}
            strokeWidth={1.5}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
