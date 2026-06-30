"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatUI() {
  const [ticker, setTicker] = useState("AAPL");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit() {
    if (!query.trim() || loading) return;

    const userMessage: Message = { role: "user", content: `[${ticker}] ${query}` };
    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setLoading(true);

    // add empty assistant message we'll stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, query }),
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
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
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-screen p-4">
      {/* Header */}
      <div className="py-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-purple-400">FinSight</h1>
        <p className="text-gray-500 text-sm">Multi-agent financial analyst</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-gray-600 mt-20">
            <p className="text-lg">Ask anything about a stock.</p>
            <p className="text-sm mt-2">Set the ticker, type your question, hit Enter.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === "user"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-100"
              }`}
            >
            {msg.role === "assistant" ? (
  <ReactMarkdown>{msg.content}</ReactMarkdown>
) : (
  msg.content
)}
              {msg.role === "assistant" && loading && i === messages.length - 1 && (
                <span className="inline-block w-1.5 h-4 bg-purple-400 ml-1 animate-pulse" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 pt-4 pb-2 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="w-24 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm font-mono text-purple-300 focus:outline-none focus:border-purple-500"
            placeholder="AAPL"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            placeholder="Should I buy this stock?"
            disabled={loading}
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            {loading ? "..." : "Ask"}
          </button>
        </div>
        <p className="text-xs text-gray-600 text-center">
          Not financial advice. For educational purposes only.
        </p>
      </div>
    </div>
  );
}