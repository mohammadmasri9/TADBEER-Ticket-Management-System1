// client/src/components/AIFloatingAssistant.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Bot, X, Send, Loader2, AlertCircle, Sparkles, Copy } from "lucide-react";
import { assistTicketAI, chatAI, TicketStatus } from "../../api/ai";

type ChatRole = "user" | "assistant";
type ChatMsg = { id: string; role: ChatRole; content: string; ts: number };

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function AIFloatingAssistant() {
  const location = useLocation();
  const params = useParams();

  const ticketId =
    (params as any)?.ticketId || (params as any)?.id || (params as any)?._id || "";

  const isTicketDetails = useMemo(() => {
    const p = location.pathname.toLowerCase();
    return p.includes("/tickets/") && !!ticketId;
  }, [location.pathname, ticketId]);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    {
      id: uid(),
      role: "assistant",
      content: "Hi! I'm Tadbeer Assistant 🤖\nAsk me anything. If you're inside a ticket, I can analyze it too.",
      ts: Date.now(),
    },
  ]);

  const [suggestedStatus, setSuggestedStatus] = useState<TicketStatus | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, 0);
  }, [open, messages.length]);

  const pageContext = useMemo(() => {
    return {
      path: location.pathname,
      mode: isTicketDetails ? "ticket-details" : "general",
      ticketId: isTicketDetails ? ticketId : null,
    };
  }, [location.pathname, isTicketDetails, ticketId]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setErr("");
    setSuggestedStatus(null);

    const userMsg: ChatMsg = { id: uid(), role: "user", content: text, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      if (isTicketDetails) {
        const res = await assistTicketAI({ ticketId, question: text });

        setSuggestedStatus(res.suggestedStatus || null);

        const parts: string[] = [];
        if (res.suggestedStatus) parts.push(`Suggested Status: ${res.suggestedStatus}`);
        if (res.reply) parts.push(res.reply);
        if (res.steps?.length) parts.push(`Steps:\n${res.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`);
        if (res.clarifyingQuestion) parts.push(`Clarifying Question:\n${res.clarifyingQuestion}`);

        const botMsg: ChatMsg = {
          id: uid(),
          role: "assistant",
          content: parts.filter(Boolean).join("\n\n"),
          ts: Date.now(),
        };

        setMessages((prev) => [...prev, botMsg]);
        return;
      }

      const payload = {
        messages: messages
          .concat(userMsg)
          .slice(-20)
          .map((m) => ({ role: m.role, content: m.content })),
        pageContext,
      };

      const res = await chatAI(payload);

      const parts: string[] = [];
      if (res.reply) parts.push(res.reply);
      if (res.steps?.length) parts.push(`Steps:\n${res.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`);
      if (res.clarifyingQuestion) parts.push(`Clarifying Question:\n${res.clarifyingQuestion}`);

      const botMsg: ChatMsg = {
        id: uid(),
        role: "assistant",
        content: parts.filter(Boolean).join("\n\n"),
        ts: Date.now(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "AI request failed");
    } finally {
      setLoading(false);
    }
  };

  const copyLast = async () => {
    try {
      const last = [...messages].reverse().find((m) => m.role === "assistant");
      if (!last?.content) return;
      await navigator.clipboard.writeText(last.content);
    } catch {}
  };

  const resetChat = () => {
    setErr("");
    setSuggestedStatus(null);
    setInput("");
    setMessages([
      {
        id: uid(),
        role: "assistant",
        content: "Hi! I'm Tadbeer Assistant 🤖\nAsk me anything. If you're inside a ticket, I can analyze it too.",
        ts: Date.now(),
      },
    ]);
  };

  return (
    <>
      {/* Original Floating Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          zIndex: 9999,
          border: "none",
          borderRadius: "50%",
          width: 64,
          height: 64,
          cursor: "pointer",
          boxShadow: "0 8px 32px rgba(230, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)",
          background: "linear-gradient(135deg, #E60000 0%, #B30000 100%)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title="Open AI Assistant"
        aria-label="Open AI Assistant"
      >
        <Bot size={28} strokeWidth={2.5} />
      </button>

      {open && (
        <div className="ai-overlay" onClick={() => setOpen(false)}>
          <div className="ai-container" onClick={(e) => e.stopPropagation()}>
            {/* Modern Header */}
            <div className="ai-header">
              <div className="ai-header-left">
                <div className="ai-avatar">
                  <Bot size={22} strokeWidth={2.5} />
                </div>
                <div className="ai-header-info">
                  <div className="ai-title">Tadbeer Assistant</div>
                  <div className="ai-subtitle">
                    {isTicketDetails ? `Ticket #${ticketId.slice(0, 8)}` : "General chat"}
                  </div>
                </div>
              </div>

              <div className="ai-header-right">
                <button
                  type="button"
                  onClick={copyLast}
                  className="ai-icon-btn"
                  title="Copy last reply"
                >
                  <Copy size={16} />
                </button>

                <button
                  type="button"
                  onClick={resetChat}
                  className="ai-icon-btn"
                  title="Reset chat"
                >
                  <Sparkles size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="ai-icon-btn"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Status Banner */}
            {(err || suggestedStatus) && (
              <div className="ai-banner">
                {err && (
                  <div className="ai-error-badge">
                    <AlertCircle size={18} /> {err}
                  </div>
                )}
                {suggestedStatus && (
                  <div className="ai-status-badge">
                    Suggested Status: {suggestedStatus}
                  </div>
                )}
              </div>
            )}

            {/* Modern Messages Area */}
            <div ref={listRef} className="ai-chat-area">
              {messages.map((m, idx) => {
                const isUser = m.role === "user";
                const prevMsg = messages[idx - 1];
                const showAvatar = !prevMsg || prevMsg.role !== m.role;

                return (
                  <div
                    key={m.id}
                    className={`ai-message-row ${isUser ? "ai-message-row-user" : "ai-message-row-assistant"}`}
                  >
                    {!isUser && (
                      <div className="ai-message-avatar">
                        {showAvatar ? (
                          <div className="ai-bot-avatar">
                            <Bot size={16} strokeWidth={2.5} />
                          </div>
                        ) : (
                          <div style={{ width: 32 }} />
                        )}
                      </div>
                    )}

                    <div className={`ai-bubble ${isUser ? "ai-bubble-user" : "ai-bubble-assistant"}`}>
                      {m.content}
                    </div>

                    {isUser && <div style={{ width: 32 }} />}
                  </div>
                );
              })}

              {loading && (
                <div className="ai-message-row ai-message-row-assistant">
                  <div className="ai-message-avatar">
                    <div className="ai-bot-avatar">
                      <Bot size={16} strokeWidth={2.5} />
                    </div>
                  </div>
                  <div className="ai-bubble ai-bubble-assistant ai-bubble-loading">
                    <Loader2 size={16} className="ai-spinner" /> Thinking...
                  </div>
                </div>
              )}
            </div>

            {/* Modern Input Area */}
            <div className="ai-input-container">
              <div className="ai-input-wrapper">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={1}
                  placeholder={isTicketDetails ? "Ask about this ticket..." : "Type your message..."}
                  className="ai-input"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className={`ai-send ${loading || !input.trim() ? "ai-send-disabled" : ""}`}
                  aria-label="Send"
                  title="Send"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>

            {/* Modern Styles */}
            <style>{`
              .ai-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                animation: overlayFadeIn 0.2s ease-out;
              }

              @keyframes overlayFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }

              .ai-container {
                width: min(900px, 96vw);
                height: min(720px, 90vh);
                border-radius: 20px;
                background: #ffffff;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                overflow: hidden;
                display: flex;
                flex-direction: column;
                animation: containerSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
              }

              @keyframes containerSlideUp {
                from {
                  opacity: 0;
                  transform: translateY(20px) scale(0.96);
                }
                to {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }

              /* Header */
              .ai-header {
                padding: 20px 24px;
                background: linear-gradient(135deg, #E60000 0%, #B30000 100%);
                color: #fff;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid rgba(255, 255, 255, 0.15);
              }

              .ai-header-left {
                display: flex;
                align-items: center;
                gap: 14px;
              }

              .ai-avatar {
                width: 42px;
                height: 42px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid rgba(255, 255, 255, 0.3);
              }

              .ai-header-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
              }

              .ai-title {
                font-weight: 700;
                font-size: 17px;
                letter-spacing: -0.3px;
              }

              .ai-subtitle {
                font-size: 12px;
                opacity: 0.9;
                font-weight: 500;
              }

              .ai-header-right {
                display: flex;
                gap: 8px;
                align-items: center;
              }

              .ai-icon-btn {
                border: none;
                background: rgba(255, 255, 255, 0.2);
                color: #fff;
                cursor: pointer;
                width: 36px;
                height: 36px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                border: 1px solid rgba(255, 255, 255, 0.25);
              }

              .ai-icon-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: translateY(-1px);
              }

              .ai-icon-btn:active {
                transform: translateY(0);
              }

              /* Banner */
              .ai-banner {
                padding: 12px 20px;
                background: #f8fafc;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                flex-direction: column;
                gap: 8px;
              }

              .ai-error-badge {
                padding: 10px 14px;
                border-radius: 12px;
                background: #fef2f2;
                border: 1px solid #fecaca;
                color: #991b1b;
                display: flex;
                gap: 8px;
                align-items: center;
                font-weight: 600;
                font-size: 13px;
              }

              .ai-status-badge {
                display: inline-flex;
                padding: 8px 14px;
                border-radius: 999px;
                background: #0f766e;
                color: #fff;
                font-weight: 700;
                font-size: 12px;
                align-self: flex-start;
              }

              /* Chat Area */
              .ai-chat-area {
                flex: 1;
                overflow-y: auto;
                padding: 24px 20px;
                background: #f8fafc;
                display: flex;
                flex-direction: column;
                gap: 4px;
              }

              .ai-chat-area::-webkit-scrollbar {
                width: 6px;
              }

              .ai-chat-area::-webkit-scrollbar-track {
                background: transparent;
              }

              .ai-chat-area::-webkit-scrollbar-thumb {
                background: rgba(0, 0, 0, 0.15);
                border-radius: 999px;
              }

              .ai-chat-area::-webkit-scrollbar-thumb:hover {
                background: rgba(0, 0, 0, 0.25);
              }

              /* Message Row */
              .ai-message-row {
                display: flex;
                gap: 10px;
                margin-bottom: 8px;
                animation: messageFadeIn 0.3s ease-out;
              }

              @keyframes messageFadeIn {
                from {
                  opacity: 0;
                  transform: translateY(8px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }

              .ai-message-row-user {
                justify-content: flex-end;
              }

              .ai-message-row-assistant {
                justify-content: flex-start;
              }

              .ai-message-avatar {
                display: flex;
                align-items: flex-end;
              }

              .ai-bot-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: linear-gradient(135deg, #E60000 0%, #B30000 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                box-shadow: 0 2px 8px rgba(230, 0, 0, 0.25);
              }

              /* Chat Bubbles */
              .ai-bubble {
                max-width: 70%;
                padding: 12px 16px;
                border-radius: 18px;
                line-height: 1.6;
                white-space: pre-wrap;
                word-wrap: break-word;
                font-size: 14px;
                position: relative;
              }

              .ai-bubble-user {
                background: linear-gradient(135deg, #E60000 0%, #B30000 100%);
                color: #fff;
                border-bottom-right-radius: 6px;
                box-shadow: 0 2px 12px rgba(230, 0, 0, 0.25);
              }

              .ai-bubble-assistant {
                background: #ffffff;
                color: #1e293b;
                border-bottom-left-radius: 6px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                border: 1px solid #e2e8f0;
              }

              .ai-bubble-loading {
                display: inline-flex;
                gap: 8px;
                align-items: center;
                font-weight: 500;
                color: #64748b;
              }

              /* Input Area */
              .ai-input-container {
                padding: 16px 20px;
                background: #ffffff;
                border-top: 1px solid #e2e8f0;
              }

              .ai-input-wrapper {
                display: flex;
                gap: 10px;
                align-items: flex-end;
                background: #f8fafc;
                border: 2px solid #e2e8f0;
                border-radius: 16px;
                padding: 8px;
                transition: all 0.2s ease;
              }

              .ai-input-wrapper:focus-within {
                border-color: #E60000;
                background: #ffffff;
                box-shadow: 0 0 0 3px rgba(230, 0, 0, 0.1);
              }

              .ai-input {
                flex: 1;
                resize: none;
                padding: 8px 12px;
                border: none;
                background: transparent;
                outline: none;
                font-size: 14px;
                line-height: 1.5;
                font-family: inherit;
                color: #1e293b;
                max-height: 120px;
              }

              .ai-input::placeholder {
                color: #94a3b8;
              }

              .ai-send {
                border: none;
                width: 44px;
                height: 44px;
                border-radius: 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                flex-shrink: 0;
                background: linear-gradient(135deg, #E60000 0%, #B30000 100%);
                color: #fff;
                box-shadow: 0 4px 12px rgba(230, 0, 0, 0.3);
              }

              .ai-send:hover:not(.ai-send-disabled) {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(230, 0, 0, 0.4);
              }

              .ai-send:active:not(.ai-send-disabled) {
                transform: translateY(0);
              }

              .ai-send-disabled {
                background: #cbd5e1;
                color: #94a3b8;
                cursor: not-allowed;
                box-shadow: none;
              }

              .ai-spinner {
                animation: spin 1s linear infinite;
              }

              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }

              /* Responsive */
              @media (max-width: 640px) {
                .ai-container {
                  width: 100vw;
                  height: 100vh;
                  border-radius: 0;
                }

                .ai-bubble {
                  max-width: 80%;
                }
              }
            `}</style>
          </div>
        </div>
      )}
    </>
  );
}
