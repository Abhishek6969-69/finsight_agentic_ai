"use client";

interface SuggestionCardProps {
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}

export default function SuggestionCard({ icon, title, subtitle, onClick }: SuggestionCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative text-left w-full rounded-xl p-4 transition-all duration-300 cursor-pointer"
      style={{
        background: "rgba(22, 27, 46, 0.5)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(26, 32, 53, 0.8)";
        e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.25)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(16, 185, 129, 0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(22, 27, 46, 0.5)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {title}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </p>
        </div>
      </div>
      {/* Hover glow corner accent */}
      <div
        className="absolute top-0 right-0 w-16 h-16 opacity-0 transition-opacity duration-300 rounded-tr-xl"
        style={{
          background: "radial-gradient(circle at top right, rgba(16, 185, 129, 0.12), transparent 70%)",
          opacity: 0,
        }}
      />
    </button>
  );
}
