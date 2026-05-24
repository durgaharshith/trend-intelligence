"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Loader2, Activity, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        if (username.length < 3) {
          setError("Username must be at least 3 characters.");
          setLoading(false);
          return;
        }
        if (!email.includes("@")) {
          setError("Invalid email address.");
          setLoading(false);
          return;
        }
        if (password.length < 8) {
          setError("Password must be at least 8 characters.");
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setLoading(false);
          return;
        }
        await register(username, email, password, confirmPassword);
      }
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get("redirect") || "/dashboard";
      router.push(redirectTo);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        (mode === "login" ? "Invalid username or password." : "Registration failed.")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-text-primary transition-colors duration-200 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <img
              src="/logo-n.png"
              alt="Trend Intelligence Logo"
              className="h-9 w-9 shrink-0 object-contain"
            />
            <span className="text-lg font-bold text-text-primary tracking-tight">
              Trend<span className="text-accent">Intelligence</span>
            </span>
          </div>
          <h1 className="text-base font-bold text-text-primary">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            {mode === "login" ? "Sign in to access your watchlist & alerts." : "Start tracking trends in real time."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-lg p-6 space-y-4 shadow-xl">
          <div>
            <label className="text-[10px] text-text-secondary uppercase tracking-wider block mb-1.5 font-semibold">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. johndoe"
              className="w-full bg-surface-elevated border border-border rounded px-4 py-2.5 text-xs text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-wider block mb-1.5 font-semibold">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-surface-elevated border border-border rounded px-4 py-2.5 text-xs text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] text-text-secondary uppercase tracking-wider block mb-1.5 font-semibold">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
                className="w-full bg-surface-elevated border border-border rounded px-4 py-2.5 pr-10 text-xs text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label className="text-[10px] text-text-secondary uppercase tracking-wider block mb-1.5 font-semibold">Confirm Password</label>
              <input
                type={showPw ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                className="w-full bg-surface-elevated border border-border rounded px-4 py-2.5 text-xs text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-60 text-white font-semibold py-2.5 rounded text-xs transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            {mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {/* Toggle */}
        <p className="text-center text-xs text-text-secondary">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
              setUsername("");
              setEmail("");
              setPassword("");
              setConfirmPassword("");
            }}
            className="text-accent hover:underline font-semibold"
          >
            {mode === "login" ? "Sign up free" : "Sign in"}
          </button>
        </p>

        <p className="text-center">
          <Link href="/" className="text-xs text-text-secondary hover:text-text-primary">
            ← Back to Home
          </Link>
        </p>
      </div>
    </main>
  );
}
