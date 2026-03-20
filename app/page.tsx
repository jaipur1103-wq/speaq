"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ScenarioCard from "@/components/ScenarioCard";
import SettingsBar from "@/components/SettingsBar";
import {
  getSettings,
  saveSettings,
  getSavedScenarios,
  saveGeneratedScenario,
  deleteSavedScenario,
  getCustomScenarios,
  deleteCustomScenario,
} from "@/lib/storage";
import type { AppSettings, Scenario } from "@/types";

export default function Home() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);
  const [customScenarios, setCustomScenarios] = useState<Scenario[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setSavedScenarios(getSavedScenarios());
    setCustomScenarios(getCustomScenarios());
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

  const generateScenario = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          difficulty: settings.difficulty,
          industry: settings.industry,
          personaStyle: settings.personaStyle,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const scenario: Scenario = {
        id: "gen_" + Date.now(),
        category: data.category,
        title: data.title,
        brief: data.brief,
        opener: data.opener,
        keyPhrases: data.keyPhrases,
        difficulty: data.difficulty,
        industry: data.industry,
        personaStyle: data.personaStyle,
        personaName: data.personaName,
        personaRole: data.personaRole,
      };
      saveGeneratedScenario(scenario);
      setSavedScenarios(getSavedScenarios());
    } catch {
      setError("Failed to generate scenario. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteSaved = (id: string) => {
    deleteSavedScenario(id);
    setSavedScenarios(getSavedScenarios());
  };

  const handleDeleteCustom = (id: string) => {
    deleteCustomScenario(id);
    setCustomScenarios(getCustomScenarios());
  };

  const allScenarios = [...customScenarios, ...savedScenarios];

  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "40px 16px 100px",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
            Speaq
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0", fontWeight: 400 }}>
            Business English Practice
          </p>
        </div>
        <button
          onClick={() => setDark(!dark)}
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "var(--surface)",
            border: "none",
            cursor: "pointer", fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "var(--shadow-sm)",
            transition: "box-shadow 0.15s",
          }}
          aria-label="Toggle dark mode"
        >
          {dark ? "☀️" : "🌙"}
        </button>
      </div>

      {/* Nav tabs */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 24,
        background: "var(--surface2)", borderRadius: 12, padding: 4,
      }}>
        <NavTab active>🎙 Practice</NavTab>
        <NavTab onClick={() => router.push("/notebook")}>📒 Notebook</NavTab>
      </div>

      <div style={{ marginBottom: 20 }}>
        <SettingsBar settings={settings} onChange={handleSettingsChange} />
      </div>

      <button
        onClick={generateScenario}
        disabled={generating}
        style={{
          width: "100%",
          padding: "15px",
          borderRadius: 14,
          background: generating ? "var(--surface2)" : "var(--accent)",
          color: generating ? "var(--text-muted)" : "#FFFFFF",
          border: "none",
          fontWeight: 700,
          fontSize: 15,
          cursor: generating ? "not-allowed" : "pointer",
          marginBottom: 10,
          transition: "all 0.15s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: generating ? "none" : "0 4px 14px rgba(0, 102, 204, 0.3)",
          letterSpacing: "-0.01em",
        }}
      >
        {generating ? (
          <>
            <SpinnerIcon />
            Generating scenario...
          </>
        ) : (
          <>✨ Generate New Scenario</>
        )}
      </button>

      {error && (
        <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>
      )}

      {allScenarios.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "56px 24px",
            color: "var(--text-muted)",
            background: "var(--surface)",
            borderRadius: 18,
            marginTop: 20,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>🎯</div>
          <p style={{ fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, fontSize: 16 }}>
            No scenarios yet
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>
            Hit &ldquo;Generate New Scenario&rdquo; to create your first practice session.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          {allScenarios.map((s) => (
            <ScenarioCard
              key={s.id}
              scenario={s}
              onDelete={s.id.startsWith("c_") ? handleDeleteCustom : handleDeleteSaved}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function NavTab({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: "8px 0", borderRadius: 9, border: "none",
        background: active ? "var(--surface)" : "transparent",
        color: active ? "var(--text)" : "var(--text-muted)",
        fontWeight: active ? 700 : 400,
        fontSize: 13, cursor: "pointer",
        boxShadow: active ? "var(--shadow-sm)" : "none",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
