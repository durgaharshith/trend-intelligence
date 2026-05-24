"use client";

import { useAuth } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      if (pathname !== "/login") {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-accent" size={28} />
        <span className="text-xs text-text-secondary">Verifying credentials...</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
