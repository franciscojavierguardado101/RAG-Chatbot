from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import tempfile
import shutil
import json
import os
import requests as http_requests

load_dotenv()

CHROMA_PATH = "./chroma_db"
SAMPLE_DOC = "./sample_docs/what_is_rag.txt"
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")


def seed_sample_doc():
    """Auto-load the sample doc on startup so the demo always works."""
    if not os.path.exists(SAMPLE_DOC):
        return
    try:
        vectorstore = Chroma(persist_directory=CHROMA_PATH, embedding_function=embeddings)
        existing = vectorstore._collection.get(where={"source": "what_is_rag.txt"})
        if existing["ids"]:
            return  # already indexed
        loader = TextLoader(SAMPLE_DOC, encoding="utf-8")
        documents = loader.load()
        for doc in documents:
            doc.metadata["source"] = "what_is_rag.txt"
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_documents(documents)
        vectorstore.add_documents(chunks)
        print(f"Seeded sample doc: {len(chunks)} chunks indexed.")
    except Exception as e:
        print(f"Seed warning: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_sample_doc()
    yield


app = FastAPI(title="RAG Chatbot API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_vectorstore():
    return Chroma(persist_directory=CHROMA_PATH, embedding_function=embeddings)


class ChatRequest(BaseModel):
    message: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    allowed = (".pdf", ".txt", ".md")
    if not any(file.filename.endswith(ext) for ext in allowed):
        raise HTTPException(400, "Only PDF, TXT, and MD files are supported")

    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        if file.filename.endswith(".pdf"):
            loader = PyPDFLoader(tmp_path)
        else:
            loader = TextLoader(tmp_path, encoding="utf-8")

        documents = loader.load()
        for doc in documents:
            doc.metadata["source"] = file.filename

        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_documents(documents)

        vectorstore = Chroma(persist_directory=CHROMA_PATH, embedding_function=embeddings)
        vectorstore.add_documents(chunks)

        return {"message": f"Uploaded and indexed {file.filename}", "chunks": len(chunks)}
    finally:
        os.unlink(tmp_path)


@app.get("/documents")
def list_documents():
    vectorstore = get_vectorstore()
    results = vectorstore._collection.get()
    sources = {m["source"] for m in results.get("metadatas", []) if m and "source" in m}
    return {"documents": sorted(sources)}


@app.delete("/documents/{filename:path}")
def delete_document(filename: str):
    vectorstore = get_vectorstore()
    results = vectorstore._collection.get(where={"source": filename})
    if not results["ids"]:
        raise HTTPException(404, "Document not found")
    vectorstore._collection.delete(ids=results["ids"])
    return {"message": f"Deleted {filename}"}


@app.post("/chat")
async def chat(request: ChatRequest):
    async def generate():
        try:
            vectorstore = get_vectorstore()
            retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
            docs = await retriever.ainvoke(request.message)

            if not docs:
                yield f"data: {json.dumps({'type': 'error', 'content': 'No documents found. Please upload some documents first.'})}\n\n"
                return

            context = "\n\n---\n\n".join(doc.page_content for doc in docs)
            sources = sorted({doc.metadata.get("source", "Unknown") for doc in docs})

            yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

            llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, streaming=True)

            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are a helpful assistant that answers questions based on the provided document context. "
                        "If the context does not contain enough information to answer, clearly say so. "
                        "Be concise, accurate, and format your responses with markdown when helpful.\n\n"
                        f"Context from uploaded documents:\n{context}"
                    ),
                },
                {"role": "user", "content": request.message},
            ]

            async for chunk in llm.astream(messages):
                if chunk.content:
                    yield f"data: {json.dumps({'type': 'token', 'content': chunk.content})}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


# ── Sentiment Analysis ────────────────────────────────────────────────────────

HF_MODEL = "distilbert-base-uncased-finetuned-sst-2-english"
HF_API_URL = f"https://api-inference.huggingface.co/models/{HF_MODEL}"
HF_TOKEN = os.getenv("HF_TOKEN", "")


class SentimentRequest(BaseModel):
    text: str


@app.post("/sentiment")
def analyze_sentiment(request: SentimentRequest):
    text = request.text.strip()
    if not text:
        raise HTTPException(400, "Text cannot be empty")
    if len(text) > 2000:
        raise HTTPException(400, "Text must be under 2000 characters")

    headers = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}

    try:
        response = http_requests.post(
            HF_API_URL,
            headers=headers,
            json={"inputs": text},
            timeout=20,
        )
        response.raise_for_status()
        raw = response.json()

        # HF returns [[{label, score}, {label, score}]]
        scores = raw[0] if isinstance(raw[0], list) else raw
        score_map = {item["label"]: item["score"] for item in scores}

        positive = score_map.get("POSITIVE", 0)
        negative = score_map.get("NEGATIVE", 0)

        # Treat as NEUTRAL when neither side is confident
        if positive >= 0.65:
            label = "POSITIVE"
            confidence = positive
        elif negative >= 0.65:
            label = "NEGATIVE"
            confidence = negative
        else:
            label = "NEUTRAL"
            confidence = max(positive, negative)

        return {
            "label": label,
            "confidence": round(confidence * 100, 1),
            "scores": {
                "positive": round(positive * 100, 1),
                "negative": round(negative * 100, 1),
            },
            "model": HF_MODEL,
            "char_count": len(text),
        }

    except http_requests.Timeout:
        # HF cold-starts: model may be loading
        raise HTTPException(503, "Model is loading on HuggingFace servers — try again in 20 seconds")
    except Exception as e:
        raise HTTPException(500, str(e))
