"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  adminFetchUsers,
  adminUpdateUser,
  adminDeleteUser,
  type AdminUser,
  type AdminUserUpdateData
} from "@/lib/api";
import { SOURCE_LABELS } from "@/lib/types";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Shield, Edit, Trash2, Search, X, Loader2, Check,
  UserCheck, UserX, Settings, Calendar, Key, CheckSquare, Square
} from "lucide-react";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit modal state
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("user");
  const [editActiveSources, setEditActiveSources] = useState<string[]>([]);
  const [editIsActive, setEditIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete confirm state
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && user && user.role !== "admin") {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminFetchUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load users list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "admin") {
      loadUsers();
    }
  }, [user]);

  if (authLoading || !user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-accent" size={28} />
        <span className="text-xs text-text-secondary">Checking admin access permissions...</span>
      </div>
    );
  }

  const handleEditClick = (u: AdminUser) => {
    setEditingUser(u);
    setEditUsername(u.username || "");
    setEditEmail(u.email);
    setEditPassword("");
    setEditRole(u.role);
    setEditActiveSources(u.active_sources ? u.active_sources.split(",") : []);
    setEditIsActive(u.is_active);
    setError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setSaving(true);
      setError(null);
      
      const payload: AdminUserUpdateData = {
        username: editUsername,
        email: editEmail,
        role: editRole,
        active_sources: editActiveSources,
        is_active: editIsActive
      };

      if (editPassword.trim() !== "") {
        payload.password = editPassword;
      }

      await adminUpdateUser(editingUser.id, payload);
      setSuccess(`Account '${editUsername}' updated successfully.`);
      setEditingUser(null);
      loadUsers();

      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to update user profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (u: AdminUser) => {
    setDeletingUser(u);
    setError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    try {
      setDeleting(true);
      setError(null);
      await adminDeleteUser(deletingUser.id);
      setSuccess(`User account deleted successfully.`);
      setDeletingUser(null);
      loadUsers();

      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete user account");
    } finally {
      setDeleting(false);
    }
  };

  const toggleSource = (source: string) => {
    if (editActiveSources.includes(source)) {
      setEditActiveSources(editActiveSources.filter((s) => s !== source));
    } else {
      setEditActiveSources([...editActiveSources, source]);
    }
  };

  // Filters
  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      u.username?.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const totalUsersCount = users.length;
  const adminUsersCount = users.filter((u) => u.role === "admin").length;
  const suspendedUsersCount = users.filter((u) => !u.is_active).length;

  return (
    <ProtectedRoute>
      <main className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-16">
        
        {/* Header Title */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-accent/15 border border-accent/25 flex items-center justify-center">
              <Shield className="text-accent" size={15} />
            </div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">Admin User Control Panel</h1>
          </div>
          <p className="text-xs text-text-secondary">
            Perform global user administration, adjust source parameters, configure roles, and change system access.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-surface border border-border rounded flex flex-col gap-1 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Total Users</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-text-primary">{totalUsersCount}</span>
              <span className="text-[10px] text-text-secondary">Registered accounts</span>
            </div>
          </div>
          <div className="p-4 bg-surface border border-border rounded flex flex-col gap-1 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Administrators</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-accent">{adminUsersCount}</span>
              <span className="text-[10px] text-text-secondary">Total admins</span>
            </div>
          </div>
          <div className="p-4 bg-surface border border-border rounded flex flex-col gap-1 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Suspended Accounts</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-red-500">{suspendedUsersCount}</span>
              <span className="text-[10px] text-text-secondary">Deactivated status</span>
            </div>
          </div>
        </div>

        {/* Error/Success Banners */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-xs">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded text-xs flex items-center gap-1.5">
            <Check size={14} />
            <span>{success}</span>
          </div>
        )}

        {/* User Search and List Panel */}
        <div className="bg-surface border border-border rounded shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-elevated/20">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
              <input
                type="text"
                placeholder="Search username or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-border rounded bg-surface text-text-primary text-xs focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <button
              onClick={loadUsers}
              className="px-3 py-2 border border-border rounded text-xs font-semibold hover:bg-surface-elevated text-text-primary flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              Refresh List
            </button>
          </div>

          {/* Table container */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-2">
                <Loader2 className="animate-spin text-accent" size={24} />
                <span className="text-xs text-text-secondary">Loading system user list...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-xs text-text-secondary">
                No users found.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-elevated/40 border-b border-border text-[10px] uppercase font-bold text-text-secondary tracking-wider">
                    <th className="p-4">User Info</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Active Sources</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredUsers.map((u) => {
                    const sources = u.active_sources ? u.active_sources.split(",") : [];
                    const isSelf = user.user_id === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-surface-elevated/20 transition-colors">
                        {/* User Identity */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold uppercase text-[10px]">
                              {u.username ? u.username.slice(0, 2) : "US"}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-text-primary truncate">
                                {u.username} {isSelf && <span className="text-[10px] font-normal text-accent bg-accent/10 px-1.5 py-0.5 rounded ml-1">You</span>}
                              </span>
                              <span className="text-[10px] text-text-secondary truncate">{u.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* User Role */}
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.role === "admin"
                              ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                              : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                          }`}>
                            <Shield size={10} />
                            {u.role}
                          </span>
                        </td>

                        {/* Active Sources */}
                        <td className="p-4 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {sources.length === 0 ? (
                              <span className="text-text-secondary italic text-[10px]">None</span>
                            ) : (
                              sources.map((s) => (
                                <span
                                  key={s}
                                  className="px-1.5 py-0.5 bg-surface border border-border text-text-secondary rounded text-[9px] font-semibold"
                                >
                                  {SOURCE_LABELS[s] || s}
                                </span>
                              ))
                            )}
                          </div>
                        </td>

                        {/* Access Status */}
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 font-bold ${
                            u.is_active ? "text-emerald-500" : "text-red-500"
                          }`}>
                            {u.is_active ? (
                              <>
                                <UserCheck size={12} />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <UserX size={12} />
                                <span>Suspended</span>
                              </>
                            )}
                          </span>
                        </td>

                        {/* User actions */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditClick(u)}
                              className="p-1.5 rounded hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                              title="Edit user settings"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(u)}
                              disabled={isSelf}
                              className={`p-1.5 rounded hover:bg-red-500/10 text-text-secondary hover:text-red-500 transition-colors ${
                                isSelf ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                              }`}
                              title="Delete user account"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* User Edit Modal */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-surface border border-border rounded-lg shadow-xl overflow-hidden animate-scale-in">
              <div className="p-4 border-b border-border flex justify-between items-center bg-surface-elevated/40">
                <div className="flex items-center gap-1.5">
                  <Settings size={14} className="text-accent" />
                  <h3 className="text-xs font-bold text-text-primary">Edit User Settings</h3>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
                {/* Username Input */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Username</label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full p-2 border border-border rounded bg-surface text-text-primary text-xs focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                {/* Email Input */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Email Address (Gmail only)</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full p-2 border border-border rounded bg-surface text-text-primary text-xs focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-bold text-text-secondary tracking-wider flex items-center gap-1">
                      <Key size={10} /> Change Password
                    </label>
                    <span className="text-[9px] text-text-secondary italic">Leave blank to keep unchanged</span>
                  </div>
                  <input
                    type="password"
                    placeholder="New password (min 8 chars)"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full p-2 border border-border rounded bg-surface text-text-primary text-xs focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                {/* Role and Status options */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">User Role</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full p-2 border border-border rounded bg-surface text-text-primary text-xs focus:outline-none focus:border-accent transition-colors"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">System Status</label>
                    <select
                      value={editIsActive ? "active" : "suspended"}
                      onChange={(e) => setEditIsActive(e.target.value === "active")}
                      className="w-full p-2 border border-border rounded bg-surface text-text-primary text-xs focus:outline-none focus:border-accent transition-colors"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                {/* Active Sources selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-text-secondary tracking-wider flex items-center gap-1">
                    <CheckSquare size={10} /> Allowed Information Sources
                  </label>
                  <div className="p-3 border border-border rounded bg-surface-elevated/10 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(SOURCE_LABELS).map(([key, label]) => {
                      const isSelected = editActiveSources.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleSource(key)}
                          className="flex items-center gap-2 text-left text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare size={14} className="text-accent" />
                          ) : (
                            <Square size={14} className="text-border" />
                          )}
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-3.5 py-2 border border-border rounded text-xs font-semibold hover:bg-surface-elevated text-text-primary transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-3.5 py-2 rounded bg-accent hover:bg-accent/90 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {saving && <Loader2 className="animate-spin" size={12} />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-surface border border-border rounded-lg shadow-xl overflow-hidden animate-scale-in">
              <div className="p-4 border-b border-border flex justify-between items-center bg-red-500/10">
                <h3 className="text-xs font-bold text-red-500">Confirm User Deletion</h3>
                <button
                  onClick={() => setDeletingUser(null)}
                  className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-text-secondary">
                  Are you sure you want to permanently delete the user account <strong>{deletingUser.username}</strong> ({deletingUser.email})?
                  This action cannot be undone and will delete all user preferences, watchlist, and custom settings.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingUser(null)}
                    className="px-3.5 py-2 border border-border rounded text-xs font-semibold hover:bg-surface-elevated text-text-primary transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={deleting}
                    className="px-3.5 py-2 rounded bg-red-500 hover:bg-red-600 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {deleting && <Loader2 className="animate-spin" size={12} />}
                    <span>Delete User</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </ProtectedRoute>
  );
}
