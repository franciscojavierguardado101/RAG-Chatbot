import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAG Chatbot — Chat With Your Documents",
  description: "Upload documents and chat with them using AI. Built with LangChain, OpenAI, and Chroma.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-slate-200 antialiased">{children}</body>
    </html>
  );
}
