"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Sparkles, RefreshCw } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
}

interface ChatbotWidgetProps {
  currentEmployeeId: string;
  role: "admin" | "hr" | "employee";
}

function parseInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /(\*\*(.*?)\*\*|\*(.*?)\*)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    if (match[2] !== undefined) {
      parts.push(
        <strong key={match.index} className="font-semibold text-slate-900 dark:text-emerald-300">
          {match[2]}
        </strong>
      );
    } else if (match[3] !== undefined) {
      parts.push(
        <em key={match.index} className="italic text-slate-600 dark:text-gray-300">
          {match[3]}
        </em>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

function FormattedMessage({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={i} className="h-0.5" />;
        }

        if (trimmed.startsWith("### ") || trimmed.startsWith("#### ") || trimmed.startsWith("# ")) {
          const headingText = trimmed.replace(/^#+\s*/, "");
          return (
            <h4 key={i} className="font-semibold text-[12px] text-emerald-700 dark:text-emerald-400 mt-1 mb-1">
              {parseInlineMarkdown(headingText)}
            </h4>
          );
        }

        if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const bulletText = trimmed.replace(/^[•\-\*]\s*/, "");
          return (
            <div key={i} className="flex items-start space-x-1.5 pl-0.5 my-0.5">
              <span className="text-emerald-500 font-bold text-[10px] leading-relaxed select-none">•</span>
              <span className="flex-1 leading-relaxed">{parseInlineMarkdown(bulletText)}</span>
            </div>
          );
        }

        return (
          <p key={i} className="leading-relaxed">
            {parseInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
}

export default function ChatbotWidget({ currentEmployeeId, role }: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-init",
      sender: "bot",
      text: `Hello! I am your MGM FINANCIERS PRIV LIMITED AI Assistant. How can I help you today?`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Handle Quick Chips Click
  const handleQuickChipClick = (text: string) => {
    sendMessage(text);
  };

  // Send Message function
  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Build previous history format
      const chatHistory = messages
        .filter(m => m.id !== "msg-init") // skip greeting
        .map(m => ({
          role: m.sender === "user" ? "user" : "model",
          text: m.text
        }))
        .slice(-6); // Limit history for context size

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          employeeId: currentEmployeeId,
          chatHistory
        })
      });

      if (!response.ok) {
        throw new Error("Chat api response error");
      }

      const data = await response.json();
      
      const botMsg: Message = {
        id: `msg-res-${Date.now()}`,
        sender: "bot",
        text: data.text || "I am currently processing your query. Please rephrase or verify the connection.",
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg: Message = {
        id: `msg-err-${Date.now()}`,
        sender: "bot",
        text: "I encountered an issue connecting to the AI MGM FINANCIERS PRIV LIMITED Core. Please ensure your GEMINI_API_KEY is configured in Settings > Secrets.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const getQuickChips = () => {
    if (role === "admin" || role === "hr") {
      return [
        "How many present today?",
        "Who is on leave today?",
        "Show upcoming holidays",
        "What is the WFH policy?"
      ];
    }
    return [
      "What is my leave balance?",
      "Show upcoming holidays",
      "Explain the late-coming fine policy",
      "How to access secure client records?"
    ];
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-emerald-600 hover:bg-emerald-500 text-white p-3.5 rounded-full shadow-lg hover:shadow-emerald-950/20 hover:scale-105 transition-all flex items-center justify-center cursor-pointer border border-emerald-500/20"
        title="Chat with MGM FINANCIERS PRIV LIMITED AI"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5 fill-white" />}
      </button>

      {/* Expandable Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-3 sm:right-6 z-50 w-[calc(100vw-24px)] sm:w-[380px] h-[520px] max-h-[calc(100vh-95px)] bg-white dark:bg-[#0f0f0f] border border-slate-100 dark:border-[#1a1a1a] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all dark:neon-glow animate-fade-in">
          
          {/* Chat Header */}
          <div className="bg-linear-to-r from-emerald-600 to-teal-800 p-4 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <div className="bg-white/10 p-1.5 rounded-lg">
                <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-xs text-white">MGM FINANCIERS PRIV LIMITED Assistant</h3>
                <span className="text-[10px] text-emerald-200">Gemini 3.5 AI Core • Live</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4 bg-slate-50/50 dark:bg-[#0a0a0a]/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-emerald-600 text-white rounded-tr-xs"
                      : "bg-white dark:bg-[#1a1a1a] border border-slate-100/50 dark:border-[#222]/80 text-slate-800 dark:text-gray-200 rounded-tl-xs shadow-xs"
                  }`}
                >
                  {msg.sender === "bot" ? <FormattedMessage text={msg.text} /> : msg.text}
                </div>
                <span className="text-[9px] text-slate-400 font-mono mt-1 px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center space-x-1.5 text-slate-400 dark:text-gray-500 text-[11px] font-medium font-mono pl-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                <span>Assistant is thinking...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Context Chips */}
          <div className="px-3 py-2 bg-white dark:bg-[#0f0f0f] border-t border-slate-50 dark:border-[#1a1a1a] overflow-x-auto scrollbar-none flex gap-1.5 whitespace-nowrap shrink-0">
            {getQuickChips().map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickChipClick(chip)}
                className="text-[10px] font-semibold text-slate-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 bg-slate-50 hover:bg-slate-100 dark:bg-[#1a1a1a] dark:hover:bg-[#222] border border-slate-100 dark:border-[#222] px-2.5 py-1 rounded-full transition-colors cursor-pointer shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleFormSubmit}
            className="p-3 bg-white dark:bg-[#0f0f0f] border-t border-slate-100 dark:border-[#1a1a1a] flex gap-2"
          >
            <input
              type="text"
              required
              placeholder="Ask me anything..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4 h-4 fill-white" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
