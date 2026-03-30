"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSavedExpressions, getSettings } from "@/lib/storage";
import type { SavedExpression } from "@/types";
import { Suspense } from "react";

type Phase = "loading" | "ready" | "recording" | "transcribing" | "evaluating" | "done" | "error";

function MiniPracticeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [expr, setExpr] = useState<SavedExpression | null>(null);
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<Phase>("loading");
  const [inputText, setInputText] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [result, setResult] = useState<{ used: boolean; reason?: string; modelAnswer: string } | null>(null);
  const [lang, setLang] = useState<"en" | "ja">("ja");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const [exprs, settings] = await Promise.all([getSavedExpressions(), getSettings()]);
      setLang(settings.language);
      const found = exprs.find((e) => e.id === id);
      if (!found) { router.push("/notebook"); return; }
      setExpr(found);

      try {
        const res = await fetch("/api/mini-conversation-question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chunk: found.chunk, chunkDetail: found.chunkDetail }),
        });
        const data = await res.json();
        if (data.question) { setQuestion(data.question); setPhase("ready"); }
        else setPhase("error");
      } catch { setPhase("error"); }
    })();
  }, [id, router]);

  const startTimer = () => {
    setRecordingSeconds(0);
    timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const toggleRecording = async () => {
    if (phase === "recording") {
      mediaRecorderRef.current?.stop();
      stopTimer();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setPhase("transcribing");
        try {
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          const ext = mimeType.includes("webm") ? "webm" : "mp4";
          const file = new File([blob], `recording.${ext}`, { type: mimeType });
          const fd = new FormData();
          fd.append("audio", file);
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          const data = await res.json();
          const text = data.text?.trim() ?? "";
          setInputText(text);
          if (text) {
            await evaluate(text);
          } else {
            setPhase("ready");
          }
        } catch { setPhase("ready"); }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setPhase("recording");
      startTimer();
    } catch { setPhase("error"); }
  };

  const evaluate = async (text: string) => {
    if (!expr) return;
    setPhase("evaluating");
    try {
      const res = await fetch("/api/mini-conversation-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chunk: expr.chunk, question, userResponse: text, lang }),
      });
      const data = await res.json();
      setResult(data);
      setPhase("done");
    } catch { setPhase("error"); }
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const isJa = lang === "ja";

  return (
    <div style={{ maxWidth: 640, width: "100%", margin: "0 auto", minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => router.push("/notebook")}
          style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 14, cursor: "pointer", padding: "4px 0" }}
        >
          ← {isJa ? "ノートブック" : "Notebook"}
        </button>
      </div>

      <div style={{ flex: 1, padding: "24px 16px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Chunk badge */}
        {expr && (
          <div style={{ background: "var(--surface)", borderRadius: 14, padding: "14px 18px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {isJa ? "今日のフレーズ" : "Target phrase"}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>🔑 {expr.chunk}</div>
            {expr.chunkDetail && (
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>{expr.chunkDetail}</div>
            )}
          </div>
        )}

        {/* Loading state */}
        {phase === "loading" && (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40, fontSize: 14 }}>
            {isJa ? "準備中..." : "Preparing..."}
          </div>
        )}

        {/* Error state */}
        {phase === "error" && (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40, fontSize: 14 }}>
            {isJa ? "エラーが発生しました。" : "Something went wrong."}
          </div>
        )}

        {/* AI question */}
        {phase !== "loading" && phase !== "error" && question && (
          <div style={{ background: "var(--surface)", borderRadius: 18, padding: "18px 20px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {isJa ? "相手の発言" : "Counterpart"}
            </div>
            <div style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.6 }}>{question}</div>
          </div>
        )}

        {/* Mic area */}
        {(phase === "ready" || phase === "recording") && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingTop: 8 }}>
            <button
              onClick={toggleRecording}
              style={{
                width: 74, height: 74, borderRadius: "50%",
                border: `3px solid ${phase === "recording" ? "var(--red)" : "transparent"}`,
                background: phase === "recording" ? "rgba(255,59,48,0.1)" : "var(--accent)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: phase === "recording" ? "0 0 0 6px rgba(255,59,48,0.12)" : "0 6px 20px rgba(0,102,204,0.4)",
              }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={phase === "recording" ? "var(--red)" : "#FFFFFF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="8" y1="22" x2="16" y2="22" />
              </svg>
            </button>
            {phase === "recording" ? (
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--red)" }}>
                🔴 {fmtTime(recordingSeconds)} — {isJa ? "タップして停止" : "Tap to stop"}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {isJa ? "マイクをタップして話す" : "Tap to speak"}
              </div>
            )}
          </div>
        )}

        {/* Transcribing / Evaluating spinner */}
        {(phase === "transcribing" || phase === "evaluating") && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingTop: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} />
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {phase === "transcribing" ? (isJa ? "文字起こし中..." : "Transcribing...") : (isJa ? "評価中..." : "Evaluating...")}
            </div>
          </div>
        )}

        {/* User's transcribed text */}
        {phase === "done" && inputText && (
          <div style={{ background: "var(--surface2)", borderRadius: 14, padding: "12px 16px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {isJa ? "あなたの発言" : "Your response"}
            </div>
            <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6 }}>{inputText}</div>
          </div>
        )}

        {/* Feedback */}
        {phase === "done" && result && (
          <div style={{ background: "var(--surface)", borderRadius: 18, padding: "18px 20px", boxShadow: "var(--shadow-sm)" }}>
            {result.used ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>✅</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--green)" }}>
                    {isJa ? "フレーズが使えました！" : "Great — you used the phrase!"}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                    {isJa ? `「${expr?.chunk}」を自然に使えています。` : `「${expr?.chunk}」was used naturally.`}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 28 }}>💬</span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                    {isJa ? "今回は使えませんでした" : "Phrase not used this time"}
                  </div>
                </div>
                {result.reason && (
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, background: "var(--surface2)", borderRadius: 10, padding: "10px 14px" }}>
                    {result.reason}
                  </div>
                )}
              </div>
            )}

            {/* Model answer */}
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {isJa ? "模範回答" : "Model answer"}
              </div>
              <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6, fontStyle: "italic", background: "var(--surface2)", borderRadius: 10, padding: "10px 14px" }}>
                &ldquo;{result.modelAnswer}&rdquo;
              </div>
            </div>
          </div>
        )}

        {/* Actions after done */}
        {phase === "done" && (
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => { setPhase("ready"); setInputText(""); setResult(null); }}
              style={{ flex: 1, padding: "12px", borderRadius: 14, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
            >
              {isJa ? "もう一度" : "Try again"}
            </button>
            <button
              onClick={() => router.push("/notebook")}
              style={{ flex: 1, padding: "12px", borderRadius: 14, background: "var(--accent)", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
            >
              {isJa ? "ノートブックへ" : "Back to Notebook"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MiniPracticePage() {
  return (
    <Suspense>
      <MiniPracticeContent />
    </Suspense>
  );
}
