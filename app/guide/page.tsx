"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSettings, saveSettings } from "@/lib/storage";
import SpeaqLogo from "@/components/SpeaqLogo";
import type { Language } from "@/types";

const CONTENT = {
  en: {
    startBtn: "Start Practicing",
    hero: {
      title: "Every conversation grows\nyour expressions.",
      sub: "Speak. Get feedback. Keep the expressions that stick.",
    },
    problem: {
      title: "Sound familiar?",
      items: [
        "You understand English — but in the moment, the same phrases keep coming out.",
        "Knowing English and using English are two different things.",
        "It's in your head. But it won't come out.",
      ],
    },
    how: {
      title: "How it works",
      steps: [
        {
          num: "1",
          title: "Recreate your exact situation",
          desc: "Any scene you need — AI instantly builds a realistic scenario around it.",
        },
        {
          num: "2",
          title: "Speak and discover new expressions",
          desc: "Tap the mic and talk. After each session, get feedback on how a native speaker would have said it.",
        },
        {
          num: "3",
          title: "Keep using them until they're yours",
          desc: "Save expressions to your Notebook. Quiz yourself until they come out naturally.",
        },
      ],
    },
    loop: {
      title: "Speak. Notice. Own it.",
      sub: "Practice, feedback, and retention — all in one loop.",
    },
  },
  ja: {
    startBtn: "練習を始める",
    hero: {
      title: "会話するたびに、\n使える表現が増える。",
      sub: "話して、フィードバックを受けて、表現を自分のものにする。",
    },
    problem: {
      title: "こんな経験、ありませんか？",
      items: [
        "英語はわかるのに、いざ話すと同じ表現しか出てこない。",
        "知っている英語と、使える英語は、違う。",
        "頭にあるのに、口から出てこない。",
      ],
    },
    how: {
      title: "使い方",
      steps: [
        {
          num: "1",
          title: "あなたの場面を再現する",
          desc: "どんなシーンでもOK。AIが即座にリアルなシナリオを生成する。",
        },
        {
          num: "2",
          title: "話しながら、表現を発見する",
          desc: "マイクで話すだけ。セッション後、ネイティブならどう言うかをフィードバックで知る。",
        },
        {
          num: "3",
          title: "使い続けて、自分のものにする",
          desc: "気になった表現をノートに保存。クイズで繰り返して、咄嗟に出てくるまで鍛える。",
        },
      ],
    },
    loop: {
      title: "話して、気づいて、定着する。",
      sub: "練習・フィードバック・定着が、一つのループになっている。",
    },
  },
};

export default function GuidePage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>(() => getSettings().language ?? "en");

  const toggleLang = () => {
    const next: Language = lang === "en" ? "ja" : "en";
    setLang(next);
    saveSettings({ ...getSettings(), language: next });
  };

  const c = CONTENT[lang];

  return (
    <main style={{
      maxWidth: 640,
      width: "100%",
      margin: "0 auto",
      padding: "24px 16px 120px",
      minHeight: "100vh",
    }}>

      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 32,
      }}>
        <SpeaqLogo />
        <button
          onClick={toggleLang}
          style={{
            padding: "6px 12px",
            borderRadius: 20,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--accent)",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {lang === "en" ? "JA" : "EN"}
        </button>
      </div>

      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)",
        borderRadius: 20,
        padding: "32px 24px 36px",
        marginBottom: 12,
        overflow: "hidden",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", top: -32, right: -32,
          width: 128, height: 128, borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
        }} />
        <div style={{ position: "relative" }}>
          <div style={{
            fontSize: 24,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.025em",
            lineHeight: 1.3,
            marginBottom: 12,
            whiteSpace: "pre-line",
            wordBreak: "auto-phrase",
          } as React.CSSProperties}>
            {c.hero.title}
          </div>
          <div style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.82)",
            lineHeight: 1.6,
            fontWeight: 400,
          }}>
            {c.hero.sub}
          </div>
        </div>
      </div>

      {/* Problem */}
      <div style={{ marginBottom: 12 }}>
        <SectionHeader>{c.problem.title}</SectionHeader>
        <div style={{
          background: "var(--surface)",
          borderRadius: 20,
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden",
        }}>
          {c.problem.items.map((text, i) => (
            <div
              key={i}
              style={{
                padding: "16px 20px",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                borderBottom: i < c.problem.items.length - 1
                  ? "1px solid var(--border)"
                  : "none",
              }}
            >
              <div style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "var(--surface2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted)",
                marginTop: 1,
              }}>
                {i + 1}
              </div>
              <span style={{
                fontSize: 14,
                color: "var(--text)",
                lineHeight: 1.65,
                fontWeight: 400,
                wordBreak: "auto-phrase",
              } as React.CSSProperties}>
                {text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ marginBottom: 12 }}>
        <SectionHeader>{c.how.title}</SectionHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {c.how.steps.map((step, i) => (
            <div
              key={step.num}
              style={{ display: "flex", gap: 0 }}
            >
              {/* Timeline */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 48,
                flexShrink: 0,
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 14,
                  flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(0,102,204,0.3)",
                }}>
                  {step.num}
                </div>
                {i < c.how.steps.length - 1 && (
                  <div style={{
                    width: 2,
                    flex: 1,
                    background: "var(--border)",
                    margin: "4px 0",
                    minHeight: 24,
                  }} />
                )}
              </div>

              {/* Content */}
              <div style={{
                flex: 1,
                paddingLeft: 12,
                paddingBottom: i < c.how.steps.length - 1 ? 20 : 0,
              }}>
                <div style={{
                  background: "var(--surface)",
                  borderRadius: 16,
                  padding: "14px 16px",
                  boxShadow: "var(--shadow-sm)",
                }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: "var(--text)",
                    marginBottom: 6,
                    lineHeight: 1.4,
                    letterSpacing: "-0.01em",
                    wordBreak: "auto-phrase",
                  } as React.CSSProperties}>
                    {step.title}
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.65,
                    wordBreak: "auto-phrase",
                  } as React.CSSProperties}>
                    {step.desc}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Loop */}
      <div>
        <div style={{
          background: "var(--surface)",
          borderRadius: 20,
          padding: "28px 24px",
          boxShadow: "var(--shadow-sm)",
          textAlign: "center",
          borderTop: "3px solid var(--accent)",
        }}>
          <div style={{
            fontSize: 20,
            fontWeight: 800,
            color: "var(--text)",
            letterSpacing: "-0.02em",
            lineHeight: 1.35,
            marginBottom: 8,
            wordBreak: "auto-phrase",
          } as React.CSSProperties}>
            {c.loop.title}
          </div>
          <div style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}>
            {c.loop.sub}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ marginTop: 24 }}>
        <button
          onClick={() => router.push("/")}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: 14,
            background: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)",
            color: "#fff",
            border: "none",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
            letterSpacing: "-0.01em",
            boxShadow: "0 4px 20px rgba(0,102,204,0.35)",
          }}
        >
          {c.startBtn}
        </button>
      </div>

    </main>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.07em",
      color: "var(--text-muted)",
      marginBottom: 10,
      marginTop: 28,
    }}>
      {children}
    </div>
  );
}
