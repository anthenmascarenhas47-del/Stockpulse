import { useState } from "react";

export default function ChatBot({ onClose }) {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hi! Ask me about any stock 📈" },
  ]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", text: input };
    setMessages(m => [...m, userMsg]);
    setInput("");

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input })
      });

      const response = await res.json();

      setMessages(m => [...m, { role: "ai", text: response.reply }]);
    } catch (err) {
      setMessages(m => [
        ...m,
        { role: "ai", text: "Error contacting server ❌" }
      ]);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[200] flex flex-col">
      
      {/* Header */}
      <div className="p-3 border-b border-slate-700 flex justify-between items-center">
        <span className="font-bold">SignalX AI 🤖</span>
        <button onClick={onClose}>✕</button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 text-sm">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-2 rounded max-w-[80%] ${
              m.role === "user"
                ? "bg-blue-600 ml-auto"
                : "bg-slate-800"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-700 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 bg-slate-800 rounded px-3 py-2 outline-none"
          placeholder="Ask about stocks..."
        />
        <button onClick={sendMessage} className="bg-blue-600 px-3 rounded">
          Send
        </button>
      </div>
    </div>
  );
}
