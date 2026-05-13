"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, CheckCircle, XCircle, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface FileUploadProps {
  onUploadSuccess: () => void;
}

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState("");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setStatus("uploading");
      setMessage(`Uploading ${file.name}...`);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`${API_URL}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Upload failed");
        }

        const data = await res.json();
        setStatus("success");
        setMessage(`Indexed ${data.chunks} chunks from ${file.name}`);
        onUploadSuccess();

        setTimeout(() => {
          setStatus("idle");
          setMessage("");
        }, 3000);
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Upload failed");
        setTimeout(() => {
          setStatus("idle");
          setMessage("");
        }, 4000);
      }
    },
    [onUploadSuccess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    maxFiles: 1,
    disabled: status === "uploading",
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? "border-accent bg-accent/10"
            : status === "uploading"
            ? "border-surface-border bg-surface-hover cursor-not-allowed"
            : "border-surface-border hover:border-accent/60 hover:bg-surface-hover"
        }`}
      >
        <input {...getInputProps()} />

        {status === "uploading" ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
            <p className="text-xs text-slate-400">{message}</p>
          </div>
        ) : status === "success" ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
            <p className="text-xs text-emerald-400">{message}</p>
          </div>
        ) : status === "error" ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <XCircle className="w-6 h-6 text-red-400" />
            <p className="text-xs text-red-400">{message}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <Upload className="w-6 h-6 text-slate-500" />
            <div>
              <p className="text-xs font-medium text-slate-300">
                {isDragActive ? "Drop it here" : "Drop a file or click to upload"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">PDF, TXT, or MD</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
