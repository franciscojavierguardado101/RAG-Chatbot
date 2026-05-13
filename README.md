# RAG Chatbot — Chat With Your Own Documents

A full-stack AI application that lets you upload any PDF, TXT, or Markdown file and have a real-time conversation with its contents — powered by **LangChain**, **OpenAI**, and **ChromaDB**.

Built as a portfolio project to demonstrate practical AI Engineering skills: RAG pipeline design, vector databases, streaming APIs, and full-stack integration.

---

## What is RAG?

**RAG (Retrieval-Augmented Generation)** is an AI architecture that supercharges language models with your own private data:

```
  Your Question
       │
       ▼
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ Embed query  │────▶│ Similarity search│────▶│  Inject context  │
│ (OpenAI)     │     │ (ChromaDB)       │     │  into LLM prompt │
└──────────────┘     └─────────────────┘     └──────────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │  Stream answer   │
                                              │  (GPT-4o-mini)   │
                                              └──────────────────┘
                                                       │
                                                       ▼
                                              Answer with Sources
```

Instead of relying on the model's training data, RAG retrieves the most relevant passages from *your* documents and feeds them into the model as context — reducing hallucinations and allowing the model to answer questions about private, domain-specific, or up-to-date content.

---

## Features

- **Drag-and-drop upload** — PDF, TXT, and Markdown files
- **Semantic search** — Finds relevant content by *meaning*, not just keywords
- **Real-time streaming** — Answers stream token-by-token like ChatGPT (via SSE)
- **Source citations** — Every answer shows exactly which document(s) it came from
- **Document management** — View and delete indexed documents from the UI
- **Persistent storage** — ChromaDB saves embeddings to disk; your docs survive restarts
- **Markdown rendering** — AI responses render with full markdown formatting

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (localhost:3000)                  │
│                                                              │
│   ┌──────────────┐          ┌──────────────────────────┐    │
│   │   Sidebar     │          │       Chat Panel          │    │
│   │               │          │                           │    │
│   │  File Upload  │          │  [User message]           │    │
│   │  Doc List     │          │  [AI response streaming]  │    │
│   │               │          │  [Source: file.pdf]       │    │
│   └──────────────┘          └──────────────────────────┘    │
└──────────────────────────────────┬──────────────────────────┘
                                   │ HTTP / SSE
                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   FastAPI Backend (localhost:8000)            │
│                                                              │
│  POST /upload     →  Load → Split → Embed → Store           │
│  POST /chat       →  Embed query → Retrieve → Stream LLM    │
│  GET  /documents  →  List indexed files                      │
│  DELETE /documents/{name}  →  Remove from vector store      │
└───────────────┬──────────────────────────┬──────────────────┘
                │                          │
                ▼                          ▼
   ┌────────────────────┐      ┌────────────────────────┐
   │  ChromaDB (local)  │      │     OpenAI API          │
   │                    │      │                          │
   │  Persists vectors  │      │  text-embedding-3-small  │
   │  to ./chroma_db    │      │  gpt-4o-mini (chat)      │
   └────────────────────┘      └────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Orchestration** | LangChain | Connects retrieval + LLM into a pipeline |
| **Embeddings** | OpenAI `text-embedding-3-small` | Converts text to semantic vectors |
| **Vector Database** | ChromaDB | Stores and searches document embeddings |
| **LLM** | OpenAI `gpt-4o-mini` | Generates grounded, streaming answers |
| **Backend** | FastAPI + Uvicorn | Async Python API with SSE streaming |
| **Frontend** | Next.js 14 + TypeScript | React framework with App Router |
| **Styling** | Tailwind CSS | Utility-first dark mode UI |
| **File Parsing** | LangChain loaders + PyPDF | Handles PDF, TXT, MD documents |

---

## Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- An **[OpenAI API key](https://platform.openai.com/api-keys)** (GPT-4o-mini is very cheap — fractions of a cent per query)

---

### 1. Clone the repo

```bash
git clone https://github.com/franciscojavierguardado101/RAG-Chatbot.git
cd RAG-Chatbot
```

### 2. Set up the backend

```bash
cd backend

# Create and activate a Python virtual environment
python -m venv .venv
source .venv/bin/activate        # macOS/Linux
# .venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Configure your API key
cp .env.example .env
# Open .env and set: OPENAI_API_KEY=sk-...your-key-here...
```

Start the backend server:

```bash
uvicorn main:app --reload
# Running at http://localhost:8000
```

### 3. Set up the frontend

Open a new terminal tab:

```bash
cd frontend
npm install
npm run dev
# Running at http://localhost:3000
```

### 4. Try it out

1. Open **http://localhost:3000** in your browser
2. In the left sidebar, upload `sample_docs/what_is_rag.txt`
3. Type in the chat: *"What is RAG and how does it work?"*
4. Watch the answer stream in with source citations below it

---

## How It Works — Step by Step

### Document Ingestion (`POST /upload`)

```
File upload
    │
    ▼
Load document (PyPDFLoader or TextLoader)
    │
    ▼
Split into chunks (1000 chars, 200 overlap)
    │
    ▼
Embed each chunk (OpenAI text-embedding-3-small → 1536-dim vector)
    │
    ▼
Store vectors + metadata in ChromaDB (persisted to ./chroma_db)
```

### Chat (`POST /chat` — Server-Sent Events)

```
User question
    │
    ▼
Embed question (same model as ingestion)
    │
    ▼
Vector similarity search → top 4 matching chunks
    │
    ▼
Build prompt: system context = retrieved chunks
    │
    ▼
Stream GPT-4o-mini response token by token
    │
    ▼
Frontend receives SSE stream → renders live
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check — returns `{"status": "ok"}` |
| `POST` | `/upload` | Upload a document (multipart form, field: `file`) |
| `GET` | `/documents` | List all indexed document filenames |
| `DELETE` | `/documents/{filename}` | Remove a document and its vectors |
| `POST` | `/chat` | Stream a chat response (SSE). Body: `{"message": "..."}` |

### SSE Event Types from `/chat`

```json
{ "type": "sources",  "sources": ["file.pdf", "notes.txt"] }
{ "type": "token",    "content": "RAG " }
{ "type": "token",    "content": "stands " }
{ "type": "done" }
{ "type": "error",    "content": "No documents found." }
```

---

## Project Structure

```
RAG-Chatbot/
├── backend/
│   ├── main.py              # FastAPI app — all endpoints + SSE streaming
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment variable template
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx       # Root layout + metadata
│   │   ├── page.tsx         # Main page — sidebar + chat layout
│   │   └── globals.css      # Tailwind base + markdown prose styles
│   └── components/
│       ├── ChatInterface.tsx    # SSE streaming chat, input, state
│       ├── MessageBubble.tsx    # User/AI message renderer (markdown)
│       ├── FileUpload.tsx       # Drag-and-drop uploader with status
│       └── DocumentList.tsx     # Indexed doc list with delete
│
├── sample_docs/
│   └── what_is_rag.txt      # Test document — upload this to get started
│
├── .gitignore
└── README.md
```

---

## Key Engineering Decisions

**Why ChromaDB over Pinecone?**
ChromaDB runs locally with zero setup — no account, no API key, no cost. Pinecone is better for production at scale, but for a portfolio project, local persistence is simpler and faster to demo.

**Why GPT-4o-mini?**
It's extremely cheap (< $0.01 per session during development) while still being highly capable. The mini models are the right choice for RAG because the heavy lifting is done by the retriever — the LLM just needs to synthesize clean context.

**Why Server-Sent Events (SSE) over WebSockets?**
SSE is unidirectional (server → client) and maps perfectly to token streaming. It's simpler than WebSockets, works over standard HTTP, and doesn't require any extra infrastructure.

**Why chunk overlap?**
A 200-character overlap between chunks ensures that context around a sentence boundary isn't lost when the document is split, improving retrieval quality for questions that span two chunks.

---

## What I Learned / Skills Demonstrated

- RAG pipeline design and implementation from scratch
- Vector embeddings and semantic similarity search
- LangChain document loaders, text splitters, and retrievers
- FastAPI async endpoints with streaming responses (SSE)
- Next.js App Router with TypeScript and Tailwind CSS
- Real-time data streaming on the frontend using the `ReadableStream` API
- ChromaDB vector store operations (add, query, delete by metadata)

---

## Author

**Francisco Guardado** — Full-Stack Developer transitioning into AI Engineering

- GitHub: [@franciscojavierguardado101](https://github.com/franciscojavierguardado101)
