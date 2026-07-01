"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import TypingIndicator from "./TypingIndicator";
import SuggestionCard from "./SuggestionCard";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  {
    icon: "📊",
    title: "Analyze AAPL",
    subtitle: "Full breakdown of Apple's valuation & momentum",
    ticker: "AAPL",
    query: "Give me a complete analysis — valuation, earnings trend, and market sentiment",
  },
  {
    icon: "⚡",
    title: "NVDA momentum check",
    subtitle: "Is NVIDIA still running or overextended?",
    ticker: "NVDA",
    query: "What does the current momentum look like? Is it overbought?",
  },
  {
    icon: "🏦",
    title: "TCS earnings outlook",
    subtitle: "Latest earnings and forward guidance",
    ticker: "TCS",
    query: "How are the recent earnings and what's the forward outlook?",
  },
  {
    icon: "🔍",
    title: "Compare TSLA",
    subtitle: "Tesla valuation vs peers and recent news",
    ticker: "TSLA",
    query: "How does Tesla's current valuation compare to its fundamentals?",
  },
];

export default function ChatUI() {
  const [ticker, setTicker] = useState("AAPL");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(overrideTicker?: string, overrideQuery?: string) {
    const t = overrideTicker || ticker;
    const q = overrideQuery || query;
    if (!q.trim() || loading) return;

    if (overrideTicker) setTicker(overrideTicker);

    const userMessage: Message = { role: "user", content: `[${t}] ${q}` };
    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setLoading(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: t, query: q }),
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const json = JSON.parse(line.replace("data: ", ""));
            if (json.done) break;
            if (json.token) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: updated[updated.length - 1].content + json.token,
                };
                return updated;
              });
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "⚠️ Connection error — make sure the backend is running on `localhost:8000`.",
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestionClick(t: string, q: string) {
    setTicker(t);
    setQuery(q);
    handleSubmit(t, q);
  }

  function handleNewChat() {
    setMessages([]);
    setQuery("");
    setLoading(false);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ═══════════════════════════════════════════
          SIDEBAR
          ═══════════════════════════════════════════ */}
      <aside
        className="sidebar-panel flex flex-col h-full transition-all duration-300 flex-shrink-0"
        style={{
          width: sidebarOpen ? "280px" : "0px",
          minWidth: sidebarOpen ? "280px" : "0px",
          opacity: sidebarOpen ? 1 : 0,
          overflow: "hidden",
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        {/* Sidebar Header / Brand */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "var(--accent-gradient)", boxShadow: "0 2px 12px rgba(16,185,129,0.25)" }}
            >
              F
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                FinSight
              </h1>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                AI Financial Analyst
              </p>
            </div>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
            style={{
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.2)",
              color: "var(--text-accent)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(16,185,129,0.14)";
              e.currentTarget.style.borderColor = "rgba(16,185,129,0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(16,185,129,0.08)";
              e.currentTarget.style.borderColor = "rgba(16,185,129,0.2)";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Analysis
          </button>
        </div>

        {/* Divider */}
        <div className="mx-5 mb-3" style={{ borderTop: "1px solid var(--border-subtle)" }} />

        {/* Quick Prompts */}
        <div className="px-4 flex-1 overflow-y-auto">
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: "var(--text-muted)" }}>
            Quick Prompts
          </p>
          <div className="space-y-2">
            {SUGGESTIONS.map((s, i) => (
              <SuggestionCard
                key={i}
                icon={s.icon}
                title={s.title}
                subtitle={s.subtitle}
                onClick={() => handleSuggestionClick(s.ticker, s.query)}
              />
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="px-5 py-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{ background: "rgba(16,185,129,0.06)", color: "var(--text-muted)" }}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: "#10b981",
                boxShadow: "0 0 6px rgba(16,185,129,0.6)",
                animation: "glow-pulse 2s ease-in-out infinite",
              }}
            />
            <span>3 agents • Groq LLM • MCP tools</span>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════
          MAIN CHAT PANEL
          ═══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Top Bar */}
        <header
          className="flex items-center justify-between px-6 py-3 flex-shrink-0"
          style={{
            background: "rgba(11,14,23,0.8)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div className="flex items-center gap-3">
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="15" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Current ticker display */}
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-1 rounded-md text-xs font-mono font-bold tracking-wide"
                style={{
                  background: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.2)",
                  color: "var(--text-accent)",
                }}
              >
                {ticker}
              </span>
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Stock Analysis
              </span>
            </div>
          </div>

          {/* Status */}
          <div
            className="flex items-center gap-2 text-xs font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "#10b981",
                boxShadow: "0 0 6px rgba(16,185,129,0.6)",
                animation: "glow-pulse 2s ease-in-out infinite",
              }}
            />
            AI Online
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-5">
            {/* Empty State */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center pt-24 pb-8 animate-fade-in">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                  style={{
                    background: "var(--accent-gradient)",
                    boxShadow: "0 0 50px rgba(16,185,129,0.15)",
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>

                <h2 className="text-3xl font-bold tracking-tight mb-3 gradient-text-animated">
                  What would you like to analyze?
                </h2>
                <p className="text-base mb-4" style={{ color: "var(--text-muted)" }}>
                  Select a prompt from the sidebar, or type a ticker and question below.
                </p>
                <p className="text-sm" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                  Our multi-agent system fetches live price data, earnings, and news to give you a comprehensive view.
                </p>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 animate-fade-in ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                style={{ animationDelay: "0.05s" }}
              >
                {/* Assistant avatar */}
                {msg.role === "assistant" && (
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-1"
                    style={{
                      background: "var(--accent-gradient)",
                      boxShadow: "0 2px 8px rgba(16,185,129,0.2)",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={msg.role === "user" ? "max-w-[65%]" : "max-w-[85%]"}
                  style={{
                    borderRadius: "var(--radius-lg)",
                    padding: "14px 18px",
                    ...(msg.role === "user"
                      ? {
                          background: "var(--accent-gradient)",
                          color: "white",
                          borderBottomRightRadius: "6px",
                        }
                      : {
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border-subtle)",
                          borderBottomLeftRadius: "6px",
                        }),
                  }}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose-chat">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                      {loading && i === messages.length - 1 && msg.content === "" && (
                        <TypingIndicator />
                      )}
                      {loading && i === messages.length - 1 && msg.content !== "" && (
                        <span
                          className="inline-block w-[3px] h-[16px] ml-0.5 rounded-sm"
                          style={{
                            background: "var(--accent-from)",
                            animation: "glow-pulse 1s ease-in-out infinite",
                            verticalAlign: "text-bottom",
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>

                {/* User avatar */}
                {msg.role === "user" && (
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-1 text-xs font-bold"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-medium)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    U
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Input Bar ── */}
        <div className="flex-shrink-0 px-6 pb-5 pt-2">
          <div className="max-w-4xl mx-auto">
            <div
              className="glass rounded-2xl p-3"
              style={{ boxShadow: "0 -4px 30px rgba(0,0,0,0.3)" }}
            >
              <div className="flex items-center gap-3">
                {/* Ticker chip */}
                <div
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-mono font-semibold tracking-wide cursor-text flex-shrink-0"
                  style={{
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    color: "var(--text-accent)",
                  }}
                  onClick={() => document.getElementById("ticker-input")?.focus()}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                  </svg>
                  <input
                    id="ticker-input"
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    className="w-14 bg-transparent border-none outline-none text-xs font-mono font-semibold tracking-wide"
                    style={{ color: "var(--text-accent)" }}
                    placeholder="AAPL"
                    maxLength={6}
                  />
                </div>

                {/* Query input */}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="flex-1 bg-transparent border-none outline-none text-sm"
                  style={{
                    color: "var(--text-primary)",
                    caretColor: "var(--accent-from)",
                  }}
                  placeholder="Ask anything about this stock…"
                  disabled={loading}
                />

                {/* Send button */}
                <button
                  onClick={() => handleSubmit()}
                  disabled={loading || !query.trim()}
                  className="flex items-center justify-center w-9 h-9 rounded-xl text-white transition-all duration-200 flex-shrink-0 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  style={{
                    background: loading || !query.trim() ? "var(--bg-elevated)" : "var(--accent-gradient)",
                    boxShadow:
                      !loading && query.trim() ? "0 2px 12px rgba(16,185,129,0.3)" : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && query.trim()) {
                      e.currentTarget.style.transform = "scale(1.08)";
                      e.currentTarget.style.boxShadow = "0 4px 20px rgba(16,185,129,0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow =
                      !loading && query.trim() ? "0 2px 12px rgba(16,185,129,0.3)" : "none";
                  }}
                >
                  {loading ? (
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <p
              className="text-center mt-2.5 text-xs"
              style={{ color: "var(--text-muted)", opacity: 0.6 }}
            >
              Not financial advice. For educational purposes only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}