"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "model";
  content: string;
}

const QUICK_CHIPS = [
  "How does AI credit scoring work?",
  "What is Tier A APR?",
  "How do repayments work?",
  "Is my invoice document public?",
];

function formatInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold text-[#98FFE8]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={idx} className="px-1 py-0.5 rounded bg-[#98FFE8]/10 text-[#98FFE8] font-mono text-[11px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function formatContent(text: string) {
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    const cleanLine = line.trim();
    if (!cleanLine) return <div key={lineIdx} className="h-1.5" />;

    if (cleanLine.startsWith("#")) {
      const headerText = cleanLine.replace(/^#+\s*/, "");
      return (
        <div key={lineIdx} className="font-bold text-[#98FFE8] mt-2 mb-1 text-xs uppercase tracking-wider">
          {formatInline(headerText)}
        </div>
      );
    }

    if (cleanLine.startsWith("* ") || cleanLine.startsWith("- ")) {
      const bulletText = cleanLine.replace(/^[*|-]\s*/, "");
      return (
        <div key={lineIdx} className="flex items-start gap-1.5 my-1 pl-1">
          <span className="text-[#98FFE8] font-bold text-xs leading-relaxed">•</span>
          <span className="flex-1">{formatInline(bulletText)}</span>
        </div>
      );
    }

    return (
      <div key={lineIdx} className="my-0.5">
        {formatInline(cleanLine)}
      </div>
    );
  });
}

export function RefluxChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      content:
        "Hello! I am **Reflux AI**, your institutional credit assistant. Ask me anything about invoice tokenization, risk tiers, X Layer contracts, or repayment settlement.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input.trim();
    if (!query || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: query }];
    setMessages(newMessages);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to get AI response");
      }

      setMessages((prev) => [...prev, json.data]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: `⚠️ Sorry, I encountered an issue connecting to the AI credit engine: ${message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-[#161A1D] border border-[#98FFE8]/40 shadow-2xl text-[#98FFE8] hover:scale-110 active:scale-95 transition-all flex items-center gap-2 group"
        aria-label="Toggle Reflux AI Assistant"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-[#98FFE8] animate-pulse" />
        <span className="text-xs font-bold text-[#F2FBF9] pr-1">Reflux AI</span>
        <svg className="w-5 h-5 fill-current text-[#98FFE8]" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z" />
        </svg>
      </button>

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-[360px] sm:w-[420px] h-[520px] rounded-2xl border border-[#98FFE8]/30 bg-[#161A1D]/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="p-4 border-b border-[#E3E0D6]/10 flex items-center justify-between bg-[#161A1D]">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#98FFE8] animate-pulse" />
              <div>
                <h3 className="text-xs font-bold text-[#F2FBF9]" style={{ fontFamily: "var(--font-display)" }}>
                  Reflux AI Assistant
                </h3>
                <span className="text-[10px] text-[#5B6479]">Gemini Credit Engine · X Layer</span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-[#5B6479] hover:text-[#F2FBF9] p-1 text-sm font-bold"
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-xl leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#98FFE8] text-[#161A1D] font-medium rounded-br-none"
                      : "bg-[#161A1D] border border-[#E3E0D6]/10 text-[#F2FBF9] rounded-bl-none shadow-md"
                  }`}
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {formatContent(msg.content)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#161A1D] border border-[#98FFE8]/20 text-[#98FFE8] p-3 rounded-xl rounded-bl-none text-xs animate-pulse">
                  Reflux AI is analyzing query...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-4 py-2 border-t border-[#E3E0D6]/10 flex gap-2 overflow-x-auto no-scrollbar">
            {QUICK_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip)}
                disabled={loading}
                className="px-2.5 py-1 rounded-full border border-[#E3E0D6]/15 bg-[#161A1D] text-[10px] font-semibold text-[#5B6479] hover:text-[#98FFE8] hover:border-[#98FFE8]/40 shrink-0 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-[#E3E0D6]/10 bg-[#161A1D] flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about AI risk, APRs, or contracts..."
              disabled={loading}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#161A1D] border border-[#E3E0D6]/20 text-xs text-[#F2FBF9] focus:border-[#98FFE8] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#161A1D] disabled:opacity-40 transition-all shadow-md shrink-0"
              style={{ background: "var(--gradient-surge)" }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
