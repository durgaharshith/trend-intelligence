"use client";

import { useState, useEffect } from "react";
import {
  Settings, Loader2, Info, Globe, Cpu, BarChart3, Newspaper,
  CheckCircle, Code, Eye, EyeOff, Key, Save, AlertTriangle
} from "lucide-react";
import {
  fetchGeoConfig, updateGeoConfig, fetchUserSettings, updateUserSettings
} from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";

const GEO_NAMES: Record<string, string> = {
  US: "United States 🇺🇸",
  IN: "India 🇮🇳",
  GB: "United Kingdom 🇬🇧",
  DE: "Germany 🇩🇪",
  JP: "Japan 🇯🇵",
  BR: "Brazil 🇧🇷",
  FR: "France 🇫🇷",
  CA: "Canada 🇨🇦",
  AU: "Australia 🇦🇺",
  KR: "South Korea 🇰🇷",
};

const SOURCES_CONFIG = [
  { id: "hackernews", label: "Tech Community", Icon: Globe, description: "Fetch trending items from main developer and technical communities" },
  { id: "github", label: "Open Source Hub", Icon: Cpu, description: "Monitor trending repositories and source code repositories" },
  { id: "google-trends", label: "Search Interest", Icon: BarChart3, description: "Retrieve dynamic global and region-based search velocities" },
  { id: "newsapi", label: "Tech News", Icon: Newspaper, description: "Index updates from technology and business publication feeds" },
  { id: "devto", label: "Developer Blogs", Icon: Code, description: "Crawl popular engineering and developer blogging networks" },
];

export default function SettingsPage() {
  const [geo, setGeo] = useState<string>("US");
  const [allowed, setAllowed] = useState<string[]>(["US"]);
  const [groqApiKey, setGroqApiKey] = useState("");
  const [activeSources, setActiveSources] = useState<string[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [savingGeo, setSavingGeo] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  
  const [showKey, setShowKey] = useState(false);
  
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const [geoData, settingsData] = await Promise.all([
          fetchGeoConfig(),
          fetchUserSettings(),
        ]);
        setGeo(geoData.geo);
        setAllowed(geoData.allowed);
        setGroqApiKey(settingsData.groq_api_key || "");
        setActiveSources(settingsData.active_sources || []);
      } catch (err) {
        console.error("Failed to load configuration settings", err);
        setError("Unable to connect to settings backend.");
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleGeoChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGeo = e.target.value;
    setSavingGeo(true);
    setGeoMessage(null);
    try {
      const data = await updateGeoConfig(newGeo);
      setGeo(data.geo);
      setGeoMessage(`Region updated to ${GEO_NAMES[data.geo] || data.geo}`);
      setTimeout(() => setGeoMessage(null), 4000);
    } catch (err) {
      console.error("Failed to save region config", err);
      setError("Failed to update trends region.");
    } finally {
      setSavingGeo(false);
    }
  };

  const handleToggleSource = (id: string) => {
    setActiveSources((prev) => {
      const isCurrentlyActive = prev.includes(id);
      if (isCurrentlyActive) {
        // Prevent disabling all sources
        if (prev.length <= 1) {
          setError("At least one data source must remain active.");
          setTimeout(() => setError(null), 3000);
          return prev;
        }
        return prev.filter((s) => s !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSaveUserSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMessage(null);
    setError(null);
    try {
      const res = await updateUserSettings({
        groq_api_key: groqApiKey,
        active_sources: activeSources,
      });
      setSettingsMessage(res.message || "Settings updated successfully.");
      setTimeout(() => setSettingsMessage(null), 4000);
    } catch (err: any) {
      console.error("Failed to save settings", err);
      setError(err?.response?.data?.detail || "Failed to update settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex items-center gap-2 text-text-secondary text-xs">
            <Loader2 size={16} className="animate-spin text-accent" />
            Loading settings...
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-background transition-colors duration-200">
        <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-accent/10 border border-accent/20 p-2 rounded">
                <Settings size={16} className="text-accent" />
              </div>
              <h1 className="text-xl font-bold text-text-primary">Settings</h1>
            </div>
            <p className="text-text-secondary text-xs">
              Configure region filters, customize your LLM API keys, and toggle crawler sources.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded px-4 py-3 text-xs flex items-center gap-2">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {/* Region settings */}
          <div className="bg-surface border border-border rounded-lg p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Google Trends Region</h2>
                <p className="text-[11px] text-text-secondary mt-1">Select the region for Daily Search Trends.</p>
              </div>
              <div className="relative">
                <select
                  value={geo}
                  onChange={handleGeoChange}
                  disabled={savingGeo}
                  className="bg-surface border border-border text-text-primary text-xs rounded px-3 py-1.5 pr-8 focus:outline-none focus:border-accent disabled:opacity-50 appearance-none cursor-pointer min-w-[160px]"
                >
                  {allowed.map((code) => (
                    <option key={code} value={code}>
                      {GEO_NAMES[code] || code}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {savingGeo && (
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Loader2 size={12} className="animate-spin text-accent" />
                Saving region preferences...
              </div>
            )}

            {geoMessage && (
              <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/5 border border-emerald-500/20 px-3 py-2 rounded">
                <CheckCircle size={14} />
                {geoMessage}
              </div>
            )}
          </div>

          {/* User Settings Form */}
          <form onSubmit={handleSaveUserSettings} className="space-y-8">
            {/* Groq API Key */}
            <div className="bg-surface border border-border rounded-lg p-6 space-y-4 shadow-sm">
              <div>
                <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <Key size={14} className="text-accent" /> Custom Groq API Key
                </h2>
                <p className="text-[11px] text-text-secondary mt-1">
                  Optionally provide your personal Groq API key to generate trend summaries and explanations. If left empty, the server's default shared key is used.
                </p>
              </div>

              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={groqApiKey}
                  onChange={(e) => setGroqApiKey(e.target.value)}
                  placeholder="gsk_..."
                  className="w-full bg-surface-elevated border border-border rounded px-4 py-2.5 pr-10 text-xs text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Active Data Sources / Crawlers */}
            <div className="bg-surface border border-border rounded-lg p-6 space-y-4 shadow-sm">
              <div>
                <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Active Crawlers</h2>
                <p className="text-[11px] text-text-secondary mt-1">
                  Enable or disable sources dynamically to control crawl frequency and match your quotas.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {SOURCES_CONFIG.map(({ id, label, Icon, description }) => {
                  const isActive = activeSources.includes(id);
                  return (
                    <div
                      key={id}
                      onClick={() => handleToggleSource(id)}
                      className={`flex items-start gap-3.5 px-4 py-3 rounded-lg border cursor-pointer transition-all duration-200 hover:border-accent/40 select-none
                        ${isActive ? "bg-accent/5 border-accent/20" : "bg-surface-elevated/40 border-border opacity-70"}
                      `}
                    >
                      <div className={`p-1.5 rounded mt-0.5 ${isActive ? "bg-accent/15 text-accent" : "bg-surface border-border text-text-secondary"}`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-text-primary font-bold">{label}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${
                            isActive
                              ? "bg-accent/10 border-accent/30 text-accent"
                              : "bg-surface border-border text-text-secondary"
                          }`}>
                            {isActive ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-secondary mt-0.5">{description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save Buttons & Feedback */}
            <div className="flex items-center justify-between bg-surface border border-border rounded-lg p-4 shadow-sm">
              <span className="text-[10px] text-text-secondary font-mono">
                At least 1 crawler must be enabled.
              </span>
              <button
                type="submit"
                disabled={savingSettings}
                className="bg-accent hover:bg-accent/90 disabled:opacity-60 text-white font-semibold py-2 px-4 rounded text-xs transition-colors flex items-center gap-2 shadow-md"
              >
                {savingSettings ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={13} />
                    Save Settings
                  </>
                )}
              </button>
            </div>

            {settingsMessage && (
              <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/5 border border-emerald-500/20 px-3 py-2 rounded">
                <CheckCircle size={14} />
                {settingsMessage}
              </div>
            )}
          </form>

          {/* Info card */}
          <div className="bg-surface border border-border rounded-lg p-6 text-xs text-text-secondary space-y-3">
            <div className="font-semibold text-text-primary flex items-center gap-2 uppercase tracking-wider text-[10px]">
              <Info size={12} className="text-accent" />
              Real-time Scheduler Info
            </div>
            <ul className="space-y-1.5 text-[11px] list-disc list-inside text-text-secondary leading-relaxed">
              <li>When you are logged in, system runs active crawling on enabled sources dynamically.</li>
              <li>When you log out or disconnect all WebSocket connections, the crawler enters a <strong>standby mode (2-hour slow poll)</strong> to preserve database limits.</li>
              <li>Changing crawlers immediately triggers an on-demand poll to seed the cache with fresh data.</li>
              <li>Personal Groq API Key overrides can be disabled by clearing the field and saving.</li>
            </ul>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
