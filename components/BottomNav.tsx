"use client";

import { usePathname, useRouter } from "next/navigation";
import { Mic, BookOpen, Brain, BarChart2, HelpCircle } from "lucide-react";
import { getSettings } from "@/lib/storage";
import { i18n } from "@/lib/i18n";
import { useState, useEffect } from "react";
import type { Language } from "@/types";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    setLang(getSettings().language ?? "en");
    const handleLangChange = (e: Event) => setLang((e as CustomEvent<Language>).detail);
    window.addEventListener("speaq:langchange", handleLangChange);
    return () => window.removeEventListener("speaq:langchange", handleLangChange);
  }, []);

  // Hide during practice
  if (pathname.startsWith("/practice")) return null;
  // Hide on create page
  if (pathname === "/create") return null;

  const tr = i18n[lang];

  const tabs = [
    { path: "/", label: tr.navPractice, Icon: Mic },
    { path: "/notebook", label: tr.navNotebook, Icon: BookOpen },
    { path: "/quiz", label: tr.navQuiz, Icon: Brain },
    { path: "/history", label: tr.navHistory, Icon: BarChart2 },
    { path: "/guide", label: tr.navGuide, Icon: HelpCircle },
  ];

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "var(--surface)",
      borderTop: "1px solid var(--border)",
      display: "flex",
      zIndex: 100,
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {tabs.map(({ path, label, Icon }) => {
        const active = pathname === path;
        return (
          <button
            key={path}
            onClick={() => router.push(path)}
            style={{
              flex: 1, padding: "10px 0 12px",
              border: "none", background: "transparent",
              color: active ? "var(--accent)" : "var(--text-muted)",
              cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              transition: "color 0.15s",
            }}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: "0.02em" }}>
              {label}
            </span>
            <div style={{ width: 18, height: 3, borderRadius: 2, background: active ? "var(--accent)" : "transparent", transition: "background 0.15s" }} />
          </button>
        );
      })}
    </nav>
  );
}
