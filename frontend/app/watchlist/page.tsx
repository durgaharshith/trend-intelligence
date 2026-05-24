"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { api } from "@/lib/api";
import {
  Bookmark, Trash2, Loader2, ExternalLink,
  LogIn, ArrowRight, Clock,
} from "lucide-react";
import Link from "next/link";

interface WatchlistItem {
  id: number;
  cluster_id: string;
  cluster_title: string;
  cluster_keyword: string;
  added_at: string;
}

export default function WatchlistPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchWatchlist();
  }, [user, authLoading]);

  async function fetchWatchlist() {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/api/watchlist/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(res.data.watchlist);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id: number) {
    setRemoving(id);
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/api/watchlist/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      /* ignore */
    } finally {
      setRemoving(null);
    }
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-background transition-colors duration-200">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-accent/10 border border-accent/20 p-2 rounded">
              <Bookmark size={16} className="text-accent" />
            </div>
            <h1 className="text-xl font-bold text-text-primary">Watchlist</h1>
            {items.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 bg-accent/5 border border-accent/10 text-accent rounded font-medium">
                {items.length} {items.length === 1 ? "trend" : "trends"}
              </span>
            )}
          </div>
          <p className="text-text-secondary text-xs">
            Trends you're tracking. Get quick access to the clusters that matter to you.
          </p>
        </div>



        {/* Loading */}
        {loading && user && (
          <div className="flex items-center justify-center py-20 gap-2">
            <Loader2 className="animate-spin text-accent" size={24} />
            <span className="text-text-secondary text-xs">Loading watchlist…</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && user && items.length === 0 && (
          <div className="bg-surface border border-border rounded-lg p-8 text-center space-y-4">
            <Bookmark size={28} className="text-text-secondary mx-auto" />
            <p className="text-text-primary text-xs">Your watchlist is empty.</p>
            <p className="text-text-secondary text-xs">
              Click the <strong className="text-text-primary">Watch</strong> button on any trend detail page to add it here.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-accent hover:underline text-xs transition-colors"
            >
              Browse trends
              <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {/* Watchlist items */}
        {!loading && items.length > 0 && (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-surface border border-border rounded p-4 flex items-center justify-between gap-4 hover:border-accent/40 transition-all duration-200 group"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/trends/${encodeURIComponent(item.cluster_id)}`}
                    className="text-xs font-semibold text-text-primary hover:text-accent transition-colors duration-200 line-clamp-1 flex items-center gap-1.5"
                  >
                    {item.cluster_title}
                    <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      Added {timeAgo(item.added_at)}
                    </span>
                    {item.cluster_keyword && (
                      <span className="px-1.5 py-0.5 bg-surface-elevated border border-border text-text-secondary rounded text-[9px]">
                        {item.cluster_keyword}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleRemove(item.id)}
                  disabled={removing === item.id}
                  className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-200/50"
                  title="Remove from watchlist"
                >
                  {removing === item.id ? (
                    <Loader2 size={12} className="animate-spin text-red-500" />
                  ) : (
                    <Trash2 size={12} />
                  )}
                  <span className="hidden sm:inline">Remove</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      </main>
    </ProtectedRoute>
  );
}
