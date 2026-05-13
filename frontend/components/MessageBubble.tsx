"use client";

import ReactMarkdown from "react-markdown";
import { Bot, User, FileText } from "lucide-react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  isStreaming?: boolean;
}

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? "bg-accent" : "bg-surface-card border border-surface-border"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-accent-light" />
        )}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-accent text-white rounded-tr-sm"
              : "bg-surface-card border border-surface-border text-slate-200 rounded-tl-sm"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown>{message.content}</ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-accent-light ml-0.5 animate-blink align-middle" />
              )}
            </div>
          )}
        </div>

        {/* Source citations */}
        {!isUser && message.sources && message.sources.length > 0 && !message.isStreaming && (
          <div className="flex flex-wrap gap-1.5">
            {message.sources.map((source) => (
              <span
                key={source}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-surface-hover border border-surface-border text-slate-400"
              >
                <FileText className="w-3 h-3" />
                {source}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
