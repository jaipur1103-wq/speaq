export default function SpeaqLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
        <rect x="2" y="2" width="30" height="22" rx="8" fill="var(--accent)" />
        <path d="M8 24 L6 31 L15 24Z" fill="var(--accent)" />
        <rect x="10" y="11" width="3" height="6" rx="1.5" fill="white" />
        <rect x="15.5" y="8" width="3" height="12" rx="1.5" fill="white" />
        <rect x="21" y="10" width="3" height="8" rx="1.5" fill="white" />
      </svg>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text)", lineHeight: 1 }}>
          Speaq
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
          Business English Practice
        </div>
      </div>
    </div>
  );
}
