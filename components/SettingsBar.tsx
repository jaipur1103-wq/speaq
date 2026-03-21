"use client";

import { type AppSettings, type Difficulty, type Industry, type PersonaStyle, type Topic } from "@/types";
import { i18n } from "@/lib/i18n";

interface Props {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
}

export default function SettingsBar({ settings, onChange }: Props) {
  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    onChange({ ...settings, [key]: value });

  const tr = i18n[settings.language ?? "en"];

  const difficulties: { value: Difficulty; label: string }[] = [
    { value: "beginner", label: tr.beginner },
    { value: "intermediate", label: tr.intermediate },
    { value: "advanced", label: tr.advanced },
  ];

  const topics: { value: Topic; label: string }[] = [
    { value: "business", label: tr.topicBusiness },
    { value: "travel", label: tr.topicTravel },
    { value: "daily", label: tr.topicDaily },
    { value: "social", label: tr.topicSocial },
    { value: "study", label: tr.topicStudy },
  ];

  const industries: { value: Industry; label: string }[] = [
    { value: "general", label: tr.industryGeneral },
    { value: "technology", label: tr.industryTech },
    { value: "finance", label: tr.industryFinance },
    { value: "consulting", label: tr.industryConsulting },
    { value: "healthcare", label: tr.industryHealthcare },
    { value: "retail", label: tr.industryRetail },
    { value: "manufacturing", label: tr.industryManufacturing },
  ];

  const personas: { value: PersonaStyle; label: string }[] = [
    { value: "friendly", label: tr.personaFriendly },
    { value: "neutral", label: tr.personaNeutral },
    { value: "tough", label: tr.personaTough },
  ];

  return (
    <div style={{
      background: "var(--surface)", borderRadius: 16, padding: "12px 14px",
      display: "flex", flexDirection: "column", gap: 10, boxShadow: "var(--shadow-sm)",
    }}>
      {/* Row 1: Topic */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
          {tr.topic}
        </span>
        <div style={{ display: "flex", gap: 4, overflowX: "auto", flexWrap: "nowrap", scrollbarWidth: "none" }}>
          {topics.map((t) => (
            <Chip key={t.value} active={settings.topic === t.value} onClick={() => set("topic", t.value)}>
              {t.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Row 2: Difficulty / Industry / Counterpart / Timer */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <Group label={tr.difficulty}>
          {difficulties.map((d) => (
            <Chip key={d.value} active={settings.difficulty === d.value} onClick={() => set("difficulty", d.value)}>
              {d.label}
            </Chip>
          ))}
        </Group>

        <Divider />

        {settings.topic === "business" && (
          <>
            <Group label={tr.industry}>
              <select
                value={settings.industry}
                onChange={(e) => set("industry", e.target.value as Industry)}
                style={{
                  background: "var(--surface2)", color: "var(--text)",
                  border: "1px solid var(--border)", borderRadius: 10,
                  padding: "4px 10px", fontSize: 13, cursor: "pointer", outline: "none",
                }}
              >
                {industries.map((i) => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </Group>
            <Divider />
          </>
        )}

        <Group label={tr.counterpart}>
          {personas.map((p) => (
            <Chip key={p.value} active={settings.personaStyle === p.value} onClick={() => set("personaStyle", p.value)}>
              {p.label}
            </Chip>
          ))}
        </Group>

        <Divider />

        <Group label={tr.timer}>
          <button
            onClick={() => set("timerEnabled", !settings.timerEnabled)}
            style={{
              padding: "4px 12px", borderRadius: 20,
              border: settings.timerEnabled ? "1.5px solid var(--accent)" : "1px solid var(--border)",
              background: settings.timerEnabled ? "var(--accent-bg)" : "transparent",
              color: settings.timerEnabled ? "var(--accent)" : "var(--text-secondary)",
              fontSize: 13, fontWeight: settings.timerEnabled ? 600 : 400,
              cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
            }}
          >
            {settings.timerEnabled ? tr.timerOn : tr.timerOff}
          </button>
        </Group>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 24, background: "var(--border)", flexShrink: 0 }} />;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 11px", borderRadius: 20,
        border: active ? "1.5px solid var(--accent)" : "1px solid var(--border)",
        background: active ? "var(--accent-bg)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-secondary)",
        fontSize: 12, fontWeight: active ? 600 : 400,
        cursor: "pointer", transition: "all 0.15s",
        whiteSpace: "nowrap", flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}
