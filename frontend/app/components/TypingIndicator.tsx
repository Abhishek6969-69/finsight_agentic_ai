"use client";

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block w-[6px] h-[6px] rounded-full"
          style={{
            background: "linear-gradient(135deg, #10b981, #06b6d4)",
            animation: `bounce-dot 1.4s ease-in-out ${i * 0.16}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
