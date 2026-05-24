"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import {
  Sparkles, Loader2, Copy, Check,
  BookOpen, Twitter, MessageCircle, Linkedin, Youtube,
} from "lucide-react";

interface ContentIdeas {
  blog_post: { title: string; hook: string; outline: string[] };
  twitter_thread: { hook: string; points: string[] };
  reddit_comment: { subreddit: string; angle: string };
  linkedin_post: { framing: string; cta: string };
  youtube_short: { title: string; hook: string; key_point: string };
  social_context?: string;
}

interface Props {
  clusterId: string;
  trendTitle: string;
  whyTrending?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className="text-text-secondary hover:text-accent transition-colors p-1"
      title="Copy to clipboard"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
}

function parseMarkdownLinks(text: string) {
  if (!text) return "";
  const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    const linkText = match[1];
    const linkUrl = match[2];

    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    parts.push(
      <a
        key={matchIndex}
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent hover:underline font-semibold"
      >
        {linkText}
      </a>
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

const PLATFORM_CONFIG = [
  { key: "blog_post",       label: "Blog Post",         Icon: BookOpen,        color: "text-accent",                       bg: "bg-surface-elevated/50 border-border" },
  { key: "twitter_thread",  label: "Twitter/X Thread",  Icon: Twitter,         color: "text-sky-500 dark:text-sky-400",    bg: "bg-surface-elevated/50 border-border" },
  { key: "reddit_comment",  label: "Reddit Comment",    Icon: MessageCircle,   color: "text-orange-500 dark:text-orange-400", bg: "bg-surface-elevated/50 border-border" },
  { key: "linkedin_post",   label: "LinkedIn Post",     Icon: Linkedin,        color: "text-blue-500 dark:text-blue-400",  bg: "bg-surface-elevated/50 border-border" },
  { key: "youtube_short",   label: "YouTube Short",     Icon: Youtube,         color: "text-red-500 dark:text-red-400",    bg: "bg-surface-elevated/50 border-border" },
] as const;

type PlatformKey = typeof PLATFORM_CONFIG[number]["key"];

function IdeaCard({ platform, ideas }: { platform: typeof PLATFORM_CONFIG[number]; ideas: ContentIdeas }) {
  const { key, label, Icon, color, bg } = platform;
  const data = ideas[key as PlatformKey];
  if (!data) return null;

  let content = "";
  if (key === "blog_post") {
    const d = data as ContentIdeas["blog_post"];
    content = `${d.title}\n\n${d.hook}\n\nOutline:\n${(d.outline || []).map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
  } else if (key === "twitter_thread") {
    const d = data as ContentIdeas["twitter_thread"];
    content = `${d.hook}\n\n${(d.points || []).join("\n\n")}`;
  } else if (key === "reddit_comment") {
    const d = data as ContentIdeas["reddit_comment"];
    content = `r/${d.subreddit}\n\n${d.angle}`;
  } else if (key === "linkedin_post") {
    const d = data as ContentIdeas["linkedin_post"];
    content = `${d.framing}\n\n${d.cta}`;
  } else if (key === "youtube_short") {
    const d = data as ContentIdeas["youtube_short"];
    content = `${d.title}\n\nHook: ${d.hook}\n\nKey point: ${d.key_point}`;
  }

  return (
    <div className={`border rounded p-3 ${bg} space-y-2`}>
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1.5 text-[10px] font-semibold ${color}`}>
          <Icon size={12} />
          {label}
        </div>
        <CopyButton text={content} />
      </div>

      {key === "blog_post" && (() => {
        const d = data as ContentIdeas["blog_post"];
        return (
          <>
            <p className="text-xs font-semibold text-text-primary">{d.title}</p>
            <p className="text-xs text-text-secondary italic">"{d.hook}"</p>
            {d.outline?.length > 0 && (
              <ul className="text-[11px] text-text-secondary space-y-0.5 list-decimal list-inside">
                {d.outline.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            )}
          </>
        );
      })()}

      {key === "twitter_thread" && (() => {
        const d = data as ContentIdeas["twitter_thread"];
        return (
          <>
            <p className="text-xs text-text-primary font-medium">"{d.hook}"</p>
            {d.points?.map((p, i) => (
              <p key={i} className="text-[11px] text-text-secondary border-l border-sky-500/40 pl-2">{p}</p>
            ))}
          </>
        );
      })()}

      {key === "reddit_comment" && (() => {
        const d = data as ContentIdeas["reddit_comment"];
        return (
          <>
            <span className="text-[10px] px-1.5 py-0.5 bg-surface border border-border text-orange-500 rounded">r/{d.subreddit}</span>
            <p className="text-xs text-text-secondary leading-normal">{d.angle}</p>
          </>
        );
      })()}

      {key === "linkedin_post" && (() => {
        const d = data as ContentIdeas["linkedin_post"];
        return (
          <>
            <p className="text-xs text-text-secondary leading-normal">{d.framing}</p>
            <p className="text-[11px] text-accent font-medium">→ {d.cta}</p>
          </>
        );
      })()}

      {key === "youtube_short" && (() => {
        const d = data as ContentIdeas["youtube_short"];
        return (
          <>
            <p className="text-xs font-semibold text-text-primary">{d.title}</p>
            <p className="text-[11px] text-text-secondary"><span className="text-red-500 font-medium">Hook:</span> {d.hook}</p>
            <p className="text-[11px] text-text-secondary"><span className="text-red-500 font-medium">Key point:</span> {d.key_point}</p>
          </>
        );
      })()}
    </div>
  );
}

export default function ContentIdeaPanel({ clusterId, trendTitle, whyTrending }: Props) {
  const [ideas, setIdeas] = useState<ContentIdeas | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/content/ideas", {
        cluster_id: clusterId,
        trend_title: trendTitle,
        why_trending: whyTrending || "",
      });
      setIdeas(res.data);
      setGenerated(true);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Generation failed — try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent animate-pulse" />
          <div>
            <div className="text-xs font-semibold text-text-primary">Content Idea Generator</div>
            <div className="text-[10px] text-text-secondary">5 platform-specific ideas from this trend</div>
          </div>
        </div>

        {!generated && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white text-xs font-medium px-3.5 py-1.5 rounded transition-all duration-200 disabled:opacity-60"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {loading ? "Generating…" : "Generate Ideas"}
          </button>
        )}
      </div>

      <div className="p-4">
        {!generated && !loading && (
          <div className="text-center py-6 text-text-secondary">
            <Sparkles size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">Click "Generate Ideas" to create 5 platform-specific content ideas for this trend.</p>
            <p className="text-[10px] mt-1 opacity-60">Rate limited to 5 free generations per hour.</p>
          </div>
        )}

        {error && <p className="text-xs text-red-500 py-1">{error}</p>}

        {ideas && (
          <div className="space-y-4">
            {ideas.social_context && (
              <div className="border border-accent/20 rounded-lg p-4 bg-accent/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-accent uppercase tracking-wider">
                    <Sparkles size={12} className="animate-pulse" />
                    Generated Social Media Context
                  </div>
                  <CopyButton text={ideas.social_context} />
                </div>
                <div className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                  {parseMarkdownLinks(ideas.social_context)}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {PLATFORM_CONFIG.map((platform) => (
                <IdeaCard key={platform.key} platform={platform} ideas={ideas} />
              ))}
            </div>

            <button
              onClick={() => { setIdeas(null); setGenerated(false); }}
              className="text-[11px] text-text-secondary hover:text-text-primary transition-colors mt-2"
            >
              ↺ Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
