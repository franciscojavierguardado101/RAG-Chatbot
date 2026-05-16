"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, Github } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "RAG Chatbot" },
  { href: "/machine-learning", label: "Machine Learning" },
];

export default function NavHeader() {
  const pathname = usePathname();

  return (
    <>
      {/* Intro Banner */}
      <section
        className="flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #0f0c2e 0%, #1e1b4b 30%, #3730a3 65%, #6366f1 100%)" }}
      >
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-indigo-300">
              AI Engineer
            </p>
            <h2 className="text-lg font-bold text-white leading-tight">
              Francisco Javier Guardado
            </h2>
          </div>
          <div className="bg-black/40 border border-white/10 rounded-xl px-5 py-3 max-w-lg">
            <p className="text-xs font-semibold tracking-widest uppercase text-indigo-300 mb-1">
              Tech Stack
            </p>
            <p className="text-xs font-medium text-white/90 tracking-wide leading-relaxed">
              LangChain · OpenAI · ChromaDB · FastAPI · Python · Next.js 14 · TypeScript · Tailwind CSS · Deployed on Render &amp; Vercel
            </p>
          </div>
        </div>
      </section>

      {/* App Header + Nav */}
      <header className="flex-shrink-0 h-14 border-b border-surface-border flex items-center px-4 gap-3 bg-surface-card">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-100">AI Portfolio</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-light border border-accent/30">
            AI
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 ml-4">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  active
                    ? "bg-accent text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-surface-hover"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

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
    </>
  );
}
