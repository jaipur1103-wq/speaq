"use client";

import { useState, useEffect } from "react";
import { sendToJoplinAPI, getJoplinToken, saveJoplinToken, getJoplinPort, saveJoplinPort } from "@/lib/joplin-export";

interface Props {
  title: string;
  markdown: string;
  lang: "en" | "ja";
  onClose: () => void;
}

export default function JoplinExportModal({ title, markdown, lang, onClose }: Props) {
  const isJa = lang === "ja";
  const [copied, setCopied] = useState(false);
  const [apiExpanded, setApiExpanded] = useState(false);
  const [token, setToken] = useState("");
  const [port, setPort] = useState(41184);
  const [apiStatus, setApiStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    setToken(getJoplinToken());
    setPort(getJoplinPort());
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement("textarea");
      el.value = markdown;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9ぁ-ん一-龯]/g, "_")}_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendAPI = async () => {
    if (!token.trim()) return;
    saveJoplinToken(token.trim());
    saveJoplinPort(port);
    setApiStatus("sending");
    setApiError("");
    const result = await sendToJoplinAPI(title, markdown, token.trim(), port);
    if (result.success) {
      setApiStatus("ok");
    } else {
      setApiStatus("error");
      setApiError(result.error ?? "Unknown error");
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%", maxWidth: 640,
        background: "var(--surface)", borderRadius: "24px 24px 0 0",
        maxHeight: "88vh", display: "flex", flexDirection: "column",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.25)",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 20px 14px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: "1px solid var(--border)", flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
              {isJa ? "Joplinに送る" : "Export to Joplin"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{title}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--surface2)", border: "none",
              cursor: "pointer", fontSize: 16, color: "var(--text-secondary)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Markdown preview */}
        <div style={{ flex: 1, overflow: "auto", padding: "14px 16px" }}>
          <textarea
            readOnly
            value={markdown}
            style={{
              width: "100%", height: 240,
              padding: "10px 12px", borderRadius: 12,
              background: "var(--surface2)", border: "1px solid var(--border)",
              color: "var(--text-secondary)", fontSize: 11,
              fontFamily: "monospace", lineHeight: 1.6,
              resize: "none", outline: "none",
              boxSizing: "border-box",
            }}
          />

          {/* Copy / Download buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button
              onClick={handleCopy}
              style={{
                flex: 1, padding: "13px",
                background: copied ? "var(--green)" : "var(--accent)",
                border: "none", borderRadius: 14,
                color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: "pointer", transition: "background 0.2s",
              }}
            >
              {copied
                ? (isJa ? "✓ コピーしました" : "✓ Copied!")
                : (isJa ? "📋 クリップボードにコピー" : "📋 Copy to Clipboard")}
            </button>
            <button
              onClick={handleDownload}
              style={{
                padding: "13px 16px",
                background: "var(--surface2)", border: "1px solid var(--border)",
                borderRadius: 14, color: "var(--text)", fontSize: 14,
                fontWeight: 700, cursor: "pointer",
              }}
            >
              ⬇︎ .md
            </button>
          </div>

          {/* Joplin API section */}
          <div style={{
            marginTop: 16, borderRadius: 14,
            border: "1px solid var(--border)",
            overflow: "hidden",
          }}>
            <button
              onClick={() => setApiExpanded((v) => !v)}
              style={{
                width: "100%", padding: "13px 16px",
                background: "transparent", border: "none",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                cursor: "pointer", color: "var(--text-secondary)",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                🖥 {isJa ? "Joplin APIで直接送る（デスクトップ用）" : "Send via Joplin API (desktop)"}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)", transform: apiExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                ▼
              </span>
            </button>

            {apiExpanded && (
              <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 12 }}>
                  {isJa
                    ? "Joplinデスクトップアプリ → 設定 → Web Clipper → 認証トークンをコピーして入力してください。"
                    : "Open Joplin desktop → Settings → Web Clipper → copy your Authorization Token."}
                </p>

                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {isJa ? "トークン" : "Token"}
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={isJa ? "Joplin APIトークンを貼り付け" : "Paste Joplin API token"}
                  style={{
                    width: "100%", padding: "10px 12px",
                    background: "var(--surface2)", border: "1px solid var(--border)",
                    borderRadius: 10, color: "var(--text)", fontSize: 13,
                    outline: "none", boxSizing: "border-box", marginBottom: 10,
                    fontFamily: "monospace",
                  }}
                />

                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {isJa ? "ポート（デフォルト: 41184）" : "Port (default: 41184)"}
                </label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value, 10))}
                  style={{
                    width: 120, padding: "10px 12px",
                    background: "var(--surface2)", border: "1px solid var(--border)",
                    borderRadius: 10, color: "var(--text)", fontSize: 13,
                    outline: "none", boxSizing: "border-box", marginBottom: 12,
                  }}
                />

                <button
                  onClick={handleSendAPI}
                  disabled={!token.trim() || apiStatus === "sending"}
                  style={{
                    width: "100%", padding: "12px",
                    background: apiStatus === "ok" ? "var(--green)" : apiStatus === "error" ? "#FF3B30" : "var(--accent)",
                    border: "none", borderRadius: 12,
                    color: "#fff", fontSize: 13, fontWeight: 700,
                    cursor: token.trim() ? "pointer" : "not-allowed",
                    opacity: token.trim() ? 1 : 0.5,
                    transition: "background 0.2s",
                  }}
                >
                  {apiStatus === "sending"
                    ? (isJa ? "送信中..." : "Sending...")
                    : apiStatus === "ok"
                      ? (isJa ? "✓ Joplinに送りました" : "✓ Sent to Joplin!")
                      : (isJa ? "Joplinに送る" : "Send to Joplin")}
                </button>

                {apiStatus === "error" && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#FF3B30", lineHeight: 1.5 }}>
                    {isJa ? "エラー: " : "Error: "}{apiError}
                    <br />
                    {isJa
                      ? "Joplinデスクトップが起動しているか、Web Clipperが有効か確認してください。"
                      : "Make sure Joplin desktop is running and Web Clipper is enabled."}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
