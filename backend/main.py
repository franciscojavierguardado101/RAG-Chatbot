from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
import tempfile
import shutil
import json
import os

load_dotenv()

app = FastAPI(title="RAG Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CHROMA_PATH = "./chroma_db"
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")


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
