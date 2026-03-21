"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Feedback, Message, NaturalExpression, Scenario, TurnScore } from "@/types";
import { saveExpression, getSettings, saveScoreRecord } from "@/lib/storage";
import { i18n } from "@/lib/i18n";
import type { Tr } from "@/lib/i18n";

type ChatItem =
  | { kind: "message"; data: Message }
  | { kind: "feedback"; data: Feedback; turn: number; scenarioTitle: string };

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
  const [interimText, setInterimText] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [loadingReply, setLoadingReply] = useState(false);
  const [turnScores, setTurnScores] = useState<TurnScore[]>([]);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [turn, setTurn] = useState(1);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showSummary, setShowSummary] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [tr, setTr] = useState<Tr>(i18n.en);
  const [lang, setLang] = useState<"en" | "ja">("en");

  // Recording time
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("current_scenario");
    if (!raw) { router.push("/"); return; }
    const s: Scenario = JSON.parse(raw);
    setScenario(s);
    setChatItems([{ kind: "message", data: { role: "counterpart", text: s.opener, timestamp: Date.now() } }]);
    const settings = getSettings();
    const l = settings.language ?? "en";
    setLang(l);
    setTr(i18n[l]);
  }, [router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatItems, loadingFeedback, loadingReply]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechAPI) { setSpeechSupported(false); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SpeechAPI() as any;
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    let finalText = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + " ";
        else interim = e.results[i][0].transcript;
      }
      setInputText(finalText);
      setInterimText(interim);
    };
    rec.onerror = () => { stopRecordingTimer(); setIsRecording(false); setInterimText(""); };
    rec.onend = () => { stopRecordingTimer(); setIsRecording(false); setInterimText(""); };
    recognitionRef.current = rec;
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

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      stopRecordingTimer();
      setIsRecording(false);
    } else {
      setInputText("");
      setInterimText("");
      recognitionRef.current.start();
      setIsRecording(true);
      startRecordingTimer();
    }
  };

  const handleRetake = () => {
    setInputText("");
    setInterimText("");
    setRecordingSeconds(0);
  };

  const handleSend = async () => {
    const text = (inputText + " " + interimText).trim();
    if (!text || !scenario) return;
    if (isRecording) { recognitionRef.current?.stop(); stopRecordingTimer(); setIsRecording(false); }

    const userMsg: Message = { role: "user", text, timestamp: Date.now() };
    const currentTurn = turn;
    setChatItems((prev) => [...prev, { kind: "message", data: userMsg }]);
    setInputText("");
    setInterimText("");
    setRecordingSeconds(0);
    setTurn((t) => t + 1);

    const allMessages = chatItems
      .filter((i) => i.kind === "message")
      .map((i) => (i as { kind: "message"; data: Message }).data);

    const lastCounterpart = [...allMessages].reverse().find((m) => m.role === "counterpart");

    setLoadingFeedback(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          counterpartMessage: lastCounterpart?.text ?? scenario.opener,
          userResponse: text,
          language: lang,
        }),
      });
      const fb: Feedback = await res.json();
      setTurnScores((prev) => [...prev, { turn: currentTurn, overall: fb.overall, scores: fb.scores }]);
      setTimeout(() => {
        setChatItems((prev) => [
          ...prev,
          { kind: "feedback", data: fb, turn: currentTurn, scenarioTitle: scenario.title },
        ]);
      }, 500);
    } catch { /* silent */ } finally {
      setLoadingFeedback(false);
    }

    setLoadingReply(true);
    try {
      const res = await fetch("/api/counterpart-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          conversationHistory: [...allMessages, userMsg],
          userMessage: text,
        }),
      });
      const { reply } = await res.json();
      setTimeout(() => {
        setChatItems((prev) => [
          ...prev,
          { kind: "message", data: { role: "counterpart", text: reply, timestamp: Date.now() } },
        ]);
      }, 1800);
    } catch { /* silent */ } finally {
      setLoadingReply(false);
    }
  };

  const handleSaveExpression = (expr: NaturalExpression, scenarioTitle: string, exprKey: string) => {
    saveExpression({ ...expr, scenarioTitle });
    setSavedIds((prev) => new Set(prev).add(exprKey));
  };

  const doSaveScore = (scores: TurnScore[], title: string) => {
    if (scores.length === 0 || scoreSaved) return;
    const overall = Math.round(scores.reduce((a, b) => a + b.overall, 0) / scores.length);
    const avgScores = {
      grammar: Math.round(scores.reduce((a, b) => a + b.scores.grammar, 0) / scores.length),
      vocabulary: Math.round(scores.reduce((a, b) => a + b.scores.vocabulary, 0) / scores.length),
      naturalness: Math.round(scores.reduce((a, b) => a + b.scores.naturalness, 0) / scores.length),
      communication: Math.round(scores.reduce((a, b) => a + b.scores.communication, 0) / scores.length),
    };
    saveScoreRecord({ date: new Date().toISOString().slice(0, 10), scenarioTitle: title, overall, scores: avgScores, turnCount: scores.length });
    setScoreSaved(true);
  };

  const handleBack = () => {
    if (turnScores.length > 0 && scenario) {
      doSaveScore(turnScores, scenario.title);
      setShowSummary(true);
    } else {
      router.push("/");
    }
  };

  if (!scenario) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-muted)" }}>Loading...</div>;
  }

  const hasInput = inputText.trim().length > 0;
  const avgScore = turnScores.length ? Math.round(turnScores.reduce((a, b) => a + b.overall, 0) / turnScores.length) : null;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", height: "100dvh", background: "var(--bg)" }}>

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
          {avgScore !== null && <ScoreBadge score={avgScore} label="avg" />}
        </div>
      </div>

      {/* Briefing */}
      <BriefingArea scenario={scenario} tr={tr} />

      {/* Score trend */}
      {turnScores.length > 0 && (
        <div style={{ padding: "6px 16px", background: "var(--surface2)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, overflowX: "auto" }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{tr.progress}</span>
          {turnScores.map((ts) => (
            <div key={ts.turn} style={{ display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>T{ts.turn}</span>
              <ScoreBadge score={ts.overall} small />
            </div>
          ))}
        </div>
      )}

      {/* Chat */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {chatItems.map((item, i) =>
          item.kind === "message" ? (
            <ChatBubble key={i} msg={item.data} personaName={scenario.personaName} tr={tr} />
          ) : (
            <FeedbackPanel key={i} feedback={item.data} turn={item.turn} scenarioTitle={item.scenarioTitle} savedIds={savedIds} tr={tr} onSaveExpression={handleSaveExpression} />
          )
        )}
        {loadingFeedback && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "4px 0" }}>{tr.analyzing}</div>
        )}
        {loadingReply && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <Avatar name={scenario.personaName} />
            <div style={{ background: "var(--surface)", borderRadius: "18px 18px 18px 4px", padding: "12px 16px", fontSize: 13, color: "var(--text-muted)", boxShadow: "var(--shadow-sm)" }}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input area — voice-first, large mic */}
      <div style={{ padding: "16px 16px 28px", borderTop: "1px solid var(--border)", background: "var(--surface)", boxShadow: "0 -4px 20px rgba(0,0,0,0.06)" }}>
        {!speechSupported && (
          <p style={{ fontSize: 12, color: "var(--orange)", marginBottom: 10, textAlign: "center" }}>{tr.speechNotSupported}</p>
        )}

        {/* State: has input text → show preview + send/retake */}
        {hasInput && !isRecording ? (
          <div>
            <div style={{ background: "var(--surface2)", borderRadius: 14, padding: "12px 16px", marginBottom: 12, fontSize: 14, color: "var(--text)", lineHeight: 1.6, minHeight: 48 }}>
              {inputText.trim()}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleRetake}
                style={{ flex: 1, padding: "13px", borderRadius: 14, background: "var(--surface2)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                {tr.retake}
              </button>
              <button
                onClick={handleSend}
                style={{ flex: 2, padding: "13px", borderRadius: 14, background: "var(--accent)", color: "#FFFFFF", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 14px rgba(0,102,204,0.3)" }}
              >
                {tr.send} →
              </button>
            </div>
          </div>
        ) : (
          /* State: idle or recording → show large mic */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <button
              onClick={toggleRecording}
              className={isRecording ? "animate-pulse-ring" : ""}
              style={{
                width: 88, height: 88, borderRadius: "50%",
                border: `3px solid ${isRecording ? "var(--red)" : "transparent"}`,
                background: isRecording ? "rgba(255,59,48,0.1)" : "var(--accent)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
                boxShadow: isRecording ? "0 0 0 6px rgba(255,59,48,0.12)" : "0 6px 20px rgba(0,102,204,0.4)",
              }}
              aria-label={isRecording ? tr.stopRecording : tr.startRecording}
            >
              <MicIcon recording={isRecording} />
            </button>

            {isRecording ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--red)", letterSpacing: "0.04em" }}>
                  🔴 {fmtTime(recordingSeconds)}
                </div>
                {interimText && (
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6, maxWidth: 280, lineHeight: 1.5 }}>
                    {interimText}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
                {tr.tapToSpeak}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Session Summary Modal */}
      {showSummary && scenario && (
        <SessionSummary turnScores={turnScores} savedCount={savedIds.size} tr={tr} onContinue={() => setShowSummary(false)} onDone={() => router.push("/")} />
      )}
    </div>
  );
}

// ── Briefing area with translate support ──────────────────────────────────────
function BriefingArea({ scenario, tr }: { scenario: Scenario; tr: Tr }) {
  const [briefTrans, setBriefTrans] = useState<string | null>(null);
  const [showBriefTrans, setShowBriefTrans] = useState(false);
  const [briefTranslating, setBriefTranslating] = useState(false);
  const [phraseTrans, setPhraseTrans] = useState<string[] | null>(null);
  const [showPhraseTrans, setShowPhraseTrans] = useState(false);
  const [phraseTranslating, setPhraseTranslating] = useState(false);

  const translateBrief = async () => {
    if (showBriefTrans) { setShowBriefTrans(false); return; }
    if (briefTrans) { setShowBriefTrans(true); return; }
    setBriefTranslating(true);
    try {
      const res = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texts: [scenario.brief] }) });
      const d = await res.json();
      setBriefTrans(d.translations?.[0] ?? null);
      setShowBriefTrans(true);
    } catch { /* silent */ } finally { setBriefTranslating(false); }
  };

  const translatePhrases = async () => {
    if (showPhraseTrans) { setShowPhraseTrans(false); return; }
    if (phraseTrans) { setShowPhraseTrans(true); return; }
    setPhraseTranslating(true);
    try {
      const res = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texts: scenario.keyPhrases }) });
      const d = await res.json();
      setPhraseTrans(d.translations ?? null);
      setShowPhraseTrans(true);
    } catch { /* silent */ } finally { setPhraseTranslating(false); }
  };

  return (
    <div style={{ padding: "12px 16px", background: "var(--accent-bg)", borderBottom: "1px solid var(--border)" }}>
      <p style={{ color: "var(--accent)", fontSize: 13, margin: "0 0 4px", lineHeight: 1.6, fontWeight: 500 }}>
        {scenario.brief}
      </p>
      {showBriefTrans && briefTrans && (
        <p style={{ color: "var(--accent)", fontSize: 12, margin: "0 0 8px", lineHeight: 1.6, opacity: 0.8, borderLeft: "2px solid var(--accent)", paddingLeft: 8 }}>
          {briefTrans}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <button
          onClick={translateBrief}
          style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, border: `1px solid ${showBriefTrans ? "var(--accent)" : "rgba(0,102,204,0.3)"}`, background: showBriefTrans ? "rgba(0,102,204,0.15)" : "transparent", color: "var(--accent)", cursor: "pointer", fontWeight: 600 }}
        >
          {briefTranslating ? tr.translating : showBriefTrans ? tr.hideTranslation : tr.translate}
        </button>
      </div>

      {/* Key phrases with label */}
      {scenario.keyPhrases.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: showPhraseTrans && phraseTrans ? 6 : 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
              {tr.keyPhrasesHint}
            </span>
            {scenario.keyPhrases.map((p) => (
              <span key={p} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "var(--accent)", color: "#FFFFFF", fontWeight: 700 }}>
                {p}
              </span>
            ))}
            <button
              onClick={translatePhrases}
              style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, border: `1px solid ${showPhraseTrans ? "var(--accent)" : "rgba(0,102,204,0.3)"}`, background: showPhraseTrans ? "rgba(0,102,204,0.15)" : "transparent", color: "var(--accent)", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}
            >
              {phraseTranslating ? tr.translating : showPhraseTrans ? tr.hideTranslation : tr.translate}
            </button>
          </div>
          {showPhraseTrans && phraseTrans && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
              {scenario.keyPhrases.map((p, i) => (
                <span key={p} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(0,102,204,0.12)", color: "var(--accent)", fontWeight: 500 }}>
                  {phraseTrans[i] ?? p}
                </span>
              ))}
            </div>
          )}
        </div>
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
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flexDirection: isUser ? "row-reverse" : "row", maxWidth: "90%" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            marginLeft: isUser ? 0 : 38,
            padding: "12px 16px",
            borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            background: isUser ? "var(--accent)" : "var(--surface)",
            color: isUser ? "#FFFFFF" : "var(--text)",
            fontSize: 14, lineHeight: 1.6, boxShadow: "var(--shadow-sm)",
          }}>
            {msg.text}
          </div>
          {showTrans && translation && (
            <div style={{ marginLeft: isUser ? 0 : 38, marginTop: 4, padding: "8px 14px", borderRadius: 10, background: "var(--surface2)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {translation}
            </div>
          )}
        </div>
        {!isUser && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 38, flexShrink: 0 }}>
            <button onClick={handleSpeak} style={{ width: 28, height: 28, borderRadius: "50%", background: speaking ? "var(--accent-bg)" : "var(--surface2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, transition: "all 0.15s" }} title={speaking ? tr.stop : tr.readAloud}>
              {speaking ? "⏸" : "🔊"}
            </button>
            <button onClick={handleTranslate} style={{ width: 28, height: 28, borderRadius: "50%", background: showTrans ? "var(--accent-bg)" : "var(--surface2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, transition: "all 0.15s" }} title={showTrans ? tr.hideTranslation : tr.translate}>
              {translating ? "⏳" : "🌐"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Feedback panel ─────────────────────────────────────────────────────────────
function FeedbackPanel({ feedback, turn, scenarioTitle, savedIds, tr, onSaveExpression }: {
  feedback: Feedback; turn: number; scenarioTitle: string; savedIds: Set<string>; tr: Tr;
  onSaveExpression: (expr: NaturalExpression, scenarioTitle: string, key: string) => void;
}) {
  const [showSuggested, setShowSuggested] = useState(false);
  const [showShadow, setShowShadow] = useState(false);
  const [expandedExample, setExpandedExample] = useState<string | null>(null);
  const overall = feedback.overall;
  const scoreColor = overall >= 70 ? "var(--green)" : overall >= 40 ? "var(--orange)" : "var(--red)";

  const axisLabel = (key: string) => {
    const map: Record<string, string> = { grammar: tr.grammar, vocabulary: tr.vocabulary, naturalness: tr.naturalness, communication: tr.communication };
    return map[key] ?? key;
  };

  return (
    <div className="animate-fade-slide-up" style={{ background: "var(--surface)", borderRadius: 18, padding: "16px 18px", boxShadow: "var(--shadow-md)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontWeight: 700, fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{tr.feedbackTitle(turn)}</span>
        <span style={{ padding: "4px 12px", borderRadius: 20, background: scoreColor + "22", color: scoreColor, fontWeight: 700, fontSize: 15 }}>{overall}/100</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {(Object.entries(feedback.scores) as [string, number][]).map(([key, val]) => (
          <ScoreRow key={key} label={axisLabel(key)} value={val} />
        ))}
      </div>
      {feedback.encouragement && (
        <div style={{ padding: "10px 14px", borderRadius: 12, background: "linear-gradient(135deg, rgba(52,199,89,0.08), rgba(48,209,88,0.08))", border: "1px solid rgba(52,199,89,0.25)", marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#34C759", textTransform: "uppercase", letterSpacing: "0.06em" }}>🌱 {tr.encouragementTitle}</span>
          <p style={{ fontSize: 13, color: "var(--text)", margin: "4px 0 0", lineHeight: 1.6 }}>{feedback.encouragement}</p>
        </div>
      )}
      {feedback.strengths.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>{tr.whatWorked}</SectionLabel>
          {feedback.strengths.map((s, i) => (
            <div key={i} style={{ fontSize: 13, color: "var(--text-secondary)", paddingLeft: 12, lineHeight: 1.6, borderLeft: "2.5px solid var(--green)", marginBottom: 4 }}>{s}</div>
          ))}
        </div>
      )}
      {feedback.improvements.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>{tr.tryNextTime}</SectionLabel>
          {feedback.improvements.map((s, i) => (
            <div key={i} style={{ fontSize: 13, color: "var(--text-secondary)", paddingLeft: 12, lineHeight: 1.6, borderLeft: "2.5px solid var(--orange)", marginBottom: 4 }}>{s}</div>
          ))}
        </div>
      )}
      {feedback.naturalExpressions?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>{tr.moreNatural}</SectionLabel>
          {feedback.naturalExpressions.map((expr, i) => {
            const key = `${turn}-${i}`;
            const saved = savedIds.has(key);
            return (
              <div key={i} style={{ background: "var(--surface2)", borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, textDecoration: "line-through" }}>{expr.original}</div>
                <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 700, marginBottom: 5 }}>→ {expr.natural}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 8 }}>{expr.explanation}</div>
                {expandedExample === expr.original && expr.example && (
                  <div style={{ fontSize: 12, color: "var(--accent)", lineHeight: 1.6, marginBottom: 8, borderLeft: "2px solid var(--accent)", paddingLeft: 8, fontStyle: "italic" }}>
                    &ldquo;{expr.example}&rdquo;
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {expr.example && (
                    <button
                      onClick={() => setExpandedExample(expandedExample === expr.original ? null : expr.original)}
                      style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, border: `1px solid ${expandedExample === expr.original ? "var(--accent)" : "var(--border)"}`, background: expandedExample === expr.original ? "var(--accent-bg)" : "transparent", color: expandedExample === expr.original ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", fontWeight: 600 }}
                    >
                      {expandedExample === expr.original ? tr.hideExample : tr.showExample}
                    </button>
                  )}
                  <button
                    onClick={() => !saved && onSaveExpression(expr, scenarioTitle, key)}
                    disabled={saved}
                    style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, border: `1.5px solid ${saved ? "var(--green)" : "var(--border)"}`, background: saved ? "rgba(52,199,89,0.12)" : "transparent", color: saved ? "var(--green)" : "var(--text-muted)", cursor: saved ? "default" : "pointer", fontWeight: 700 }}
                  >
                    {saved ? tr.savedToNotebook : tr.saveToNotebook}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {feedback.foundPhrases?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
          {feedback.foundPhrases.map((p, i) => (
            <span key={i} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "var(--accent-bg)", color: "var(--accent)", fontWeight: 700 }}>{p}</span>
          ))}
        </div>
      )}
      {feedback.suggestedResponse && (
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setShowSuggested(!showSuggested)} style={{ fontSize: 12, color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
              {showSuggested ? tr.hideModelResponse : tr.showModelResponse}
            </button>
            <button onClick={() => { setShowSuggested(true); setShowShadow(true); }} style={{ fontSize: 12, padding: "3px 12px", borderRadius: 20, border: "1px solid var(--border)", background: showShadow ? "var(--accent-bg)" : "transparent", color: showShadow ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer", fontWeight: 600 }}>
              {tr.shadowThis}
            </button>
          </div>
          {showSuggested && (
            <div style={{ marginTop: 10, padding: "12px 14px", background: "var(--surface2)", borderRadius: 12, fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic", lineHeight: 1.6 }}>
              &ldquo;{feedback.suggestedResponse}&rdquo;
            </div>
          )}
          {showShadow && <ShadowSection suggestedResponse={feedback.suggestedResponse} tr={tr} />}
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
function SessionSummary({ turnScores, savedCount, tr, onContinue, onDone }: {
  turnScores: TurnScore[]; savedCount: number; tr: Tr; onContinue: () => void; onDone: () => void;
}) {
  const avg = Math.round(turnScores.reduce((a, b) => a + b.overall, 0) / turnScores.length);
  const trend = turnScores.length >= 2 ? turnScores[turnScores.length - 1].overall - turnScores[0].overall : 0;
  const axisKeys: (keyof TurnScore["scores"])[] = ["grammar", "vocabulary", "naturalness", "communication"];
  const axisAvgs = axisKeys.map((key) => ({
    key,
    label: (tr as Record<string, unknown>)[key] as string ?? key,
    value: Math.round(turnScores.reduce((a, b) => a + b.scores[key], 0) / turnScores.length),
  }));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
      <div className="animate-fade-slide-up" style={{ background: "var(--surface)", borderRadius: "24px 24px 0 0", padding: "28px 24px 40px", width: "100%", maxWidth: 640, boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>{tr.sessionComplete}</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{tr.savedToHistory(turnScores.length)}</p>
        </div>
        <div style={{ background: "var(--surface2)", borderRadius: 16, padding: "18px 20px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{tr.overallAverage}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: avg >= 70 ? "var(--green)" : avg >= 40 ? "var(--orange)" : "var(--red)", letterSpacing: "-0.02em" }}>{avg}/100</div>
          </div>
          {trend !== 0 && <div style={{ fontSize: 14, fontWeight: 700, color: trend > 0 ? "var(--green)" : "var(--red)" }}>{trend > 0 ? "↑" : "↓"} {Math.abs(trend)} pts</div>}
        </div>
        {turnScores.length > 1 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 8 }}>{tr.turnScores}</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {turnScores.map((ts, i) => (
                <div key={ts.turn} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {i > 0 && <span style={{ color: "var(--text-muted)", fontSize: 12 }}>→</span>}
                  <ScoreBadge score={ts.overall} />
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 8 }}>{tr.axisAverages}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {axisAvgs.map(({ label, value }) => <ScoreRow key={label} label={label} value={value} />)}
          </div>
        </div>
        {savedCount > 0 && (
          <div style={{ background: "var(--accent-bg)", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
            <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{tr.expressionsSaved(savedCount)}</span>
          </div>
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

function ScoreRow({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "var(--green)" : value >= 40 ? "var(--orange)" : "var(--red)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 12, color: "var(--text-secondary)", width: 120 }}>{label}</span>
      <div style={{ flex: 1, height: 5, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, width: 28, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function ScoreBadge({ score, label, small }: { score: number; label?: string; small?: boolean }) {
  const color = score >= 70 ? "var(--green)" : score >= 40 ? "var(--orange)" : "var(--red)";
  return (
    <span style={{ padding: small ? "2px 7px" : "3px 11px", borderRadius: 20, background: color + "22", color, fontWeight: 700, fontSize: small ? 11 : 13 }}>
      {score}{label ? ` ${label}` : ""}
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
