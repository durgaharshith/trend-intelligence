"use client";

import { useState } from "react";
import { updateSubreddits, resetSubreddits } from "@/lib/api";
import type { SubredditConfig } from "@/lib/types";
import { X, Plus, RotateCcw, Save, Loader2, Monitor, TrendingUp, Gamepad2, Newspaper, FlaskConical, Clapperboard, Globe, Pin } from "lucide-react";
import type { ElementType } from "react";

interface Props {
  config: SubredditConfig;
  onSaved: (subreddits: string[]) => void;
}

export default function SubredditSelector({ config, onSaved }: Props) {
  const [subreddits, setSubreddits] = useState<string[]>(config.subreddits);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [saved, setSaved] = useState(false);

  function addSubreddit(sub: string) {
    const clean = sub.trim().replace(/^r\//i, "");
    if (!clean || subreddits.includes(clean)) return;
    setSubreddits((prev) => [...prev, clean]);
  }

  function removeSubreddit(sub: string) {
    setSubreddits((prev) => prev.filter((s) => s !== sub));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSubreddit(input);
      setInput("");
    }
  }

  async function handleSave() {
    if (!subreddits.length) return;
    setSaving(true);
    try {
      await updateSubreddits(subreddits);
      onSaved(subreddits);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      const res = await resetSubreddits();
      setSubreddits(res.subreddits);
      onSaved(res.subreddits);
    } catch { /* ignore */ } finally {
      setResetting(false);
    }
  }

  const CATEGORY_ICONS: Record<string, ElementType> = {
    tech: Monitor, finance: TrendingUp, gaming: Gamepad2,
    news: Newspaper, science: FlaskConical, entertainment: Clapperboard, all: Globe,
  };

  return (
    <div className="space-y-5">
      {/* Current tags */}
      <div>
        <label className="text-xs text-slate-400 block mb-2">Active Subreddits</label>
        <div className="flex flex-wrap gap-2 min-h-[40px] bg-slate-900 border border-slate-700 rounded-xl p-3">
          {subreddits.map((sub) => (
            <span
              key={sub}
              className="flex items-center gap-1 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs px-2.5 py-1 rounded-full"
            >
              r/{sub}
              <button onClick={() => removeSubreddit(sub)} className="text-blue-400 hover:text-red-400 ml-0.5">
                <X size={10} />
              </button>
            </span>
          ))}
          <input
            type="text"
            placeholder="Add subreddit…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (input.trim()) { addSubreddit(input); setInput(""); } }}
            className="flex-1 min-w-[140px] bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
          />
        </div>
        <p className="text-xs text-slate-600 mt-1">Press Enter or comma to add. Changes take effect on the next poll.</p>
      </div>

      {/* Presets */}
      <div>
        <label className="text-xs text-slate-400 block mb-2">Quick Presets</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(config.presets).map(([category, subs]) => {
            const CategoryIcon = CATEGORY_ICONS[category] || Pin;
            return (
            <button
              key={category}
              onClick={() => subs.forEach(addSubreddit)}
              className="flex items-center gap-2 text-left px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl hover:border-slate-500 transition-colors"
            >
              <CategoryIcon size={16} className="text-slate-400" />
              <div>
                <div className="text-xs font-medium text-slate-200 capitalize">{category}</div>
                <div className="text-xs text-slate-500">{subs.length} subreddits</div>
              </div>
            </button>
          );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving || subreddits.length === 0}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? "Saved!" : "Save"}
        </button>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 px-3 py-2 rounded-lg text-sm transition-colors border border-slate-700 hover:border-slate-500"
        >
          {resetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
          Reset to default
        </button>
      </div>
    </div>
  );
}
