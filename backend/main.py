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

class SentimentRequest(BaseModel):
    text: str


@app.post("/sentiment")
async def analyze_sentiment(request: SentimentRequest):
    text = request.text.strip()
    if not text:
        raise HTTPException(400, "Text cannot be empty")
    if len(text) > 2000:
        raise HTTPException(400, "Text must be under 2000 characters")

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    prompt = f"""You are a sentiment analysis classifier. Analyze the sentiment of the text below and respond with ONLY valid JSON — no markdown, no explanation, just the JSON object.

Format:
{{
  "label": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
  "confidence": <integer 0-100>,
  "scores": {{
    "positive": <integer 0-100>,
    "negative": <integer 0-100>,
    "neutral": <integer 0-100>
  }},
  "reasoning": "<one concise sentence explaining the classification>"
}}

Rules:
- scores must add up to 100
- confidence = the score of the winning label
- be objective and accurate

Text to analyze:
\"\"\"{text}\"\"\""""

    try:
        response = await llm.ainvoke(prompt)
        raw = response.content.strip()

        # Strip markdown code fences if model wraps the JSON
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        result = json.loads(raw.strip())
        result["model"] = "gpt-4o-mini"
        result["char_count"] = len(text)
        return result

    except json.JSONDecodeError:
        raise HTTPException(500, "Model returned an unexpected response format")
    except Exception as e:
        raise HTTPException(500, str(e))
