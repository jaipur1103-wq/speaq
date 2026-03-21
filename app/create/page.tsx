"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCustomScenario } from "@/lib/storage";
import type { Difficulty, Industry, Scenario } from "@/types";

const CATEGORIES = ["Negotiation", "Sales", "1-on-1", "Cross-team", "Presentation", "Client Meeting", "Performance Review", "Crisis Management", "Partnership", "Hiring"];

export default function CreatePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    brief: "",
    personaName: "",
    personaRole: "",
    opener: "",
    keyPhrases: "",
    difficulty: "intermediate" as Difficulty,
    industry: "general" as Industry,
    category: "1-on-1",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.brief.trim()) e.brief = "Brief is required";
    if (!form.personaName.trim()) e.personaName = "Name is required";
    if (!form.opener.trim()) e.opener = "Opening line is required";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    const scenario: Scenario = {
      id: "c_" + Date.now(),
      title: form.title.trim(),
      brief: form.brief.trim(),
      personaName: form.personaName.trim() || "Alex",
      personaRole: form.personaRole.trim() || "Colleague",
      opener: form.opener.trim(),
      keyPhrases: form.keyPhrases.split(",").map((p) => p.trim()).filter(Boolean),
      difficulty: form.difficulty,
      industry: form.industry,
      category: form.category,
      personaStyle: "neutral",
    };
    saveCustomScenario(scenario);
    router.push("/");
  };

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "40px 16px 100px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <button
          onClick={() => router.push("/")}
          style={{
            background: "var(--surface2)", border: "none", borderRadius: 10,
            padding: "6px 12px", cursor: "pointer",
            color: "var(--text-secondary)", fontSize: 13, fontWeight: 600,
          }}
        >
          ← Back
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
            Create Scenario
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "2px 0 0" }}>
            Build your own practice situation
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Title */}
        <Field label="Title *" error={errors.title}>
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Budget Review with CFO"
            style={inputStyle(!!errors.title)}
          />
        </Field>

        {/* Brief */}
        <Field label="Situation & Goal *" error={errors.brief}>
          <textarea
            value={form.brief}
            onChange={(e) => set("brief", e.target.value)}
            placeholder="Describe the situation and what you need to achieve..."
            rows={3}
            style={{ ...inputStyle(!!errors.brief), resize: "vertical" }}
          />
        </Field>

        {/* Persona */}
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Counterpart Name *" error={errors.personaName} style={{ flex: 1 }}>
            <input
              value={form.personaName}
              onChange={(e) => set("personaName", e.target.value)}
              placeholder="e.g. Sarah"
              style={inputStyle(!!errors.personaName)}
            />
          </Field>
          <Field label="Their Role" style={{ flex: 1 }}>
            <input
              value={form.personaRole}
              onChange={(e) => set("personaRole", e.target.value)}
              placeholder="e.g. CFO"
              style={inputStyle(false)}
            />
          </Field>
        </div>

        {/* Opener */}
        <Field label="Their Opening Line *" error={errors.opener}>
          <textarea
            value={form.opener}
            onChange={(e) => set("opener", e.target.value)}
            placeholder="What does the counterpart say first?"
            rows={2}
            style={{ ...inputStyle(!!errors.opener), resize: "vertical" }}
          />
        </Field>

        {/* Key phrases */}
        <Field label="Key Phrases (comma separated)">
          <input
            value={form.keyPhrases}
            onChange={(e) => set("keyPhrases", e.target.value)}
            placeholder="e.g. cost reduction, ROI, Q3 targets"
            style={inputStyle(false)}
          />
        </Field>

        {/* Category + Difficulty + Industry */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Field label="Category" style={{ flex: 1, minWidth: 140 }}>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} style={selectStyle}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Difficulty" style={{ flex: 1, minWidth: 120 }}>
            <select value={form.difficulty} onChange={(e) => set("difficulty", e.target.value as Difficulty)} style={selectStyle}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </Field>
          <Field label="Industry" style={{ flex: 1, minWidth: 120 }}>
            <select value={form.industry} onChange={(e) => set("industry", e.target.value as Industry)} style={selectStyle}>
              <option value="general">General</option>
              <option value="technology">Tech</option>
              <option value="finance">Finance</option>
              <option value="consulting">Consulting</option>
              <option value="healthcare">Healthcare</option>
              <option value="retail">Retail</option>
              <option value="manufacturing">Manufacturing</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        style={{
          width: "100%", padding: "15px", marginTop: 28,
          borderRadius: 14, background: "var(--accent)", color: "#FFFFFF",
          border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer",
          boxShadow: "0 4px 14px rgba(0,102,204,0.3)",
          letterSpacing: "-0.01em",
        }}
      >
        Save Scenario
      </button>
    </main>
  );
}

function Field({ label, error, children, style }: {
  label: string;
  error?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style}>
      <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {error && <p style={{ fontSize: 12, color: "var(--red)", marginTop: 4 }}>{error}</p>}
    </div>
  );
}

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "10px 14px",
  borderRadius: 12,
  border: `1.5px solid ${hasError ? "var(--red)" : "var(--border)"}`,
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
});

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 12,
  border: "1.5px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  cursor: "pointer",
};
