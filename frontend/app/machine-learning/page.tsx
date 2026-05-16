import NavHeader from "@/components/NavHeader";
import SentimentAnalyzer from "@/components/SentimentAnalyzer";

export const metadata = {
  title: "Machine Learning — Sentiment Analyzer",
  description: "Real-time sentiment analysis using a fine-tuned DistilBERT transformer model via HuggingFace.",
};

export default function MachineLearningPage() {
  return (
    <div className="flex flex-col h-screen">
      <NavHeader />
      <main className="flex-1 overflow-hidden">
        <SentimentAnalyzer />
      </main>
    </div>
  );
}
