"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, Tooltip, Legend,
} from "recharts";

interface GooglePoint {
  timestamp: string;
  interest: number;
}

interface GoogleData {
  keyword: string;
  data_points: GooglePoint[];
  peak_interest: number;
  avg_interest: number;
}

interface Props {
  /** Top keyword from the cluster title */
  keyword: string;
  /** Current trend_score series from sparkline (already fetched on detail page) */
  trendScoreData?: Array<{ timestamp: string; trend_score: number }>;
}

export default function CrossPlatformChart({ keyword, trendScoreData = [] }: Props) {
  const [googleData, setGoogleData] = useState<GoogleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

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
    if (!keyword) { setLoading(false); return; }
    api.get(`/api/google-trends/${encodeURIComponent(keyword)}`)
      .then((res) => setGoogleData(res.data))
      .catch(() => setUnavailable(true))
      .finally(() => setLoading(false));
  }, [keyword]);

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-lg p-5 flex items-center gap-2 text-text-secondary text-xs">
        <Loader2 size={14} className="animate-spin" />
        Fetching Google Trends data…
      </div>
    );
  }

  if (unavailable || !googleData) {
    return null;
  }

  const googlePoints = googleData.data_points.map((p) => ({
    label: new Date(p.timestamp).toLocaleDateString([], { month: "short", day: "numeric" }),
    google_interest: p.interest,
  }));

  const activeColor = isDark ? "#8B5CF6" : "#4F46E5";

  return (
    <div className="bg-surface border border-border rounded-lg p-5 transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-accent" />
          <h3 className="text-xs font-semibold text-text-primary tracking-tight">
            Google Search Interest — "{keyword}"
          </h3>
        </div>
        <div className="text-[11px] text-text-secondary">
          Last 7 days · Peak: {googleData.peak_interest} · Avg: {googleData.avg_interest}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={googlePoints}>
          <defs>
            <linearGradient id={`googleGrad-${keyword}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={activeColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={activeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fill: isDark ? "#9CA3AF" : "#6B7280", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
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
            formatter={(v: number) => [`${v}/100`, "Search Interest"]}
          />
          <Area
            type="monotone"
            dataKey="google_interest"
            stroke={activeColor}
            fill={`url(#googleGrad-${keyword})`}
            strokeWidth={1.5}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p className="text-[10px] text-text-secondary mt-2 leading-normal">
        Google Trends search interest (0–100 relative scale) vs. Reddit/HN activity above.
        High Google interest = mainstream pickup beyond social media.
      </p>
    </div>
  );
}
