"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ColdStartBanner({ isBackendDown = false }: { isBackendDown?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (isBackendDown) {
      // Show banner if backend is unreachable
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [isBackendDown]);

  // Auto-hide once backend responds
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get("/health");
        if (res.status === 200) {
          setVisible(false);
          window.location.reload();
        }
      } catch { /* still waking */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="bg-amber-900/80 border border-amber-500/40 backdrop-blur-md rounded-xl px-5 py-3.5 flex items-center gap-3 shadow-2xl">
        <AlertTriangle size={16} className="text-amber-400 shrink-0" />
        <div className="flex-1">
          <p className="text-amber-200 text-sm font-medium">Backend waking up…</p>
          <p className="text-amber-400/70 text-xs">Render free tier sleeps after 15 min — ~30s cold start</p>
        </div>
        <RefreshCw size={14} className="text-amber-400 animate-spin shrink-0" />
      </div>
    </div>
  );
}
