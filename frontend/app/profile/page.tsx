"use client";

import { useState } from "react";
import {
  User, Mail, Key, MessageSquare, Send, CheckCircle, AlertTriangle, Loader2
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { updateProfile, sendFeedback } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ProfilePage() {
  const { user, token, updateUser } = useAuth();

  // Profile fields state
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Feedback field state
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Loading/feedback states
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState(false);
  
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    // Client-side validations
    if (username.trim().length < 3) {
      setProfileError("Username must be at least 3 characters");
      setUpdatingProfile(false);
      return;
    }

    const emailClean = email.trim().toLowerCase();
    if (!emailClean.endsWith("@gmail.com")) {
      setProfileError("Only legitimate Gmail accounts (@gmail.com) are allowed");
      setUpdatingProfile(false);
      return;
    }

    if (password) {
      if (password.length < 8) {
        setProfileError("Password must be at least 8 characters");
        setUpdatingProfile(false);
        return;
      }
      if (password !== confirmPassword) {
        setProfileError("Passwords do not match");
        setUpdatingProfile(false);
        return;
      }
    }

    try {
      const res = await updateProfile({
        username: username.trim(),
        email: emailClean,
        password: password || undefined,
      });

      // Update auth context state
      updateUser({
        user_id: res.user.id,
        username: res.user.username,
        email: res.user.email,
        role: res.user.role,
      }, res.access_token);

      setProfileSuccess(res.message || "Profile updated successfully!");
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      console.error(err);
      setProfileError(err?.response?.data?.detail || "Failed to update profile.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMsg.trim()) {
      setFeedbackError("Feedback message cannot be empty");
      return;
    }

    setSendingFeedback(true);
    setFeedbackSuccess(null);
    setFeedbackError(null);

    try {
      const res = await sendFeedback(feedbackMsg.trim());
      setFeedbackSuccess(res.message || "Feedback sent successfully!");
      setFeedbackMsg("");
      setTimeout(() => setFeedbackSuccess(null), 4000);
    } catch (err: any) {
      console.error(err);
      setFeedbackError(err?.response?.data?.detail || "Failed to send feedback.");
    } finally {
      setSendingFeedback(false);
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-background transition-colors duration-200">
        <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
          {/* Page Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-accent/10 border border-accent/20 p-2 rounded">
                <User size={16} className="text-accent" />
              </div>
              <h1 className="text-xl font-bold text-text-primary">Profile settings</h1>
            </div>
            <p className="text-text-secondary text-xs">
              Manage your credentials, update your account details, and send feedback to developers.
            </p>
          </div>

          {/* Profile Section */}
          <div className="bg-surface border border-border rounded-lg p-6 space-y-6 shadow-sm">
            <div>
              <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
                Account Credentials
              </h2>
              <p className="text-[11px] text-text-secondary mt-1">
                Edit your username, email address, or update your password. Only Gmail accounts are permitted.
              </p>
            </div>

            {profileError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded px-4 py-3 text-xs flex items-center gap-2">
                <AlertTriangle size={14} />
                {profileError}
              </div>
            )}

            {profileSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded px-4 py-3 text-xs flex items-center gap-2">
                <CheckCircle size={14} />
                {profileSuccess}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-text-secondary uppercase">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-surface-elevated border border-border rounded pl-9 pr-4 py-2 text-xs text-text-primary focus:outline-none focus:border-accent transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-text-secondary uppercase">Email (Gmail only)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-surface-elevated border border-border rounded pl-9 pr-4 py-2 text-xs text-text-primary focus:outline-none focus:border-accent transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-text-secondary uppercase">New Password (Optional)</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Leave blank to keep current"
                      className="w-full bg-surface-elevated border border-border rounded pl-9 pr-4 py-2 text-xs text-text-primary focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-text-secondary uppercase">Confirm Password</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full bg-surface-elevated border border-border rounded pl-9 pr-4 py-2 text-xs text-text-primary focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="bg-accent hover:bg-accent/90 disabled:opacity-60 text-white font-semibold py-2 px-4 rounded text-xs transition-colors flex items-center gap-2 shadow-md"
                >
                  {updatingProfile ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Save Credentials"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Feedback Section */}
          <div className="bg-surface border border-border rounded-lg p-6 space-y-6 shadow-sm">
            <div>
              <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <MessageSquare size={14} className="text-accent" /> Share Feedback
              </h2>
              <p className="text-[11px] text-text-secondary mt-1">
                Have questions, feature suggestions, or found a bug? Send us a message directly from your logged-in Gmail.
              </p>
            </div>

            {feedbackError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded px-4 py-3 text-xs flex items-center gap-2">
                <AlertTriangle size={14} />
                {feedbackError}
              </div>
            )}

            {feedbackSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded px-4 py-3 text-xs flex items-center gap-2">
                <CheckCircle size={14} />
                {feedbackSuccess}
              </div>
            )}

            <form onSubmit={handleSendFeedback} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-text-secondary uppercase">Your Feedback Message</label>
                <textarea
                  value={feedbackMsg}
                  onChange={(e) => setFeedbackMsg(e.target.value)}
                  placeholder="Tell us what you think..."
                  rows={4}
                  className="w-full bg-surface-elevated border border-border rounded px-4 py-3 text-xs text-text-primary focus:outline-none focus:border-accent transition-colors resize-none"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sendingFeedback}
                  className="bg-accent hover:bg-accent/90 disabled:opacity-60 text-white font-semibold py-2 px-4 rounded text-xs transition-colors flex items-center gap-2 shadow-md"
                >
                  {sendingFeedback ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      Send Feedback
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
