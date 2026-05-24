"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import type { GlobalHistorySnapshot } from "@/lib/types";

// 10 distinct colours for up to 10 trend lines
const LINE_COLORS = [
  "#4F46E5", "#8b5cf6", "#06b6d4", "#10b981",
  "#f59e0b", "#ef4444", "#f97316", "#ec4899",
  "#a3e635", "#67e8f9",
];

interface TrendTimelineProps {
  snapshots: GlobalHistorySnapshot[];
  sourcesLabel?: string;
}

export default function TrendTimeline({ snapshots, sourcesLabel = "Reddit + HN" }: TrendTimelineProps) {
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

  if (snapshots.length < 2) {
    return (
      <div className="text-center py-16 text-text-secondary">
        <p className="text-xs">Not enough data yet — timeline populates after a few poll cycles.</p>
        <p className="text-[10px] mt-1 text-text-secondary/70">{sourcesLabel} are polled every 60 seconds.</p>
      </div>
    );
  }

  // Build a flat dataset: each row = one snapshot point with columns per cluster
  const allClusters = new Map<string, string>(); // id → title
  snapshots.forEach((snap) =>
    snap.trends.forEach((t) => allClusters.set(t.cluster_id, t.title))
  );

  // Limit to top 6 clusters (by average trend_score) to avoid chart clutter
  const clusterScores = new Map<string, number>();
  snapshots.forEach((snap) =>
    snap.trends.forEach((t) => {
      clusterScores.set(
        t.cluster_id,
        (clusterScores.get(t.cluster_id) || 0) + t.trend_score
      );
    })
  );
  const topClusters = [...clusterScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id]) => id);

  const chartData = snapshots.map((snap) => {
    const row: Record<string, number | string> = {
      time: new Date(snap.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    topClusters.forEach((id) => {
      const t = snap.trends.find((x) => x.cluster_id === id);
      row[id] = t ? Math.round(t.trend_score) : 0;
    });
    return row;
  });

  const shortLabel = (id: string) => {
    const title = allClusters.get(id) || id;
    return title.length > 22 ? title.slice(0, 22) + "…" : title;
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={chartData}>
        <XAxis
          dataKey="time"
          tick={{ fill: isDark ? "#9CA3AF" : "#6B7280", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: isDark ? "#9CA3AF" : "#6B7280", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            background: isDark ? "#0F1115" : "#FFFFFF",
            border: `1px solid ${isDark ? "#1F222B" : "#E5E7EB"}`,
            borderRadius: 4,
            fontSize: 11,
            color: isDark ? "#FFFFFF" : "#111827",
          }}
          formatter={(v: number, name: string) => [v, shortLabel(name as string)]}
        />
        <Legend
          formatter={(name) => (
            <span className="text-[10px] font-medium text-text-secondary">{shortLabel(name)}</span>
          )}
        />
        {topClusters.map((id, i) => (
          <Line
            key={id}
            type="monotone"
            dataKey={id}
            stroke={LINE_COLORS[i % LINE_COLORS.length]}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
