"use client";

import { usePathname, useRouter } from "next/navigation";
import { Mic, BookOpen, BarChart2 } from "lucide-react";
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
  }, []);

  // Hide during practice
  if (pathname.startsWith("/practice")) return null;
  // Hide on guide / create pages
  if (pathname === "/guide" || pathname === "/create") return null;

  const tr = i18n[lang];

  const tabs = [
    { path: "/", label: tr.navPractice, Icon: Mic },
    { path: "/notebook", label: tr.navNotebook, Icon: BookOpen },
    { path: "/history", label: tr.navHistory, Icon: BarChart2 },
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
          </button>
        );
      })}
    </nav>
  );
}
