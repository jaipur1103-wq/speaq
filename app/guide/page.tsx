"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSettings, saveSettings } from "@/lib/storage";
import SpeaqLogo from "@/components/SpeaqLogo";
import type { Language } from "@/types";

const CONTENT = {
  en: {
    heroTitle: "Every conversation grows your expressions.",
    heroSub: "Make native expressions your own.",
    painLabel: "Sound familiar?",
    pain: [
      { icon: "💭", text: "You understand English — but in the moment, the same phrases keep coming out." },
      { icon: "📖", text: "Knowing English and using English are two different things." },
      { icon: "🧠", text: "It's in your head. But it won't come out." },
    ],
    stepsLabel: "How it works",
    steps: [
      { number: "1", icon: "✨", title: "Recreate your exact situation", desc: "Any scene you need — AI instantly builds a realistic scenario around it." },
      { number: "2", icon: "🎙", title: "Speak and discover new expressions", desc: "Tap the mic and talk. After each session, get feedback on how a native speaker would have said it." },
      { number: "3", icon: "📒", title: "Keep using them until they're yours", desc: "Save expressions to your Notebook. Quiz yourself until they come out naturally." },
    ],
    whyLabel: "Why Speaq",
    whyCycle: "Speak. Notice. Own it.",
    whySub: "Practice, feedback, and retention — all in one loop.",
    startBtn: "Start Practicing →",
    startShort: "Start →",
  },
  ja: {
    heroTitle: "会話するたびに、使える表現が増える。",
    heroSub: "ネイティブの表現を、自分の言葉にする。",
    painLabel: "こんな経験、ありませんか？",
    pain: [
      { icon: "💭", text: "英語はわかるのに、いざ話すと同じ表現しか出てこない。" },
      { icon: "📖", text: "知ってる英語と、使える英語は、違う。" },
      { icon: "🧠", text: "頭にあるのに、口から出てこない。" },
    ],
    stepsLabel: "使い方",
    steps: [
      { number: "1", icon: "✨", title: "あなたの場面を再現する", desc: "どんなシーンでもOK。AIが即座にリアルなシナリオを生成する。" },
      { number: "2", icon: "🎙", title: "話しながら、表現を発見する", desc: "マイクで話すだけ。セッション後、ネイティブならどう言うかをフィードバックで知る。" },
      { number: "3", icon: "📒", title: "使い続けて、自分のものにする", desc: "気になった表現をノートに保存。クイズで繰り返して、咄嗟に出てくるまで鍛える。" },
    ],
    whyLabel: "Why Speaq",
    whyCycle: "話して、気づいて、定着する。",
    whySub: "練習・フィードバック・定着が、一つのループになっている。",
    startBtn: "練習を始める →",
    startShort: "始める →",
  },
};

export default function GuidePage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>(() => getSettings().language ?? "en");

  const toggleLang = () => {
    const newLang: Language = lang === "en" ? "ja" : "en";
    setLang(newLang);
    saveSettings({ ...getSettings(), language: newLang });
  };

  const c = CONTENT[lang];

  return (
    <main style={{ maxWidth: 640, width: "100%", margin: "0 auto", minHeight: "100vh", background: "var(--bg)" }}>

      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "20px 20px 0",
      }}>
        <SpeaqLogo />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={toggleLang} style={{
            padding: "6px 12px", borderRadius: 20,
            background: "var(--surface)", border: "1px solid var(--border)",
            color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>
            {lang === "en" ? "JA" : "EN"}
          </button>
          <button onClick={() => router.push("/")} style={{
            padding: "8px 16px", borderRadius: 20,
            background: "var(--accent)", color: "#fff",
            border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>
            {c.startShort}
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: "28px 20px 0" }}>
        <div style={{
          background: "linear-gradient(145deg, #007AFF 0%, #5856D6 100%)",
          borderRadius: 24, padding: "36px 28px 40px",
          position: "relative", overflow: "hidden",
        }}>
          {/* decorative circles */}
          <div style={{
            position: "absolute", top: -40, right: -40,
            width: 160, height: 160, borderRadius: "50%",
            background: "rgba(255,255,255,0.07)",
          }} />
          <div style={{
            position: "absolute", bottom: -20, left: -20,
            width: 100, height: 100, borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }} />
          <div style={{ position: "relative" }}>
            <div style={{
              fontSize: 28, fontWeight: 800, color: "#fff",
              letterSpacing: "-0.03em", lineHeight: 1.3, marginBottom: 14,
              wordBreak: "auto-phrase",
            } as React.CSSProperties}>
              {c.heroTitle}
            </div>
            <div style={{
              fontSize: 15, color: "rgba(255,255,255,0.8)",
              fontWeight: 500, lineHeight: 1.5,
            }}>
              {c.heroSub}
            </div>
          </div>
        </div>
      </div>

      {/* Pain */}
      <div style={{ padding: "36px 20px 0" }}>
        <Label>{c.painLabel}</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {c.pain.map((item, i) => (
            <div key={i} style={{
              background: "var(--surface)", borderRadius: 16,
              padding: "16px 18px", boxShadow: "var(--shadow-sm)",
              display: "flex", alignItems: "flex-start", gap: 14,
            }}>
              <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
              <span style={{
                fontSize: 15, color: "var(--text)", lineHeight: 1.6,
                fontWeight: 500, wordBreak: "auto-phrase",
              } as React.CSSProperties}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ padding: "36px 20px 0" }}>
        <Label>{c.stepsLabel}</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 14 }}>
          {c.steps.map((step, i) => (
            <div key={step.number} style={{ display: "flex", gap: 0 }}>
              {/* Left: number + connector */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 44, flexShrink: 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "var(--accent)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 14, flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(0,102,204,0.3)",
                }}>
                  {step.number}
                </div>
                {i < c.steps.length - 1 && (
                  <div style={{ width: 2, flex: 1, background: "var(--border)", margin: "4px 0" }} />
                )}
              </div>
              {/* Right: content */}
              <div style={{ flex: 1, paddingLeft: 14, paddingBottom: i < c.steps.length - 1 ? 24 : 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 6, lineHeight: 1.4 }}>
                  {step.icon} {step.title}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  {step.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why Speaq */}
      <div style={{ padding: "36px 20px 0" }}>
        <Label>{c.whyLabel}</Label>
        <div style={{
          marginTop: 14,
          background: "var(--surface)", borderRadius: 24,
          padding: "32px 24px", boxShadow: "var(--shadow-sm)",
          textAlign: "center",
          borderTop: "3px solid var(--accent)",
        }}>
          <div style={{
            fontSize: 22, fontWeight: 800, color: "var(--text)",
            letterSpacing: "-0.02em", lineHeight: 1.4, marginBottom: 10,
          }}>
            {c.whyCycle}
          </div>
          <div style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
            {c.whySub}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: "32px 20px 80px" }}>
        <button
          onClick={() => router.push("/")}
          style={{
            width: "100%", padding: "18px",
            borderRadius: 18,
            background: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)",
            color: "#fff", border: "none",
            fontWeight: 800, fontSize: 17,
            cursor: "pointer", letterSpacing: "-0.01em",
            boxShadow: "0 6px 20px rgba(0,102,204,0.35)",
          }}
        >
          {c.startBtn}
        </button>
      </div>

    </main>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.08em", color: "var(--text-muted)",
    }}>
      {children}
    </div>
  );
}
