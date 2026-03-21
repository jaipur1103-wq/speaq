"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import ScenarioCard from "@/components/ScenarioCard";
import SettingsBar from "@/components/SettingsBar";
import SpeaqLogo from "@/components/SpeaqLogo";
import {
  getSettings, saveSettings, getSavedScenarios, saveGeneratedScenario,
  deleteSavedScenario, getCustomScenarios, deleteCustomScenario, getFavoriteIds,
} from "@/lib/storage";
import { i18n } from "@/lib/i18n";
import type { AppSettings, Language, Scenario } from "@/types";

export default function Home() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);
  const [customScenarios, setCustomScenarios] = useState<Scenario[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [dark, setDark] = useState(false);

  const tr = i18n[settings.language ?? "en"];

  const reload = () => {
    setSavedScenarios(getSavedScenarios());
    setCustomScenarios(getCustomScenarios());
    setFavoriteIds(getFavoriteIds());
  };

  useEffect(() => {
    reload();
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(prefersDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const handleSettingsChange = (s: AppSettings) => {
    setSettings(s);
    saveSettings(s);
  };

  const toggleLang = () => {
    const newLang: Language = (settings.language ?? "en") === "en" ? "ja" : "en";
    const newSettings = { ...settings, language: newLang };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const generateScenario = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: settings.topic,
          difficulty: settings.difficulty,
          industry: settings.industry,
          personaStyle: settings.personaStyle,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const scenario: Scenario = {
        id: "gen_" + Date.now(),
        category: data.category, title: data.title, brief: data.brief,
        opener: data.opener, keyPhrases: data.keyPhrases,
        difficulty: data.difficulty, industry: data.industry,
        personaStyle: data.personaStyle, personaName: data.personaName,
        personaRole: data.personaRole,
      };
      saveGeneratedScenario(scenario);
      reload();
    } catch {
      setError(tr.generateFailed);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteSaved = (id: string) => { deleteSavedScenario(id); reload(); };
  const handleDeleteCustom = (id: string) => { deleteCustomScenario(id); reload(); };

  const allScenarios = [...customScenarios, ...savedScenarios];
  const favoriteScenarios = allScenarios.filter((s) => favoriteIds.includes(s.id));
  const nonFavoriteScenarios = allScenarios.filter((s) => !favoriteIds.includes(s.id));

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 88px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <SpeaqLogo />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={toggleLang}
            style={{
              padding: "6px 10px", borderRadius: 20,
              background: "var(--surface)", border: "1px solid var(--border)",
              color: "var(--accent)", fontSize: 12, fontWeight: 700,
              cursor: "pointer", boxShadow: "var(--shadow-sm)",
            }}
          >
            {(settings.language ?? "en") === "en" ? "JA" : "EN"}
          </button>
          <button
            onClick={() => setDark(!dark)}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "var(--surface)", border: "none",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--shadow-sm)", color: "var(--text-secondary)",
            }}
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <SettingsBar settings={settings} onChange={handleSettingsChange} />
      </div>

      {/* Generate + Create buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button
          onClick={generateScenario}
          disabled={generating}
          style={{
            flex: 1, padding: "15px", borderRadius: 14,
            background: generating ? "var(--surface2)" : "var(--accent)",
            color: generating ? "var(--text-muted)" : "#FFFFFF",
            border: "none", fontWeight: 700, fontSize: 15,
            cursor: generating ? "not-allowed" : "pointer",
            transition: "all 0.15s", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8,
            boxShadow: generating ? "none" : "0 4px 14px rgba(0, 102, 204, 0.3)",
            letterSpacing: "-0.01em",
          }}
        >
          {generating ? <><SpinnerIcon />{tr.generating}</> : <>{tr.generateScenario}</>}
        </button>
        <button
          onClick={() => router.push("/create")}
          style={{
            padding: "15px 18px", borderRadius: 14,
            background: "var(--surface)", color: "var(--text)",
            border: "1px solid var(--border)", fontWeight: 700, fontSize: 15,
            cursor: "pointer", transition: "all 0.15s",
            boxShadow: "var(--shadow-sm)", whiteSpace: "nowrap",
          }}
        >
          {tr.createScenario}
        </button>
      </div>

      {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}

      {allScenarios.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "56px 24px", color: "var(--text-muted)",
          background: "var(--surface)", borderRadius: 18, marginTop: 20, boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🎯</div>
          <p style={{ fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, fontSize: 16 }}>
            {tr.noScenarios}
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>{tr.noScenariosDesc}</p>
        </div>
      ) : (
        <div style={{ marginTop: 20 }}>
          {favoriteScenarios.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 10 }}>
                {tr.favorites}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {favoriteScenarios.map((s) => (
                  <ScenarioCard key={s.id} scenario={s} isFavorite={true}
                    lang={settings.language}
                    onFavoriteChange={reload}
                    onDelete={s.id.startsWith("c_") ? handleDeleteCustom : handleDeleteSaved} />
                ))}
              </div>
            </div>
          )}
          {nonFavoriteScenarios.length > 0 && (
            <div>
              {favoriteScenarios.length > 0 && (
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 10 }}>
                  {tr.allScenarios}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {nonFavoriteScenarios.map((s) => (
                  <ScenarioCard key={s.id} scenario={s} isFavorite={false}
                    lang={settings.language}
                    onFavoriteChange={reload}
                    onDelete={s.id.startsWith("c_") ? handleDeleteCustom : handleDeleteSaved} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ animation: "spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
