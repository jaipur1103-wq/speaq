"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCustomScenario, getSettings, saveSettings } from "@/lib/storage";
import { i18n } from "@/lib/i18n";
import type { Difficulty, Language, Scenario } from "@/types";

export default function CreatePage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>(() => getSettings().language ?? "en");
  const tr = i18n[lang];

  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const toggleLang = () => {
    const newLang: Language = lang === "en" ? "ja" : "en";
    setLang(newLang);
    const s = getSettings();
    saveSettings({ ...s, language: newLang });
  };

  const handleCreate = async () => {
    if (!description.trim()) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/create-from-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), difficulty }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const scenario: Scenario = {
        id: "c_" + Date.now(),
        category: data.category,
        title: data.title,
        brief: data.brief,
        opener: data.opener,
        keyPhrases: data.keyPhrases ?? [],
        difficulty: data.difficulty,
        industry: data.industry ?? "general",
        personaStyle: data.personaStyle ?? "neutral",
        personaName: data.personaName,
        personaRole: data.personaRole,
      };
      saveCustomScenario(scenario);
      router.push("/");
    } catch {
      setError(tr.createFailed);
    } finally {
      setGenerating(false);
    }
  };

  const difficulties: { value: Difficulty; label: string }[] = [
    { value: "beginner", label: tr.beginner },
    { value: "intermediate", label: tr.intermediate },
    { value: "advanced", label: tr.advanced },
  ];

  return (
    <main style={{ maxWidth: 640, width: "100%", margin: "0 auto", padding: "40px 16px 100px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <button
          onClick={() => router.push("/")}
          style={{
            background: "var(--surface2)", border: "none", borderRadius: 10,
            padding: "6px 12px", cursor: "pointer",
            color: "var(--text-secondary)", fontSize: 13, fontWeight: 600,
          }}
        >
          {tr.back}
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
            {tr.createTitle}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>
            {tr.createSubtitle}
          </p>
        </div>
        <button
          onClick={toggleLang}
          style={{
            padding: "6px 10px", borderRadius: 20,
            background: "var(--surface)", border: "1px solid var(--border)",
            color: "var(--accent)", fontSize: 12, fontWeight: 700,
            cursor: "pointer", boxShadow: "var(--shadow-sm)",
          }}
        >
          {lang === "en" ? "JA" : "EN"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Description */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
            {tr.descriptionLabel}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={tr.descriptionPlaceholder}
            rows={6}
            style={{
              width: "100%", padding: "14px 16px", borderRadius: 14,
              border: "1.5px solid var(--border)",
              background: "var(--surface)", color: "var(--text)",
              fontSize: 15, fontFamily: "inherit", outline: "none",
              boxSizing: "border-box", resize: "none", lineHeight: 1.6,
            }}
          />
        </div>

        {/* Difficulty */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
            {tr.difficultyLabel}
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {difficulties.map((d) => (
              <button
                key={d.value}
                onClick={() => setDifficulty(d.value)}
                style={{
                  flex: 1, padding: "10px", borderRadius: 12,
                  border: difficulty === d.value ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                  background: difficulty === d.value ? "var(--accent-bg)" : "transparent",
                  color: difficulty === d.value ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: 14, fontWeight: difficulty === d.value ? 700 : 400,
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p style={{ color: "var(--red)", fontSize: 13, marginTop: 16 }}>{error}</p>}

      <button
        onClick={handleCreate}
        disabled={generating || !description.trim()}
        style={{
          width: "100%", padding: "15px", marginTop: 32,
          borderRadius: 14,
          background: generating || !description.trim() ? "var(--surface2)" : "linear-gradient(135deg, #007AFF, #0055CC)",
          color: generating || !description.trim() ? "var(--text-muted)" : "#FFFFFF",
          border: "none", fontWeight: 700, fontSize: 15,
          cursor: generating || !description.trim() ? "not-allowed" : "pointer",
          boxShadow: generating || !description.trim() ? "none" : "0 4px 14px rgba(0,102,204,0.3)",
          letterSpacing: "-0.01em", transition: "all 0.15s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {generating ? <><SpinnerIcon />{tr.generating}</> : tr.saveScenario}
      </button>
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
