import { useEffect, useRef, useState } from "react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

export default function BloodBridgeChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "model",
      text: "Hello There! 👋\nWelcome to BloodBridge. How can I help you today?",
    },
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const clearChat = () => {
    if (loading) return;

    setMessages([
      {
        role: "model",
        text: "Hello There! 👋\nWelcome to BloodBridge. How can I help you today?",
      },
    ]);
  };

  const sendMessage = async (e) => {
    e?.preventDefault();

    const message = input.trim();
    if (!message || loading) return;

    const history = messages.map(({ role, text }) => ({
      role,
      text,
    }));

    setMessages((prev) => [...prev, { role: "user", text: message }]);

    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/assistant/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          history,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text:
            data.reply || "I couldn't generate a response. Please try again.",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: error.message || "Unable to connect. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Toggle BloodBridge Assistant"
        style={{
          position: "fixed",
          bottom: 25,
          right: 25,
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: "none",
          background: "#dc2626",
          color: "white",
          fontSize: 26,
          cursor: "pointer",
          zIndex: 9999,
          boxShadow: "0 4px 15px rgba(0,0,0,0.25)",
        }}
      >
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            right: 25,
            width: "min(380px, calc(100vw - 32px))",
            height: "min(520px, calc(100dvh - 125px))",
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 5px 30px rgba(0,0,0,0.2)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 9999,
            fontFamily: "Arial, sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "#dc2626",
              color: "white",
              padding: 17,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <strong>BloodBridge AI Assistant</strong>
              <div style={{ fontSize: 12, marginTop: 5 }}>
                Your blood donation support assistant
              </div>
            </div>

            <button
              onClick={clearChat}
              disabled={loading}
              title="Clear conversation"
              style={{
                background: "transparent",
                color: "white",
                border: "1px solid rgba(255,255,255,0.6)",
                borderRadius: 7,
                padding: "6px 9px",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
              }}
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 14,
              background: "#f9fafb",
            }}
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    background: msg.role === "user" ? "#dc2626" : "#e5e7eb",
                    color: msg.role === "user" ? "white" : "#111827",
                    padding: "10px 13px",
                    borderRadius: 12,
                    maxWidth: "85%",
                    fontSize: 14,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div
                style={{
                  color: "#6b7280",
                  fontSize: 13,
                  marginBottom: 12,
                }}
              >
                BloodBridge AI is typing...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={sendMessage}
            style={{
              display: "flex",
              padding: 12,
              borderTop: "1px solid #e5e7eb",
              gap: 8,
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={loading}
              style={{
                flex: 1,
                minWidth: 0,
                padding: 11,
                border: "1px solid #d1d5db",
                borderRadius: 8,
                outline: "none",
              }}
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                background: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "0 15px",
                cursor: "pointer",
                opacity: loading || !input.trim() ? 0.5 : 1,
              }}
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
