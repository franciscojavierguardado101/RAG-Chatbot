"use client";

import { useState } from "react";
import { Send, Loader2, ThumbsUp, ThumbsDown, Minus, RotateCcw } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const EXAMPLES = [
  "I absolutely love this product! It exceeded all my expectations and the customer service was outstanding.",
  "This was a complete waste of money. The quality is terrible and it broke after one day.",
  "The package arrived on time. It looks okay, nothing special but does what it says.",
  "I've been using this app for months and it keeps getting better. Highly recommend!",
  "Terrible experience from start to finish. Would not recommend to anyone.",
];

type Sentiment = "POSITIVE" | "NEGATIVE" | "NEUTRAL" | null;

interface Result {
  label: Sentiment;
  confidence: number;
  scores: { positive: number; negative: number; neutral: number };
  reasoning: string;
  model: string;
  char_count: number;
}

const SENTIMENT_CONFIG = {
  POSITIVE: {
    icon: ThumbsUp,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/30",
    bar: "bg-emerald-400",
    label: "Positive",
  },
  NEGATIVE: {
    icon: ThumbsDown,
    color: "text-red-400",
    bg: "bg-red-400/10 border-red-400/30",
    bar: "bg-red-400",
    label: "Negative",
  },
  NEUTRAL: {
    icon: Minus,
    color: "text-slate-400",
    bg: "bg-slate-400/10 border-slate-400/30",
    bar: "bg-slate-400",
    label: "Neutral",
  },
};

export default function SentimentAnalyzer() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async (input?: string) => {
    const value = (input ?? text).trim();
    if (!value) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/sentiment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Analysis failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const loadExample = (example: string) => {
    setText(example);
    analyze(example);
  };

  const reset = () => {
    setText("");
    setResult(null);
    setError("");
  };

  const config = result?.label ? SENTIMENT_CONFIG[result.label] : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-6">

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Sentiment Analyzer</h1>
          <p className="text-sm text-slate-400 mt-1">
            Paste any text and the AI model will classify it as Positive, Negative, or Neutral
            — with a confidence score.
          </p>
        </div>

        {/* Model badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2 py-1 rounded-full bg-accent/20 border border-accent/30 text-accent-light">
            Model: gpt-4o-mini
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-surface-card border border-surface-border text-slate-500">
            LLM Classification
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-surface-card border border-surface-border text-slate-500">
            Structured Output
          </span>
        </div>

        {/* Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Your Text
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste any text here — a review, tweet, email, sentence..."
            rows={5}
            maxLength={2000}
            className="w-full bg-surface-card border border-surface-border rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-accent/60 resize-none transition-colors"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">{text.length} / 2000 characters</span>
            <div className="flex gap-2">
              {(result || text) && (
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-surface-hover border border-surface-border transition-all"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear
                </button>
              )}
              <button
                onClick={() => analyze()}
                disabled={!text.trim() || loading}
                className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-all"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Analyze
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-400/10 border border-red-400/30 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Result */}
        {result && config && (
          <div className={`rounded-2xl border p-6 space-y-5 animate-fade-in ${config.bg}`}>
            {/* Label */}
            <div className="flex items-center gap-3">
              <config.icon className={`w-8 h-8 ${config.color}`} />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Sentiment</p>
                <p className={`text-3xl font-bold ${config.color}`}>{config.label}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Confidence</p>
                <p className={`text-3xl font-bold ${config.color}`}>{result.confidence}%</p>
              </div>
            </div>

            {/* Confidence bar */}
            <div className="space-y-1">
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${config.bar}`}
                  style={{ width: `${result.confidence}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Score breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-black/20 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500 mb-1">Positive</p>
                <p className="text-lg font-bold text-emerald-400">{result.scores.positive}%</p>
              </div>
              <div className="bg-black/20 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500 mb-1">Negative</p>
                <p className="text-lg font-bold text-red-400">{result.scores.negative}%</p>
              </div>
              <div className="bg-black/20 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500 mb-1">Neutral</p>
                <p className="text-lg font-bold text-slate-400">{result.scores.neutral}%</p>
              </div>
            </div>

            {/* Reasoning */}
            {result.reasoning && (
              <div className="bg-black/20 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-semibold">Why</p>
                <p className="text-sm text-slate-300">{result.reasoning}</p>
              </div>
            )}

            {/* Meta */}
            <p className="text-xs text-slate-600">
              Analyzed {result.char_count} characters · Model: {result.model}
            </p>
          </div>
        )}

        {/* Example texts */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Try an example
          </p>
          <div className="space-y-2">
            {EXAMPLES.map((example, i) => (
              <button
                key={i}
                onClick={() => loadExample(example)}
                disabled={loading}
                className="w-full text-left text-xs px-3 py-2.5 rounded-lg border border-surface-border bg-surface-card hover:bg-surface-hover hover:border-accent/40 text-slate-400 hover:text-slate-200 transition-all disabled:opacity-50"
              >
                "{example.length > 90 ? example.slice(0, 90) + "…" : example}"
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
