"use client";

import { useState } from "react";
import { Brain, Github } from "lucide-react";
import ChatInterface from "@/components/ChatInterface";
import FileUpload from "@/components/FileUpload";
import DocumentList from "@/components/DocumentList";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshTrigger((n) => n + 1);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex-shrink-0 h-14 border-b border-surface-border flex items-center px-4 gap-3 bg-surface-card">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-100">RAG Chatbot</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-light border border-accent/30">
            AI
          </span>
        </div>
        <div className="flex-1" />
        <a
          href="https://github.com/franciscojavierguardado101"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <Github className="w-4 h-4" />
          <span className="hidden sm:inline">franciscojavierguardado101</span>
        </a>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 flex-shrink-0 border-r border-surface-border flex flex-col bg-surface-card overflow-hidden">
          <div className="p-4 border-b border-surface-border">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Documents
            </h2>
            <FileUpload onUploadSuccess={handleUploadSuccess} />
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <DocumentList refreshTrigger={refreshTrigger} />
          </div>

          {/* Stack info */}
          <div className="p-4 border-t border-surface-border">
            <p className="text-xs text-slate-600 font-medium mb-1.5">Built with</p>
            <div className="flex flex-wrap gap-1">
              {["LangChain", "OpenAI", "Chroma", "FastAPI", "Next.js"].map((tech) => (
                <span
                  key={tech}
                  className="text-xs px-1.5 py-0.5 rounded bg-surface-hover border border-surface-border text-slate-500"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </aside>

        {/* Chat */}
        <main className="flex-1 overflow-hidden">
          <ChatInterface />
        </main>
      </div>
    </div>
  );
}
