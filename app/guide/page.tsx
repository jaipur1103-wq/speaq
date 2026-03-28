"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSettings, saveSettings } from "@/lib/storage";
import SpeaqLogo from "@/components/SpeaqLogo";
import type { Language } from "@/types";

const STEPS_EN = [
  { number: "1", title: "Recreate your exact situation", description: "Any scene you need — AI instantly builds a realistic scenario around it.", icon: "✨" },
  { number: "2", title: "Speak and discover new expressions", description: "Tap the mic and talk. After each session, get feedback on how a native speaker would have said it.", icon: "🎙" },
  { number: "3", title: "Keep using them until they're yours", description: "Save expressions to your Notebook. Quiz yourself until they come out naturally.", icon: "📒" },
];

const STEPS_JA = [
  { number: "1", title: "あなたの場面を再現する", description: "どんなシーンでもOK。AIが即座にリアルなシナリオを生成する。", icon: "✨" },
  { number: "2", title: "話しながら、表現を発見する", description: "マイクで話すだけ。セッション後、ネイティブならどう言うかをフィードバックで知る。", icon: "🎙" },
  { number: "3", title: "使い続けて、自分のものにする", description: "気になった表現をノートに保存。クイズで繰り返して、咄嗟に出てくるまで鍛える。", icon: "📒" },
];

export default function GuidePage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>(() => getSettings().language ?? "en");

  const toggleLang = () => {
    const newLang: Language = lang === "en" ? "ja" : "en";
    setLang(newLang);
    const s = getSettings();
    saveSettings({ ...s, language: newLang });
  };

  const steps = lang === "ja" ? STEPS_JA : STEPS_EN;

  const heroTitle = lang === "ja" ? "会話するたびに、使える表現が増える。" : "Every conversation grows your expressions.";
  const heroDesc = lang === "ja" ? "ネイティブの表現を、自分の言葉にする。" : "Make native expressions your own.";
  const painPoints = lang === "ja"
    ? [
        "英語はわかるのに、いざ話すと同じ表現しか出てこない。",
        "知ってる英語と、使える英語は、違う。",
        "頭にあるのに、口から出てこない。",
      ]
    : [
        "You understand English — but in the moment, the same phrases keep coming out.",
        "Knowing English and using English are two different things.",
        "It's in your head. But it won't come out.",
      ];
  const howItWorksLabel = lang === "ja" ? "使い方" : "How it works";
  const whySpeaqLabel = lang === "ja" ? "Why Speaq" : "Why Speaq";
  const whySpeaq = lang === "ja" ? "話して、気づいて、定着する。" : "Speak. Notice. Own it.";
  const startBtn = lang === "ja" ? "練習を始める →" : "Start Practicing →";
  const startShort = lang === "ja" ? "始める →" : "Start →";

  return (
    <main style={{ maxWidth: 640, width: "100%", margin: "0 auto", padding: "24px 16px 80px", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
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
            {lang === "en" ? "JA" : "EN"}
          </button>
          <button
            onClick={() => router.push("/")}
            style={{
              padding: "8px 16px", borderRadius: 20,
              background: "var(--accent)", color: "#fff",
              border: "none", fontWeight: 700, fontSize: 13,
              cursor: "pointer",
            }}
          >
            {startShort}
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{
        background: "var(--accent)", borderRadius: 20, padding: "36px 24px",
        marginBottom: 28, textAlign: "center",
      }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.4, marginBottom: 10 }}>
          {heroTitle}
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.7 }}>
          {heroDesc}
        </div>
      </div>

      {/* Pain */}
      <div style={{
        background: "var(--surface)", borderRadius: 20, padding: "20px 22px",
        marginBottom: 28, boxShadow: "var(--shadow-sm)",
      }}>
        {painPoints.map((point, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            paddingBottom: i < painPoints.length - 1 ? 12 : 0,
            marginBottom: i < painPoints.length - 1 ? 12 : 0,
            borderBottom: i < painPoints.length - 1 ? "1px solid var(--border)" : "none",
          }}>
            <span style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 1, flexShrink: 0 }}>—</span>
            <span style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, wordBreak: "auto-phrase" } as React.CSSProperties}>
              {point}
            </span>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div style={{ marginBottom: 28 }}>
        <SectionTitle>{howItWorksLabel}</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {steps.map((step) => (
            <div key={step.number} style={{
              background: "var(--surface)", borderRadius: 16, padding: "16px 18px",
              display: "flex", gap: 14, alignItems: "flex-start",
              boxShadow: "var(--shadow-sm)",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "var(--accent-bg)", color: "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 14, flexShrink: 0,
              }}>
                {step.number}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 3 }}>
                  {step.icon} {step.title}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, wordBreak: "auto-phrase" } as React.CSSProperties}>
                  {step.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why Speaq */}
      <div style={{ marginBottom: 32 }}>
        <SectionTitle>{whySpeaqLabel}</SectionTitle>
        <div style={{
          background: "var(--surface)", borderRadius: 20, padding: "24px 22px",
          boxShadow: "var(--shadow-sm)", textAlign: "center",
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.5 }}>
            {whySpeaq}
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => router.push("/")}
        style={{
          width: "100%", padding: "16px",
          borderRadius: 16, background: "var(--accent)", color: "#fff",
          border: "none", fontWeight: 800, fontSize: 16,
          cursor: "pointer", letterSpacing: "-0.01em",
          boxShadow: "0 4px 14px rgba(0,102,204,0.35)",
        }}
      >
        {startBtn}
      </button>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.07em", color: "var(--text-muted)",
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}
