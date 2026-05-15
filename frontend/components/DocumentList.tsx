"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, Trash2, Loader2, RefreshCw, WifiOff } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const FETCH_TIMEOUT_MS = 15000;

interface DocumentListProps {
  refreshTrigger: number;
}

type Status = "loading" | "waking" | "ready" | "error";

export default function DocumentList({ refreshTrigger }: DocumentListProps) {
  const [documents, setDocuments] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setStatus("loading");

    const slowTimer = setTimeout(() => setStatus("waking"), 4000);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const res = await fetch(`${API_URL}/documents`, { signal: controller.signal });
      clearTimeout(timeout);
      clearTimeout(slowTimer);

      const data = await res.json();
      setDocuments(data.documents || []);
      setStatus("ready");
    } catch {
      clearTimeout(slowTimer);
      setStatus("error");
      setDocuments([]);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, refreshTrigger]);

  const deleteDocument = async (filename: string) => {
    setDeleting(filename);
    try {
      await fetch(`${API_URL}/documents/${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      setDocuments((prev) => prev.filter((d) => d !== filename));
    } finally {
      setDeleting(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
      </div>
    );
  }

  if (status === "waking") {
    return (
      <div className="text-center py-6 space-y-2">
        <Loader2 className="w-5 h-5 text-accent animate-spin mx-auto" />
        <p className="text-xs text-slate-400 font-medium">Backend is waking up…</p>
        <p className="text-xs text-slate-600">This takes ~20s on first visit.</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="text-center py-6 space-y-2">
        <WifiOff className="w-6 h-6 text-slate-600 mx-auto" />
        <p className="text-xs text-slate-500">Could not reach the backend.</p>
        <button
          onClick={fetchDocuments}
          className="text-xs text-accent hover:text-accent-light transition-colors underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-6">
        <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-xs text-slate-500">No documents yet.</p>
        <p className="text-xs text-slate-600">Upload a file above to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">
          {documents.length} document{documents.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={fetchDocuments}
          className="text-slate-500 hover:text-slate-300 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {documents.map((doc) => (
        <div
          key={doc}
          className="flex items-center gap-2 px-2 py-2 rounded-lg bg-surface-hover border border-surface-border group"
        >
          <FileText className="w-3.5 h-3.5 text-accent-light flex-shrink-0" />
          <span className="text-xs text-slate-300 flex-1 truncate" title={doc}>
            {doc}
          </span>
          <button
            onClick={() => deleteDocument(doc)}
            disabled={deleting === doc}
            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all flex-shrink-0"
            title="Delete"
          >
            {deleting === doc ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
