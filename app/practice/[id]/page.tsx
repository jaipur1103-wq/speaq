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
  const [interimText, setInterimText] = useState("");
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
    setSessionLength(settings.sessionLength ?? 5);
  }, [router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatItems, loadingReply, loadingFinalFeedback, finalFeedback]);

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

  const callFeedbackApi = async (turns: PendingTurn[]) => {
    if (!scenario) return;
    setLoadingFinalFeedback(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, turns, language: lang }),
      });
      const fb: Feedback = await res.json();
      setFinalFeedback(fb);
    } catch { /* silent */ } finally {
      setLoadingFinalFeedback(false);
    }
  };

  const handleSend = async () => {
    const text = (inputText + " " + interimText).trim();
    if (!text || !scenario) return;
    if (isRecording) { recognitionRef.current?.stop(); stopRecordingTimer(); setIsRecording(false); }

    const userMsg: Message = { role: "user", text, timestamp: Date.now() };
    const allMessages = chatItems.map((i) => i.data);
    const lastCounterpart = [...allMessages].reverse().find((m) => m.role === "counterpart");
    const newTurn: PendingTurn = { userMessage: text, counterpartMessage: lastCounterpart?.text ?? scenario.opener };
    const newPendingTurns = [...pendingTurns, newTurn];

    setChatItems((prev) => [...prev, { kind: "message", data: userMsg }]);
    setInputText("");
    setInterimText("");
    setRecordingSeconds(0);
    setTurn((t) => t + 1);
    setPendingTurns(newPendingTurns);

    const isLastTurn = newPendingTurns.length >= sessionLength;

    if (isLastTurn) {
      await callFeedbackApi(newPendingTurns);
    } else {
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
    }
  };

  const handleFinishEarly = () => {
    if (pendingTurns.length === 0 || loadingFinalFeedback) return;
    callFeedbackApi(pendingTurns);
  };

  const handleSaveExpression = (expr: NaturalExpression, scenarioTitle: string, exprKey: string) => {
    saveExpression({ ...expr, scenarioTitle });
    setSavedIds((prev) => new Set(prev).add(exprKey));
  };

  const doSaveScore = (fb: Feedback, title: string) => {
    if (scoreSaved) return;
    saveScoreRecord({ date: new Date().toISOString().slice(0, 10), scenarioTitle: title, overall: fb.overall, scores: fb.scores, turnCount: pendingTurns.length });
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
          {finalFeedback && <ScoreBadge score={finalFeedback.overall} />}
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
        {finalFeedback && (
          <FeedbackPanel feedback={finalFeedback} scenarioTitle={scenario.title} savedIds={savedIds} tr={tr} onSaveExpression={handleSaveExpression} />
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
          {sessionDone ? null : hasInput && !isRecording ? (
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
              {interimText && (
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4, textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {interimText}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Session Summary Modal */}
      {showSummary && scenario && finalFeedback && (
        <SessionSummary feedback={finalFeedback} turnCount={pendingTurns.length} savedCount={savedIds.size} tr={tr} onContinue={() => setShowSummary(false)} onDone={() => router.push("/")} />
      )}
    </div>
  );
}

// ── Briefing area with translate support ──────────────────────────────────────
function BriefingArea({ scenario, tr }: { scenario: Scenario; tr: Tr }) {
  const [briefTrans, setBriefTrans] = useState<string | null>(null);
  const [showBriefTrans, setShowBriefTrans] = useState(false);
  const [briefTranslating, setBriefTranslating] = useState(false);

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
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
            {tr.keyPhrasesHint}
          </span>
          {scenario.keyPhrases.map((p) => (
            <span key={p} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "var(--accent)", color: "#FFFFFF", fontWeight: 700 }}>
              {p}
            </span>
          ))}
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
function FeedbackPanel({ feedback, scenarioTitle, savedIds, tr, onSaveExpression }: {
  feedback: Feedback; scenarioTitle: string; savedIds: Set<string>; tr: Tr;
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
        <span style={{ fontWeight: 700, fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{tr.sessionFeedbackTitle}</span>
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
            const key = `session-${i}`;
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
function SessionSummary({ feedback, turnCount, savedCount, tr, onContinue, onDone }: {
  feedback: Feedback; turnCount: number; savedCount: number; tr: Tr; onContinue: () => void; onDone: () => void;
}) {
  const overall = feedback.overall;
  const color = overall >= 70 ? "var(--green)" : overall >= 40 ? "var(--orange)" : "var(--red)";
  const axisEntries = Object.entries(feedback.scores) as [string, number][];
  const axisLabel = (key: string) => {
    const map: Record<string, string> = { grammar: tr.grammar, vocabulary: tr.vocabulary, naturalness: tr.naturalness, communication: tr.communication };
    return map[key] ?? key;
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
      <div className="animate-fade-slide-up" style={{ background: "var(--surface)", borderRadius: "24px 24px 0 0", padding: "28px 24px 40px", width: "100%", maxWidth: 640, boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>{tr.sessionComplete}</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{tr.savedToHistory(turnCount)}</p>
        </div>
        <div style={{ background: "var(--surface2)", borderRadius: 16, padding: "18px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{tr.overallAverage}</div>
          <div style={{ fontSize: 36, fontWeight: 700, color, letterSpacing: "-0.02em", marginBottom: 14 }}>{overall}/100</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {axisEntries.map(([key, val]) => <ScoreRow key={key} label={axisLabel(key)} value={val} />)}
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
