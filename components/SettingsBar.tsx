"use client";

import { useState, useEffect } from "react";
import { type AppSettings, type Difficulty, type Industry, type PersonaStyle, type SessionLength, type Topic } from "@/types";
import { i18n } from "@/lib/i18n";

interface Props {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}

export default function SettingsBar({ settings, onChange, open, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setInternalOpen(v);
  };

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    onChange({ ...settings, [key]: value });

  const tr = i18n[settings.language ?? "en"];

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

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

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            zIndex: 200,
          }}
        />
      )}

      {/* Bottom sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        maxWidth: 640, margin: "0 auto",
        background: "var(--surface)",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
        zIndex: 201,
        transform: isOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px 14px" }}>
          <span style={{ fontWeight: 700, fontSize: 17, color: "var(--text)", letterSpacing: "-0.01em" }}>
            {tr.scenarioSettings}
          </span>
          <button
            onClick={() => setOpen(false)}
            style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "var(--surface2)", border: "none",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, color: "var(--text-secondary)", fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* Settings content */}
        <div style={{ padding: "0 20px 28px", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", maxHeight: "60vh" }}>

          <SheetRow label={tr.topic}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {topics.map((t) => (
                <SheetChip key={t.value} active={settings.topic === t.value} onClick={() => set("topic", t.value)}>
                  {t.label}
                </SheetChip>
              ))}
            </div>
          </SheetRow>

          <SheetRow label={tr.difficulty}>
            <div style={{ display: "flex", gap: 6 }}>
              {difficulties.map((d) => (
                <SheetChip key={d.value} active={settings.difficulty === d.value} onClick={() => set("difficulty", d.value)}>
                  {d.label}
                </SheetChip>
              ))}
            </div>
          </SheetRow>

          <SheetRow label={tr.sessionTurnsLabel}>
            <div style={{ display: "flex", gap: 6 }}>
              {sessionLengths.map((s) => (
                <SheetChip key={s.value} active={(settings.sessionLength ?? 5) === s.value} onClick={() => set("sessionLength", s.value)}>
                  {s.label} turns
                </SheetChip>
              ))}
            </div>
          </SheetRow>

          <SheetRow label={tr.counterpart}>
            <div style={{ display: "flex", gap: 6 }}>
              {personas.map((p) => (
                <SheetChip key={p.value} active={settings.personaStyle === p.value} onClick={() => set("personaStyle", p.value)}>
                  {p.label}
                </SheetChip>
              ))}
            </div>
          </SheetRow>

          {settings.topic === "business" && (
            <SheetRow label={tr.industry}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {industries.map((ind) => (
                  <SheetChip key={ind.value} active={settings.industry === ind.value} onClick={() => set("industry", ind.value)}>
                    {ind.label}
                  </SheetChip>
                ))}
              </div>
            </SheetRow>
          )}

        </div>
      </div>
    </>
  );
}

function SheetRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function SheetChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px", borderRadius: 22,
        border: active ? "2px solid var(--accent)" : "1.5px solid var(--border)",
        background: active ? "var(--accent-bg)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-secondary)",
        fontSize: 14, fontWeight: active ? 700 : 500,
        cursor: "pointer", transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}
