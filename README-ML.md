# Machine Learning — Sentiment Analyzer

## What this project does

This page adds a **Sentiment Analyzer** to the AI portfolio site. You paste any text — a product review, a tweet, an email, a sentence — and the model instantly tells you whether it is **Positive**, **Negative**, or **Neutral**, along with a confidence percentage and a visual score bar.

**Live:** https://rag-chatbot-sandy-nine.vercel.app/machine-learning

---

## How it works (plain English)

```
User types text
      │
      ▼
Next.js frontend sends text to FastAPI backend (POST /sentiment)
      │
      ▼
FastAPI calls the HuggingFace Inference API
(sends the text to a hosted pre-trained model)
      │
      ▼
Model returns: POSITIVE 98.7% / NEGATIVE 1.3%
      │
      ▼
Backend applies neutral logic:
  - Score ≥ 65% either way → POSITIVE or NEGATIVE
  - Score < 65% both ways  → NEUTRAL
      │
      ▼
Frontend displays: label + confidence bar + score breakdown
```

---

## Tech stack for this feature

| Layer | Technology | Purpose |
|---|---|---|
| **Model** | DistilBERT (distilbert-base-uncased-finetuned-sst-2-english) | Pre-trained transformer for sentiment classification |
| **Model hosting** | HuggingFace Inference API | Runs the model on HF servers — no GPU needed locally |
| **Backend** | FastAPI (Python) | Receives text, calls HF API, returns results |
| **Frontend** | Next.js 14 + Tailwind CSS | UI with confidence bar and score breakdown |

---

## Interview Questions — What You Should Know

These are the questions an interviewer would ask about this project, the same way a Drupal interviewer asks about hooks and modules.

---

### 1. What is Sentiment Analysis?

Sentiment Analysis (also called Opinion Mining) is the task of identifying the **emotional tone** of a piece of text — typically classifying it as Positive, Negative, or Neutral.

It's one of the most common NLP (Natural Language Processing) tasks used in the real world for:
- Analyzing customer reviews
- Monitoring social media brand mentions
- Processing support tickets
- Measuring employee feedback

---

### 2. What model are you using and why?

**`distilbert-base-uncased-finetuned-sst-2-english`**

Breaking that name down:
- **DistilBERT** — a smaller, faster version of BERT (60% smaller, 97% of BERT's performance)
- **base** — the standard size (not large or small)
- **uncased** — treats "Hello" and "hello" as the same word
- **finetuned** — it was taken from a general language model and trained further on a specific task
- **sst-2** — the Stanford Sentiment Treebank v2 dataset, which has ~67,000 movie reviews labeled as positive or negative
- **english** — trained on English text only

**Why this model?**
It's fast, well-documented, free to use, and highly accurate for English sentiment tasks. It's the standard starting point for sentiment classification in the industry.

---

### 3. What is a Pre-trained Model? What is Transfer Learning?

**Pre-trained model:** A model that was already trained on a massive dataset by a research team (in this case, Google trained BERT on the entire Wikipedia + BookCorpus — billions of words). Instead of training from scratch, we use their result.

**Transfer learning:** The practice of taking a model trained for one task and adapting it to a different (but related) task.

Think of it like this:
- Someone already learned to read and write English fluently (pre-training on Wikipedia)
- We then teach them specifically to recognize positive vs. negative movie reviews (fine-tuning on SST-2)
- That's much faster than teaching someone to read AND classify sentiment from zero

This is one of the biggest breakthroughs in modern AI — you don't need to train a billion-parameter model yourself. You use someone else's and fine-tune it.

---

### 4. What is a Transformer? What is BERT?

**Transformer** is the neural network architecture behind almost all modern NLP models (GPT, BERT, LLaMA, etc.). It was introduced in the 2017 paper *"Attention Is All You Need"* by Google.

The key innovation is **self-attention** — the model learns which words in a sentence are most related to each other, regardless of how far apart they are.

Example: "The bank by the river flooded" vs "I went to the bank to deposit money" — the transformer figures out what "bank" means based on context.

**BERT** (Bidirectional Encoder Representations from Transformers) is Google's pre-trained transformer that reads text in both directions simultaneously (left-to-right AND right-to-left), giving it better context understanding.

**DistilBERT** is a compressed version of BERT created using **knowledge distillation** — a smaller model trained to mimic the behavior of a larger model.

---

### 5. What is Tokenization?

Before a model can read text, the text must be converted to numbers. This process is called **tokenization**.

Example:
```
Input:  "I love this product!"
Tokens: ["I", "love", "this", "product", "!"]
IDs:    [1045, 2293, 2023, 4031, 999]
```

DistilBERT uses **WordPiece tokenization** — it breaks rare words into sub-word pieces:
```
"unbelievable" → ["un", "##believe", "##able"]
```

This way the model can handle words it has never seen before.

---

### 6. What is a Confidence Score? How does the model produce it?

At the end of the transformer is a classification layer that outputs a score for each possible class. These raw scores (called **logits**) are passed through a **softmax function**, which converts them into probabilities that add up to 100%.

Example output:
```
POSITIVE: 98.7%
NEGATIVE:  1.3%
Total:    100.0%
```

The model is 98.7% confident this text is positive. A score close to 50/50 means the model is uncertain — which is why we label those as NEUTRAL.

---

### 7. What is the HuggingFace Inference API?

HuggingFace is the largest open-source AI model hub. They host thousands of pre-trained models and provide an **Inference API** — you send them text via HTTP and they run the model on their servers and return the result.

**Why use the API instead of running the model locally?**
- No need to install PyTorch (~500MB) or download the model (~270MB)
- Works on any server, including free tiers with limited memory
- Scales automatically
- The same pattern used in production AI systems

**The tradeoff:** You're dependent on HuggingFace's servers. For production, you'd host the model yourself (on AWS SageMaker, Google Vertex AI, etc.) for reliability and lower latency.

---

### 8. What is the difference between training and inference?

**Training:** The process of teaching a model by showing it thousands/millions of examples and adjusting its internal weights until it gets good at the task. Requires GPUs, weeks of compute time, and large datasets.

**Inference:** Using an already-trained model to make predictions on new data. This is what this project does — we never train anything. We just use a model that was already trained.

For most real-world AI applications, you do inference, not training.

---

### 9. How do you handle text that is too long?

DistilBERT has a **maximum token limit of 512 tokens** (~400 words). If you send more, it will be truncated (the end gets cut off).

In this project, we limit input to 2000 characters on the frontend as a safeguard.

In production, you would:
1. Split long text into chunks and average the scores (sliding window approach)
2. Use a model with a larger context window (Longformer supports up to 4096 tokens)
3. Summarize the text first, then run sentiment on the summary

---

### 10. What is the difference between this and the RAG Chatbot?

| | Sentiment Analyzer | RAG Chatbot |
|---|---|---|
| **Type** | Classification (predicts a label) | Generation (produces text) |
| **Model** | DistilBERT (encoder-only transformer) | GPT-4o-mini (decoder-only LLM) |
| **Output** | A category + confidence score | A full text response |
| **Training** | Fine-tuned on labeled dataset | Instruction-tuned by OpenAI |
| **Cost** | Free (HuggingFace API) | Per-token cost (OpenAI API) |
| **Use case** | Classify input text | Answer questions, generate content |

Together they demonstrate both sides of AI Engineering: **classification models** (traditional ML) and **generative models** (LLMs).

---

### 11. How would you evaluate this model's performance?

In machine learning, you evaluate classification models with these metrics:

- **Accuracy** — what % of predictions were correct overall
- **Precision** — of all the texts I labeled POSITIVE, what % were actually positive?
- **Recall** — of all the texts that were actually positive, what % did I catch?
- **F1 Score** — the balance between precision and recall (harmonic mean)
- **Confusion Matrix** — a grid showing where the model got confused (e.g., labeled POSITIVE when it was actually NEGATIVE)

The SST-2 fine-tuned DistilBERT achieves **~91% accuracy** on the SST-2 test set.

---

### 12. What is Fine-tuning?

Fine-tuning means taking a pre-trained model and training it further on a smaller, task-specific dataset.

The process:
1. Start with DistilBERT (already understands English from Wikipedia training)
2. Add a classification head on top (a small layer that maps to your output classes)
3. Train on the SST-2 dataset (67K movie reviews with positive/negative labels)
4. The model adjusts its weights slightly to become good at sentiment specifically

Fine-tuning typically takes hours (not weeks) because the model already knows the language — it just needs to learn the specific task.

---

### 13. What are the limitations of this model?

- **English only** — performs poorly on other languages
- **Binary training** — was trained on only POSITIVE/NEGATIVE, so NEUTRAL is approximated by low confidence
- **Domain shift** — trained on movie reviews, may be less accurate on technical text, medical text, or legal documents
- **Sarcasm** — struggles with sarcasm ("Yeah, this product is just GREAT" — likely misclassified as positive)
- **Context** — analyzes text in isolation, doesn't understand conversation history
- **Max 512 tokens** — long documents must be truncated or chunked

---

### 14. How would you improve this in production?

1. **Fine-tune on your specific domain** — if the app is for customer support, fine-tune on support tickets
2. **Add a 3-class model** — train on a dataset with explicit NEUTRAL labels (e.g., Amazon reviews with 3-star as neutral)
3. **Host the model yourself** — deploy to AWS SageMaker or Google Vertex AI for lower latency and no rate limits
4. **Add explainability** — use LIME or SHAP to show which words drove the sentiment prediction
5. **Batch processing** — if analyzing thousands of texts, use the model's batch inference capability

---

### 15. Why is this relevant to AI Engineering roles?

AI Engineers are expected to:
- Know how to use and deploy pre-trained models (not just build from scratch)
- Understand model architectures (transformers, BERT, etc.)
- Work with the HuggingFace ecosystem
- Build APIs that serve model predictions
- Handle model limitations and edge cases in production

This project demonstrates all of the above.

---

## File structure for this feature

```
backend/
└── main.py               # POST /sentiment endpoint

frontend/
├── components/
│   ├── NavHeader.tsx     # Shared navigation (links both pages)
│   └── SentimentAnalyzer.tsx  # Full UI with input, result, examples
└── app/
    └── machine-learning/
        └── page.tsx      # /machine-learning route
```

---

## Author

**Francisco Javier Guardado** — Full-Stack Developer transitioning into AI Engineering

- GitHub: [@franciscojavierguardado101](https://github.com/franciscojavierguardado101)
- Live site: https://rag-chatbot-sandy-nine.vercel.app
