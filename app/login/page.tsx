"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import SpeaqLogo from "@/components/SpeaqLogo";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError("");
    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push("/");
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "エラーが発生しました";
      if (msg.includes("Invalid login credentials")) setError("メールアドレスまたはパスワードが違います");
      else if (msg.includes("User already registered")) setError("このメールアドレスはすでに登録されています");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: 640,
        width: "100%",
        margin: "0 auto",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}
    >
      <div style={{ marginBottom: 40 }}>
        <SpeaqLogo />
      </div>

      <div
        style={{
          width: "100%",
          background: "var(--surface)",
          borderRadius: 24,
          padding: "36px 28px",
          boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Tab */}
        <div style={{ display: "flex", background: "var(--surface2)", borderRadius: 12, padding: 4, gap: 4 }}>
          {(["login", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              style={{
                flex: 1, padding: "8px", borderRadius: 9, border: "none",
                background: mode === m ? "var(--surface)" : "transparent",
                color: mode === m ? "var(--text)" : "var(--text-muted)",
                fontWeight: mode === m ? 700 : 500,
                fontSize: 14, cursor: "pointer",
                boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s",
              }}
            >
              {m === "login" ? "ログイン" : "新規登録"}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{
              padding: "13px 16px", borderRadius: 12,
              border: "1.5px solid var(--border)",
              background: "var(--surface)", color: "var(--text)",
              fontSize: 15, fontFamily: "inherit", outline: "none",
              boxSizing: "border-box", width: "100%",
            }}
          />
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{
              padding: "13px 16px", borderRadius: 12,
              border: "1.5px solid var(--border)",
              background: "var(--surface)", color: "var(--text)",
              fontSize: 15, fontFamily: "inherit", outline: "none",
              boxSizing: "border-box", width: "100%",
            }}
          />
        </div>

        {error && (
          <p style={{ fontSize: 13, color: "var(--red)", margin: 0 }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !email || !password}
          style={{
            width: "100%", padding: "14px",
            background: loading || !email || !password
              ? "var(--surface2)"
              : "linear-gradient(135deg, #007AFF, #5856D6)",
            color: loading || !email || !password ? "var(--text-muted)" : "#fff",
            border: "none", borderRadius: 14,
            fontSize: 15, fontWeight: 700,
            cursor: loading || !email || !password ? "not-allowed" : "pointer",
            transition: "all 0.15s",
            letterSpacing: "-0.01em",
          }}
        >
          {loading ? "..." : mode === "login" ? "ログイン" : "アカウント作成"}
        </button>
      </div>
    </main>
  );
}
