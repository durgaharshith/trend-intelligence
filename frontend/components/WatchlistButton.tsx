"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Bookmark, BookmarkCheck, Loader2, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  clusterId: string;
  clusterTitle: string;
  clusterKeyword?: string;
  className?: string;
}

export default function WatchlistButton({
  clusterId,
  clusterTitle,
  clusterKeyword = "",
  className = "",
}: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [watching, setWatching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [watchlistId, setWatchlistId] = useState<number | null>(null);

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) {
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      if (!watching) {
        const res = await api.post(
          "/api/watchlist/",
          { cluster_id: clusterId, cluster_title: clusterTitle, cluster_keyword: clusterKeyword },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        setWatchlistId(res.data.id);
        setWatching(true);
      } else if (watchlistId) {
        await api.delete(`/api/watchlist/${watchlistId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setWatchlistId(null);
        setWatching(false);
      }
    } catch { /* ignore 409 duplicate */ } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); router.push("/login"); }}
        className={`flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors ${className}`}
        title="Login to watch this trend"
      >
        <LogIn size={13} />
        Watch
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-1.5 text-xs transition-colors ${
        watching
          ? "text-blue-400 hover:text-red-400"
          : "text-slate-500 hover:text-blue-400"
      } ${className}`}
      title={watching ? "Remove from watchlist" : "Add to watchlist"}
    >
      {loading ? (
        <Loader2 size={13} className="animate-spin" />
      ) : watching ? (
        <BookmarkCheck size={13} />
      ) : (
        <Bookmark size={13} />
      )}
      {watching ? "Watching" : "Watch"}
    </button>
  );
}
