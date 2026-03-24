"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Feedback, Message, NaturalExpression, Scenario } from "@/types";
import { saveExpression, getSettings, saveScoreRecord } from "@/lib/storage";
import { i18n } from "@/lib/i18n";
import type { Tr } from "@/lib/i18n";

type ChatItem = { kind: "message"; data: Message };
type PendingTurn = { userMessage: string; counterpartMessage: string };

const difficultyColor: Record<string, string> = {
  beginner: "#34C759",
  intermediate: "#FF9500",
  advanced: "#FF3B30",
};

const AVATAR_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#C9A0DC", "#FFB347"];

function getAvatarColor(name: string): string {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PracticePage() {
  const router = useRouter();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [loadingReply, setLoadingReply] = useState(false);
  const [loadingFinalFeedback, setLoadingFinalFeedback] = useState(false);
  const [finalFeedback, setFinalFeedback] = useState<Feedback | null>(null);
  const [pendingTurns, setPendingTurns] = useState<PendingTurn[]>([]);
  const [sessionLength, setSessionLength] = useState(5);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [turn, setTurn] = useState(1);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showSummary, setShowSummary] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [tr, setTr] = useState<Tr>(i18n.en);
  const [lang, setLang] = useState<"en" | "ja">("en");

  // Recording time
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastSessionKey = useRef<string | null>(null);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replyAbortRef = useRef<AbortController | null>(null);

  const initSession = useRef(() => {});
  initSession.current = () => {
    if (replyTimerRef.current) { clearTimeout(replyTimerRef.current); replyTimerRef.current = null; }
    if (replyAbortRef.current) { replyAbortRef.current.abort(); replyAbortRef.current = null; }
    const raw = sessionStorage.getItem("current_scenario");
    const sessionKey = sessionStorage.getItem("practice_session_key") ?? "";
    if (!raw) { router.push("/"); return; }
    if (lastSessionKey.current === sessionKey && lastSessionKey.current !== null) return;
    lastSessionKey.current = sessionKey;
    const s: Scenario = JSON.parse(raw);
    setScenario(s);
    setChatItems([{ kind: "message", data: { role: "counterpart", text: s.opener, textJa: s.openerJa, timestamp: Date.now() } }]);
    setPendingTurns([]);
    setFinalFeedback(null);
    setTurn(1);
    setSavedIds(new Set());
    setScoreSaved(false);
    setShowSummary(false);
    setInputText("");
    setRecordingSeconds(0);
    setLoadingReply(false);
    setLoadingFinalFeedback(false);
    const settings = getSettings();
    const l = settings.language ?? "en";
    setLang(l);
    setTr(i18n[l]);
    setSessionLength(settings.sessionLength ?? 5);
  };

  useEffect(() => {
    initSession.current();
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) initSession.current();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatItems, loadingReply, loadingFinalFeedback, finalFeedback]);

  // Auto-save score as soon as feedback is available
  useEffect(() => {
    if (finalFeedback && scenario && !scoreSaved) {
      doSaveScore(finalFeedback, scenario.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalFeedback]);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) setSpeechSupported(false);
  }, []);

  const startRecordingTimer = () => {
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      stopRecordingTimer();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
        const recorder = new MediaRecorder(stream, { mimeType });
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          const ext = mimeType.includes("webm") ? "webm" : "mp4";
          const file = new File([blob], `recording.${ext}`, { type: mimeType });
          setIsTranscribing(true);
          try {
            const fd = new FormData();
            fd.append("audio", file);
            const res = await fetch("/api/transcribe", { method: "POST", body: fd });
            const data = await res.json();
            setInputText(data.text?.trim() ?? "");
          } catch { /* silent */ } finally {
            setIsTranscribing(false);
          }
        };

        mediaRecorderRef.current = recorder;
        setInputText("");
        recorder.start();
        setIsRecording(true);
        startRecordingTimer();
      } catch {
        setSpeechSupported(false);
      }
    }
  };

  const handleRetake = () => {
    setInputText("");
    setRecordingSeconds(0);
  };

  const callFeedbackApi = async (turns: PendingTurn[]) => {
    if (!scenario) return;
    setLoadingFinalFeedback(true);
    setFeedbackError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, turns, language: lang }),
      });
      const fb = await res.json();
      if (fb.encouragement) {
        setFinalFeedback(fb as Feedback);
      } else {
        setFeedbackError(fb.detail ?? fb.error ?? "unknown error");
      }
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : "network error");
    } finally {
      setLoadingFinalFeedback(false);
    }
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !scenario) return;
    if (isRecording) { mediaRecorderRef.current?.stop(); stopRecordingTimer(); setIsRecording(false); }

    // Snapshot conversation state before any updates
    const allMessages = chatItems.map((i) => i.data);
    const lastCounterpart = [...allMessages].reverse().find((m) => m.role === "counterpart");

    // Show original text in chat immediately
    const userMsg: Message = { role: "user", text, timestamp: Date.now() };
    setChatItems((prev) => [...prev, { kind: "message", data: userMsg }]);
    setInputText("");
    setRecordingSeconds(0);
    setTurn((t) => t + 1);

    // Silently add punctuation before passing to APIs
    const correctedText = await punctuateText(text);

    const newTurn: PendingTurn = { userMessage: correctedText, counterpartMessage: lastCounterpart?.text ?? scenario.opener };
    const newPendingTurns = [...pendingTurns, newTurn];
    setPendingTurns(newPendingTurns);

    const isLastTurn = newPendingTurns.length >= sessionLength;

    if (isLastTurn) {
      await callFeedbackApi(newPendingTurns);
    } else {
      setLoadingReply(true);
      const abort = new AbortController();
      replyAbortRef.current = abort;
      try {
        const res = await fetch("/api/counterpart-reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenario,
            conversationHistory: [...allMessages, { ...userMsg, text: correctedText }],
            userMessage: correctedText,
          }),
          signal: abort.signal,
        });
        const { reply, replyJa } = await res.json();
        const timerId = setTimeout(() => {
          replyTimerRef.current = null;
          setChatItems((prev) => [
            ...prev,
            { kind: "message", data: { role: "counterpart", text: reply, textJa: replyJa, timestamp: Date.now() } },
          ]);
        }, 1800);
        replyTimerRef.current = timerId;
      } catch { /* silent — includes abort */ } finally {
        replyAbortRef.current = null;
        setLoadingReply(false);
      }
    }
  };

  const handleFinishEarly = () => {
    if (pendingTurns.length === 0 || loadingFinalFeedback) return;
    callFeedbackApi(pendingTurns);
  };

  const resetSession = () => {
    if (!scenario) return;
    if (replyTimerRef.current) { clearTimeout(replyTimerRef.current); replyTimerRef.current = null; }
    if (replyAbortRef.current) { replyAbortRef.current.abort(); replyAbortRef.current = null; }
    const newKey = Date.now().toString();
    sessionStorage.setItem("practice_session_key", newKey);
    lastSessionKey.current = newKey;
    setChatItems([{ kind: "message", data: { role: "counterpart", text: scenario.opener, textJa: scenario.openerJa, timestamp: Date.now() } }]);
    setPendingTurns([]);
    setFinalFeedback(null);
    setTurn(1);
    setSavedIds(new Set());
    setScoreSaved(false);
    setShowSummary(false);
    setFeedbackError(null);
    setInputText("");
    setRecordingSeconds(0);
    setLoadingReply(false);
    setLoadingFinalFeedback(false);
  };

  const handleSaveExpression = (expr: NaturalExpression, scenarioTitle: string, exprKey: string) => {
    saveExpression({ ...expr, scenarioTitle, category: scenario?.category ?? "" });
    setSavedIds((prev) => new Set(prev).add(exprKey));
  };

  const doSaveScore = (fb: Feedback, title: string) => {
    if (scoreSaved) return;
    saveScoreRecord({
      date: new Date().toISOString().slice(0, 10),
      scenarioTitle: title,
      scenarioCategory: scenario?.category,
      difficulty: scenario?.difficulty,
      turnCount: pendingTurns.length,
      conversationSummary: fb.conversationSummary,
      encouragement: fb.encouragement,
      strengths: fb.strengths,
      improvements: fb.improvements,
      expressionCount: fb.naturalExpressions?.length ?? 0,
    });
    setScoreSaved(true);
  };

  const handleBack = () => {
    if (finalFeedback && scenario) {
      doSaveScore(finalFeedback, scenario.title);
      setShowSummary(true);
    } else {
      router.push("/");
    }
  };

  if (!scenario) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-muted)" }}>Loading...</div>;
  }

  const hasInput = inputText.trim().length > 0;
  const completedTurns = pendingTurns.length;
  const sessionDone = completedTurns >= sessionLength || finalFeedback !== null;

  return (
    <div style={{ maxWidth: 640, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", height: "100dvh", background: "var(--bg)" }}>

      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={handleBack} style={{ background: "var(--surface2)", border: "none", borderRadius: 10, padding: "6px 12px", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600 }}>
            {tr.back}
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", fontWeight: 700 }}>{scenario.category}</span>
              <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: difficultyColor[scenario.difficulty] + "22", color: difficultyColor[scenario.difficulty], fontWeight: 700, textTransform: "capitalize" }}>{scenario.difficulty}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", lineHeight: 1.3, letterSpacing: "-0.01em" }}>{scenario.title}</div>
          </div>
        </div>
      </div>

      {/* Briefing */}
      <BriefingArea scenario={scenario} tr={tr} />


      {/* Chat */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {chatItems.map((item, i) => (
          <ChatBubble key={i} msg={item.data} personaName={scenario.personaName} tr={tr} />
        ))}
        {loadingReply && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <Avatar name={scenario.personaName} />
            <div style={{ background: "var(--surface)", borderRadius: "18px 18px 18px 4px", padding: "12px 16px", fontSize: 13, color: "var(--text-muted)", boxShadow: "var(--shadow-sm)" }}>
              <TypingDots />
            </div>
          </div>
        )}
        {loadingFinalFeedback && (
          <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "20px 0", fontWeight: 500 }}>
            {tr.analyzingSession}
          </div>
        )}
        {feedbackError && (
          <div style={{ background: "var(--surface)", borderRadius: 18, padding: "20px 18px", textAlign: "center", boxShadow: "var(--shadow-md)" }}>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>
              {lang === "ja" ? "評価の取得に失敗しました。" : "Failed to load feedback."}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12, wordBreak: "break-all" }}>{feedbackError}</div>
            <button
              onClick={() => callFeedbackApi(pendingTurns)}
              style={{ fontSize: 13, padding: "8px 20px", borderRadius: 20, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}
            >
              {lang === "ja" ? "再試行" : "Retry"}
            </button>
          </div>
        )}
        {finalFeedback && (
          <FeedbackPanel feedback={finalFeedback} scenarioTitle={scenario.title} turns={pendingTurns} savedIds={savedIds} tr={tr} onSaveExpression={handleSaveExpression} />
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input area — fixed height for stable layout */}
      <div style={{
        borderTop: "1px solid var(--border)",
        background: "var(--surface)",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
        height: 164,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {!speechSupported && (
          <p style={{ fontSize: 11, color: "var(--orange)", textAlign: "center", margin: "4px 16px 0", lineHeight: 1.3 }}>{tr.speechNotSupported}</p>
        )}

        {/* Turn progress — always reserves 36px even when hidden */}
        <div style={{ height: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, paddingInline: 16 }}>
          {!sessionDone && (
            <>
              <div style={{ display: "flex", gap: sessionLength <= 5 ? 6 : 4, alignItems: "center" }}>
                {sessionLength <= 5
                  ? Array.from({ length: sessionLength }, (_, i) => (
                      <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: i < completedTurns ? "var(--accent)" : "var(--border)", transition: "background 0.3s" }} />
                    ))
                  : (
                      <div style={{ width: 100, height: 4, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${(completedTurns / sessionLength) * 100}%`, height: "100%", background: "var(--accent)", borderRadius: 3, transition: "width 0.3s" }} />
                      </div>
                    )
                }
              </div>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
                {tr.turnProgress(completedTurns, sessionLength)}
              </span>
              {completedTurns > 0 && (
                <button
                  onClick={handleFinishEarly}
                  disabled={loadingFinalFeedback}
                  style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}
                >
                  {tr.finishEarly}
                </button>
              )}
            </>
          )}
        </div>

        {/* Content area — flex:1, centered */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", paddingInline: 16, paddingBottom: 8 }}>
          {sessionDone ? null : isTranscribing ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ width: 74, height: 74, borderRadius: "50%", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid var(--accent)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                {lang === "ja" ? "文字起こし中..." : "Transcribing..."}
              </div>
            </div>
          ) : hasInput && !isRecording ? (
            /* Has input: preview + send/retake */
            <div style={{ width: "100%" }}>
              <div style={{ background: "var(--surface2)", borderRadius: 12, padding: "8px 14px", marginBottom: 8, fontSize: 13, color: "var(--text)", lineHeight: 1.5, minHeight: 36, maxHeight: 52, overflow: "hidden" }}>
                {inputText.trim()}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleRetake}
                  style={{ flex: 1, padding: "10px", borderRadius: 12, background: "var(--surface2)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                >
                  {tr.retake}
                </button>
                <button
                  onClick={handleSend}
                  style={{ flex: 2, padding: "10px", borderRadius: 12, background: "var(--accent)", color: "#FFFFFF", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 14px rgba(0,102,204,0.3)" }}
                >
                  {tr.send} →
                </button>
              </div>
            </div>
          ) : (
            /* Idle or recording: mic button */
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <button
                onClick={toggleRecording}
                className={isRecording ? "animate-pulse-ring" : ""}
                style={{
                  width: 74, height: 74, borderRadius: "50%",
                  border: `3px solid ${isRecording ? "var(--red)" : "transparent"}`,
                  background: isRecording ? "rgba(255,59,48,0.1)" : "var(--accent)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                  boxShadow: isRecording ? "0 0 0 6px rgba(255,59,48,0.12)" : "0 6px 20px rgba(0,102,204,0.4)",
                  flexShrink: 0,
                }}
                aria-label={isRecording ? tr.stopRecording : tr.startRecording}
              >
                <MicIcon recording={isRecording} />
              </button>
              <div style={{ height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isRecording ? (
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--red)", letterSpacing: "0.04em" }}>
                    🔴 {fmtTime(recordingSeconds)}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                    {tr.tapToSpeak}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Session Summary Modal */}
      {showSummary && scenario && finalFeedback && (
        <SessionSummary feedback={finalFeedback} turnCount={pendingTurns.length} savedCount={savedIds.size} tr={tr} onContinue={resetSession} onDone={() => router.push("/")} onGoNotebook={() => router.push("/notebook")} />
      )}
    </div>
  );
}

// ── Briefing area ──────────────────────────────────────────────────────────────
function BriefingArea({ scenario, tr }: { scenario: Scenario; tr: Tr }) {
  const [showTrans, setShowTrans] = useState(false);
  const hasTrans = !!scenario.briefJa;

  return (
    <div style={{ padding: "14px 16px", background: "var(--accent-bg)", borderBottom: "1px solid var(--border)" }}>
      <p style={{ color: "var(--accent)", fontSize: 15, margin: "0 0 6px", lineHeight: 1.65, fontWeight: 500 }}>
        {scenario.brief}
      </p>
      {showTrans && scenario.briefJa && (
        <p style={{ color: "var(--accent)", fontSize: 14, margin: "0 0 8px", lineHeight: 1.65, opacity: 0.85, borderLeft: "2px solid var(--accent)", paddingLeft: 10 }}>
          {scenario.briefJa}
        </p>
      )}
      {hasTrans && (
        <button
          onClick={() => setShowTrans((v) => !v)}
          style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, border: `1px solid ${showTrans ? "var(--accent)" : "rgba(0,102,204,0.3)"}`, background: showTrans ? "rgba(0,102,204,0.15)" : "transparent", color: "var(--accent)", cursor: "pointer", fontWeight: 600, marginBottom: 8 }}
        >
          {showTrans ? tr.hideTranslation : tr.translate}
        </button>
      )}
    </div>
  );
}

// ── Chat bubble with translate ─────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  return (
    <div style={{ width: 32, height: 32, borderRadius: "50%", background: getAvatarColor(name), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#FFFFFF", fontWeight: 700, fontSize: 13 }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function ChatBubble({ msg, personaName, tr }: { msg: Message; personaName: string; tr: Tr }) {
  const isUser = msg.role === "user";
  const [speaking, setSpeaking] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [showTrans, setShowTrans] = useState(false);
  const [translating, setTranslating] = useState(false);

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(msg.text);
    utterance.lang = "en-US"; utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleTranslate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showTrans) { setShowTrans(false); return; }
    if (translation) { setShowTrans(true); return; }
    // Use pre-generated translation if available
    if (msg.textJa) { setTranslation(msg.textJa); setShowTrans(true); return; }
    setTranslating(true);
    try {
      const res = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texts: [msg.text] }) });
      const d = await res.json();
      setTranslation(d.translations?.[0] ?? null);
      setShowTrans(true);
    } catch { /* silent */ } finally { setTranslating(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
      {!isUser && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <Avatar name={personaName} />
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{personaName}</span>
        </div>
      )}
      <div style={{ maxWidth: "90%", marginLeft: !isUser ? 38 : 0 }}>
        <div style={{
          padding: "12px 16px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isUser ? "var(--accent)" : "var(--surface)",
          color: isUser ? "#FFFFFF" : "var(--text)",
          fontSize: 16, lineHeight: 1.6, boxShadow: "var(--shadow-sm)",
        }}>
          {msg.text}
        </div>
        {showTrans && translation && (
          <div style={{ marginTop: 4, padding: "8px 14px", borderRadius: 10, background: "var(--surface2)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {translation}
          </div>
        )}
        {!isUser && (
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button onClick={handleSpeak} style={{
              height: 28, padding: "0 10px", borderRadius: 20,
              background: speaking ? "var(--accent-bg)" : "var(--surface2)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 12, color: speaking ? "var(--accent)" : "var(--text-muted)",
              fontWeight: 500, transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 13 }}>{speaking ? "⏸" : "🔊"}</span>
              {speaking ? tr.stop : tr.readAloud}
            </button>
            <button onClick={handleTranslate} style={{
              height: 28, padding: "0 10px", borderRadius: 20,
              background: showTrans ? "var(--accent-bg)" : "var(--surface2)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 12, color: showTrans ? "var(--accent)" : "var(--text-muted)",
              fontWeight: 500, transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 13 }}>{translating ? "⏳" : "🌐"}</span>
              {showTrans ? tr.hideTranslation : tr.translate}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Feedback panel ─────────────────────────────────────────────────────────────
function findSourceTurn(comment: string, turns: PendingTurn[]): string | null {
  const match = comment.match(/「([^」]+)」/);
  if (!match) return null;
  const quoted = match[1];
  const found = turns.find((t) => t.userMessage.includes(quoted));
  return found?.userMessage ?? null;
}

function FeedbackPanel({ feedback, scenarioTitle, turns, savedIds, tr, onSaveExpression }: {
  feedback: Feedback; scenarioTitle: string; turns: PendingTurn[]; savedIds: Set<string>; tr: Tr;
  onSaveExpression: (expr: NaturalExpression, scenarioTitle: string, key: string) => void;
}) {
  const [showSuggestedSet, setShowSuggestedSet] = useState<Set<number>>(new Set());
  const [showShadowIdx, setShowShadowIdx] = useState<number | null>(null);

  const toggleSuggested = (i: number) => {
    setShowSuggestedSet((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  return (
    <div className="animate-fade-slide-up" style={{ background: "var(--surface)", borderRadius: 18, padding: "16px 18px", boxShadow: "var(--shadow-md)" }}>
      <div style={{ marginBottom: 14 }}>
        <span style={{ fontWeight: 700, fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{tr.sessionFeedbackTitle}</span>
      </div>
      {feedback.encouragement && (
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 14, paddingLeft: 12, borderLeft: "2.5px solid var(--accent)" }}>
          {feedback.encouragement}
        </div>
      )}
      {feedback.strengths.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>{tr.whatWorked}</SectionLabel>
          {feedback.strengths.map((s, i) => (
            <div key={i} style={{ fontSize: 13, color: "var(--text-secondary)", paddingLeft: 12, lineHeight: 1.6, borderLeft: "2.5px solid var(--green)", marginBottom: 6 }}>{s}</div>
          ))}
        </div>
      )}
      {feedback.improvements.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>{tr.tryNextTime}</SectionLabel>
          {feedback.improvements.map((item, i) => {
            const sourceTurn = findSourceTurn(item.comment, turns);
            return (
            <div key={i} style={{ marginBottom: 10, paddingLeft: 12, borderLeft: "2.5px solid var(--orange)" }}>
              {sourceTurn && (
                <div style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--surface2)", borderRadius: 8, padding: "6px 10px", marginBottom: 6, fontStyle: "italic" }}>
                  &ldquo;{sourceTurn}&rdquo;
                </div>
              )}
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 6 }}>{item.comment}</div>
              {item.suggestedResponse && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => toggleSuggested(i)} style={{ fontSize: 12, color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                    {showSuggestedSet.has(i) ? tr.hideModelResponse : tr.showModelResponse}
                  </button>
                  <button onClick={() => { toggleSuggested(i); setShowShadowIdx(showShadowIdx === i ? null : i); if (!showSuggestedSet.has(i)) setShowSuggestedSet((prev) => new Set(prev).add(i)); }} style={{ fontSize: 12, padding: "3px 12px", borderRadius: 20, border: "1px solid var(--border)", background: showShadowIdx === i ? "var(--accent-bg)" : "transparent", color: showShadowIdx === i ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer", fontWeight: 600 }}>
                    {tr.shadowThis}
                  </button>
                </div>
              )}
              {showSuggestedSet.has(i) && item.suggestedResponse && (
                <div style={{ marginTop: 8, padding: "10px 12px", background: "var(--surface2)", borderRadius: 10, fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic", lineHeight: 1.6 }}>
                  &ldquo;{item.suggestedResponse}&rdquo;
                </div>
              )}
              {showShadowIdx === i && item.suggestedResponse && (
                <ShadowSection suggestedResponse={item.suggestedResponse} tr={tr} />
              )}
            </div>
            );
          })}
        </div>
      )}
      {feedback.naturalExpressions?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>{feedback.insightMode ? tr.insightExpressions : tr.moreNatural}</SectionLabel>
          {feedback.naturalExpressions.map((expr, i) => {
            const key = `session-${i}`;
            const saved = savedIds.has(key);
            return (
              <div key={i} style={{ background: "var(--surface2)", borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
                {/* ── Top: session feedback ── */}
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
                    {expr.reason && <ReasonBadge reason={expr.reason} />}
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{expr.original}</span>
                  </div>
                  <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 600, marginBottom: 5 }}>→ {expr.natural}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{expr.explanation}</div>
                </div>

                {/* ── Divider with chunk label ── */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 14px", margin: "0" }}>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>🔑 使えるフレーズ</span>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                </div>

                {/* ── Bottom: chunk learning ── */}
                <div style={{ padding: "10px 14px 12px", background: "var(--accent-bg)" }}>
                  {expr.chunk && (
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)", marginBottom: 4, letterSpacing: "-0.01em" }}>
                      {expr.chunk}
                    </div>
                  )}
                  {expr.chunkDetail && (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 6 }}>{expr.chunkDetail}</div>
                  )}
                  {expr.example && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", marginBottom: 8 }}>&ldquo;{expr.example}&rdquo;</div>
                  )}
                  <button
                    onClick={() => !saved && onSaveExpression(expr, scenarioTitle, key)}
                    disabled={saved}
                    style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, border: `1.5px solid ${saved ? "var(--green)" : "var(--accent)"}`, background: saved ? "rgba(52,199,89,0.12)" : "transparent", color: saved ? "var(--green)" : "var(--accent)", cursor: saved ? "default" : "pointer", fontWeight: 700 }}
                  >
                    {saved ? tr.savedToNotebook : tr.saveToNotebook}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Shadow section ─────────────────────────────────────────────────────────────
function ShadowSection({ suggestedResponse, tr }: { suggestedResponse: string; tr: Tr }) {
  const [mode, setMode] = useState<"idle" | "recording" | "result">("idle");
  const [score, setScore] = useState<number | null>(null);
  const [highlights, setHighlights] = useState<{ word: string; matched: boolean }[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechAPI) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SpeechAPI() as any;
    rec.lang = "en-US"; rec.interimResults = false; rec.continuous = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join(" ");
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
      const modelWords = normalize(suggestedResponse);
      const userWords = normalize(text);
      const matched = modelWords.filter((w) => userWords.includes(w));
      const sc = modelWords.length > 0 ? Math.round((matched.length / modelWords.length) * 100) : 0;
      setScore(sc);
      setHighlights(modelWords.map((w) => ({ word: w, matched: userWords.includes(w) })));
      setMode("result");
    };
    rec.onerror = () => setMode("idle");
    rec.onend = () => setMode((prev) => (prev === "recording" ? "idle" : prev));
    recRef.current = rec;
  }, [suggestedResponse]);

  return (
    <div style={{ marginTop: 12 }}>
      {mode === "idle" && (
        <button onClick={() => { if (!recRef.current) return; setScore(null); setHighlights([]); setMode("recording"); recRef.current.start(); }} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 20, border: "1px solid var(--accent)", background: "var(--accent-bg)", color: "var(--accent)", cursor: "pointer", fontWeight: 700 }}>
          {tr.startRecordingBtn}
        </button>
      )}
      {mode === "recording" && (
        <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,59,48,0.08)", border: "1px solid var(--red)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "var(--red)", fontWeight: 700 }}>{tr.recording}</span>
          <button onClick={() => recRef.current?.stop()} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "var(--red)", color: "#FFFFFF", border: "none", cursor: "pointer", fontWeight: 700 }}>{tr.stop}</button>
        </div>
      )}
      {mode === "result" && score !== null && (
        <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--surface2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{tr.match(score)}</span>
            <button onClick={() => { setScore(null); setHighlights([]); setMode("idle"); }} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>{tr.tryAgain}</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {highlights.map((h, i) => (
              <span key={i} style={{ padding: "2px 6px", borderRadius: 4, background: h.matched ? "rgba(52,199,89,0.2)" : "rgba(255,59,48,0.15)", color: h.matched ? "var(--green)" : "var(--red)", fontWeight: h.matched ? 600 : 400, fontSize: 12 }}>{h.word}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Session summary ────────────────────────────────────────────────────────────
function SessionSummary({ feedback, turnCount, savedCount, tr, onContinue, onDone, onGoNotebook }: {
  feedback: Feedback; turnCount: number; savedCount: number; tr: Tr; onContinue: () => void; onDone: () => void; onGoNotebook: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
      <div className="animate-fade-slide-up" style={{ background: "var(--surface)", borderRadius: "24px 24px 0 0", padding: "28px 24px 40px", width: "100%", maxWidth: 640, boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>{tr.sessionComplete}</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{tr.savedToHistory(turnCount)}</p>
        </div>
        {feedback.encouragement && (
          <div style={{ background: "var(--surface2)", borderRadius: 16, padding: "16px 20px", marginBottom: 16, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, textAlign: "center" }}>
            {feedback.encouragement}
          </div>
        )}
        {savedCount > 0 && (
          <button
            onClick={onGoNotebook}
            style={{
              width: "100%", padding: "14px", marginBottom: 10,
              background: "var(--accent-bg)", borderRadius: 14,
              border: "1.5px solid var(--accent)",
              color: "var(--accent)", fontWeight: 700, fontSize: 14,
              cursor: "pointer", textAlign: "center",
            }}
          >
            📒 {tr.expressionsSaved(savedCount)}　→ ノートで復習する
          </button>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onContinue} style={{ flex: 1, padding: "14px", background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{tr.continuePractice}</button>
          <button onClick={onDone} style={{ flex: 1, padding: "14px", background: "var(--accent)", color: "#FFFFFF", border: "none", borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 14px rgba(0,102,204,0.3)" }}>{tr.doneHome}</button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 8 }}>{children}</div>;
}

const REASON_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  grammar:     { label: "🔧 文法",       bg: "rgba(255,149,0,0.15)",  color: "#FF9500" },
  collocation: { label: "🔗 コロケーション", bg: "rgba(0,102,204,0.12)", color: "var(--accent)" },
  literal:     { label: "🇯🇵 直訳",       bg: "rgba(255,59,48,0.12)",  color: "#FF3B30" },
  "set-phrase":{ label: "💬 定型表現",    bg: "rgba(175,82,222,0.12)", color: "#AF52DE" },
  formality:   { label: "🎯 フォーマリティ", bg: "rgba(0,199,190,0.12)",  color: "#00C7BE" },
  nuance:      { label: "🌀 ニュアンス",   bg: "rgba(142,142,147,0.15)","color": "var(--text-secondary)" },
};

function ReasonBadge({ reason }: { reason: string }) {
  const b = REASON_BADGE[reason];
  if (!b) return null;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      background: b.bg, color: b.color, flexShrink: 0,
    }}>
      {b.label}
    </span>
  );
}


function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-muted)", display: "inline-block", animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
      ))}
      <style>{`@keyframes bounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-5px); } }`}</style>
    </span>
  );
}

async function punctuateText(text: string): Promise<string> {
  try {
    const res = await fetch("/api/punctuate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const { corrected } = await res.json();
    return corrected || text;
  } catch {
    return text;
  }
}

function MicIcon({ recording }: { recording: boolean }) {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={recording ? "var(--red)" : "#FFFFFF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}
