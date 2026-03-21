"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { type AppSettings, type Difficulty, type Industry, type PersonaStyle, type SessionLength, type Topic } from "@/types";
import { i18n } from "@/lib/i18n";

interface Props {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
}

export default function SettingsBar({ settings, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);
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

  const sessionLengths: { value: SessionLength; label: string }[] = [
    { value: 3, label: "3" },
    { value: 5, label: "5" },
    { value: 10, label: "10" },
  ];

  const topicLabel = topics.find((t) => t.value === settings.topic)?.label ?? settings.topic;
  const diffLabel = difficulties.find((d) => d.value === settings.difficulty)?.label ?? settings.difficulty;
  const personaLabel = personas.find((p) => p.value === settings.personaStyle)?.label ?? settings.personaStyle;
  const industryLabel = settings.topic === "business"
    ? industries.find((i) => i.value === settings.industry)?.label ?? settings.industry
    : null;
  const sessionLabel = `${settings.sessionLength ?? 5}`;


  return (
    <div style={{
      background: "var(--surface)", borderRadius: 16,
      boxShadow: "var(--shadow-sm)", overflow: "hidden",
    }}>
      {/* Summary row — always visible */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "10px 14px", flexWrap: "wrap",
      }}>
        <SummaryChip label={topicLabel} />
        <SummaryChip label={diffLabel} />
        {industryLabel && <SummaryChip label={industryLabel} />}
        <SummaryChip label={personaLabel} />
        <SummaryChip label={`${sessionLabel} turns`} />
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{
            marginLeft: "auto", width: 32, height: 32, borderRadius: "50%",
            border: expanded ? "1.5px solid var(--accent)" : "1px solid var(--border)",
            background: expanded ? "var(--accent-bg)" : "transparent",
            color: expanded ? "var(--accent)" : "var(--text-muted)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s", flexShrink: 0,
          }}
          aria-label="Settings"
        >
          <Settings size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Expanded full settings */}
      {expanded && (
        <div style={{
          borderTop: "1px solid var(--border)",
          padding: "12px 14px",
          display: "flex", flexDirection: "column", gap: 10,
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

          {/* Row 2: Session Length */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
              {tr.sessionTurnsLabel}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              {sessionLengths.map((s) => (
                <Chip key={s.value} active={(settings.sessionLength ?? 5) === s.value} onClick={() => set("sessionLength", s.value)}>
                  {s.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Row 3: Difficulty / Industry / Counterpart */}
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
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryChip({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: 12, padding: "3px 10px", borderRadius: 20,
      background: "var(--accent-bg)", color: "var(--accent)",
      fontWeight: 600, whiteSpace: "nowrap",
    }}>
      {label}
    </span>
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
