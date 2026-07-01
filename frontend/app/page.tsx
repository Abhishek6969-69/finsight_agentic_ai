import ChatUI from "@/app/components/ChatUI";

export default function Home() {
  return (
    <main className="relative h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* Ambient background glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 30% 0%, rgba(16, 185, 129, 0.04) 0%, transparent 70%), " +
            "radial-gradient(ellipse 40% 40% at 85% 90%, rgba(6, 182, 212, 0.03) 0%, transparent 60%)",
        }}
      />
      <div className="relative z-10 h-full">
        <ChatUI />
      </div>
    </main>
  );
}