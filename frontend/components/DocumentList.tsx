"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, Trash2, Loader2, RefreshCw } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DocumentListProps {
  refreshTrigger: number;
}

export default function DocumentList({ refreshTrigger }: DocumentListProps) {
  const [documents, setDocuments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/documents`);
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
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
        <span className="text-xs text-slate-500">{documents.length} document{documents.length !== 1 ? "s" : ""}</span>
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
