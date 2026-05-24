"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  Activity, ArrowRight, BarChart2, Bell, Bookmark,
  Shield, Sparkles, TrendingUp, Users, Zap
} from "lucide-react";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-background text-text-primary transition-colors duration-200">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24 border-b border-border/40">
        {/* Ambient background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] pointer-events-none opacity-20 dark:opacity-30">
          <div className="absolute top-[-10%] left-[20%] w-[40%] h-[60%] rounded-full bg-accent blur-[120px]" />
          <div className="absolute top-[10%] right-[20%] w-[30%] h-[50%] rounded-full bg-violet-500 blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/10 border border-accent/20 text-accent tracking-wide uppercase">
            <Sparkles size={12} className="animate-pulse" /> Real-time Trend Discovery
          </span>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.1] md:leading-[1.15]">
            Uncover emerging tech signals <br />
            <span className="bg-gradient-to-r from-accent via-violet-500 to-indigo-600 bg-clip-text text-transparent">
              before they break
            </span>
          </h1>

          <p className="text-sm md:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Continuously crawl, cluster, and score developer activity across multiple technical networks, open-source repositories, search channels, and social platforms with AI-driven insights and forecasting.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {user ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold px-6 py-3 rounded transition-all duration-200 shadow-lg shadow-accent/20 hover:translate-x-0.5"
              >
                Go to Dashboard
                <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link
                  href="/login?redirect=/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold px-6 py-3 rounded transition-all duration-200 shadow-lg shadow-accent/20 hover:translate-x-0.5"
                >
                  Get Started for Free
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-surface-elevated hover:bg-surface-elevated/80 border border-border text-text-primary px-6 py-3 rounded font-semibold transition-all duration-200"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center space-y-2 mb-14">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">
            Comprehensive platform intelligence
          </h2>
          <p className="text-xs text-text-secondary max-w-lg mx-auto">
            Everything you need to track developer sentiment, tech adoption, and cross-platform growth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Multi-Source Aggregator",
              desc: "Monitors activity across open-source hubs, technical communities, public interest channels, and technology publication feeds.",
              Icon: Activity,
              color: "text-accent border-accent/20 bg-accent/5",
            },
            {
              title: "AI Analysis & Summaries",
              desc: "Generates real-time clusters using advanced NLP, categorizing signals by velocity, diversity, and sentiment scores.",
              Icon: Zap,
              color: "text-amber-500 border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/10",
            },
            {
              title: "Custom Keyword Alerts",
              desc: "Get instant email alerts when specific topics or tools cross engagement thresholds and start gaining momentum.",
              Icon: Bell,
              color: "text-rose-500 border-rose-200/50 bg-rose-50/50 dark:bg-rose-950/10",
            },
            {
              title: "Trend Forecasting",
              desc: "Analyzes velocity and community growth rate to predict whether a signal is a flash-in-the-pan or has long-term momentum.",
              Icon: BarChart2,
              color: "text-emerald-500 border-emerald-200/50 bg-emerald-50/50 dark:bg-emerald-950/10",
            },
          ].map((feat, idx) => {
            const FeatIcon = feat.Icon;
            return (
              <div
                key={idx}
                className="bg-surface border border-border rounded-xl p-6 space-y-4 hover:border-accent/40 transition-all duration-200 group"
              >
                <div className={`p-2.5 rounded-lg border w-fit ${feat.color}`}>
                  <FeatIcon size={16} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors duration-200">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Product Highlight Mockup Section */}
      <section className="bg-surface-elevated/40 border-y border-border/40 py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-5">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">
              Interactive trend timelines & predictions
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              Explore deep charts detailing post-by-post platform distribution, public search interest, and automated social-listening score indicators.
            </p>
            <div className="space-y-3.5 pt-2 text-xs">
              {[
                { text: "Cross-platform activity comparisons", Icon: Users },
                { text: "Detailed community sentiment analytics", Icon: TrendingUp },
                { text: "Private watchlist tracking", Icon: Bookmark },
              ].map((item, idx) => {
                const ItemIcon = item.Icon;
                return (
                  <div key={idx} className="flex items-center gap-2.5">
                    <div className="p-1 rounded bg-accent/10 border border-accent/20 text-accent">
                      <ItemIcon size={12} />
                    </div>
                    <span className="font-semibold text-text-primary">{item.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* High-fidelity Mockup */}
          <div className="lg:col-span-7 bg-surface border border-border rounded-xl p-5 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              </div>
              <div className="text-[10px] font-mono text-text-secondary bg-surface-elevated px-4 py-0.5 rounded border border-border">
                trendintel.app/dashboard
              </div>
              <div className="w-10" />
            </div>

            {/* Mock Trend Card */}
            <div className="bg-surface-elevated/40 border border-border/80 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded uppercase">
                  Rising
                </span>
                <span className="text-[9px] text-text-secondary">
                  Last updated: Just now
                </span>
              </div>
              <h4 className="text-xs font-bold text-text-primary">
                React 19 Server Actions · Next.js · Server Components
              </h4>
              
              {/* Mock Sparkline Graph */}
              <div className="h-14 w-full flex items-end gap-1.5 pt-2">
                {[10, 15, 30, 25, 45, 60, 50, 75, 95].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className="flex-1 rounded-t bg-gradient-to-t from-accent/80 to-accent transition-all duration-300"
                  />
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-[10px]">
                <div className="bg-surface border border-border/60 rounded p-1.5">
                  <div className="text-text-secondary uppercase text-[8px]">Score</div>
                  <div className="font-bold text-accent">96/100</div>
                </div>
                <div className="bg-surface border border-border/60 rounded p-1.5">
                  <div className="text-text-secondary uppercase text-[8px]">Velocity</div>
                  <div className="font-bold text-emerald-500">+1.25/m</div>
                </div>
                <div className="bg-surface border border-border/60 rounded p-1.5">
                  <div className="text-text-secondary uppercase text-[8px]">Sentiment</div>
                  <div className="font-bold text-accent">Positive</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center space-y-6">
        <h2 className="text-xl md:text-3xl font-extrabold tracking-tight text-text-primary">
          Ready to track the tech landscape?
        </h2>
        <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
          Create a free account to customize alerts, watchlist specific frameworks, and access deep developer community analysis.
        </p>
        <div className="pt-2">
          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white font-semibold px-6 py-3 rounded transition-all duration-200"
            >
              Access Dashboard
              <ArrowRight size={14} />
            </Link>
          ) : (
            <Link
              href="/login?redirect=/dashboard"
              className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white font-semibold px-6 py-3 rounded transition-all duration-200"
            >
              Sign Up For Free
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
