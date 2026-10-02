import os
import shutil
import uuid
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

# LangChain imports
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langgraph.graph import START, StateGraph, MessagesState, END
from langgraph.checkpoint.memory import MemorySaver

app = FastAPI(title="Agentic Writer's Room API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini Model & Embeddings
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-pro-latest",
    temperature=0.7,
    google_api_key=os.getenv("GEMINI_API_KEY")
)
embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=os.getenv("GEMINI_API_KEY"))

# Initialize ChromaDB Vector Store
vector_store = Chroma(
    collection_name="story_canon",
    embedding_function=embeddings,
    persist_directory="./chroma_db"
)

# ---------------------------------------------------------
# MULTI-AGENT LANGGRAPH SETUP
# ---------------------------------------------------------
class WriterState(MessagesState):
    context: str
    draft: str
    criticism: str
    iterations: int

def retrieve_context_node(state: WriterState):
    """Retrieves canon from ChromaDB based on user prompt."""
    query = state["messages"][-1].content
    docs = vector_store.similarity_search(query, k=3)
    context_text = "\n\n".join([doc.page_content for doc in docs])
    return {"context": context_text}

def orchestrator_writer_node(state: WriterState):
    """Writes the scene using the retrieved context."""
    system_prompt = f"""You are the Orchestrator Writer Agent.
Write the next part of the screenplay based on the user's prompt.
Use this canonical context (if any) to ensure continuity:
{state.get('context', 'No specific context loaded.')}

If there is criticism from the Critic Agent, fix the draft based on it:
Criticism: {state.get('criticism', 'None')}

Output ONLY the script text."""
    
    messages = [SystemMessage(content=system_prompt)] + state["messages"]
    response = llm.invoke(messages)
    return {"draft": response.content, "messages": [AIMessage(content=response.content)]}

def critic_node(state: WriterState):
    """Critiques the draft against the context to ensure continuity."""
    if not state.get('context'):
        return {"criticism": "PASS"} # Nothing to check against
        
    system_prompt = f"""You are the Continuity Critic Agent.
Review the following draft against the established canonical context.
Draft: {state.get('draft')}
Context: {state.get('context')}

If the draft contradicts the context (e.g. character behaves out of character, wrong location details), output your criticism.
If it is perfect, output exactly 'PASS'."""
    
    response = llm.invoke([SystemMessage(content=system_prompt)])
    criticism = response.content.strip()
    return {"criticism": criticism, "iterations": state.get("iterations", 0) + 1}

def router(state: WriterState):
    """Decides if we need to rewrite or finish."""
    if state.get("iterations", 0) >= 2 or state.get("criticism") == "PASS":
        return END
    return "writer"

workflow = StateGraph(WriterState)
workflow.add_node("retriever", retrieve_context_node)
workflow.add_node("writer", orchestrator_writer_node)
workflow.add_node("critic", critic_node)

workflow.add_edge(START, "retriever")
workflow.add_edge("retriever", "writer")
workflow.add_edge("writer", "critic")
workflow.add_conditional_edges("critic", router)

memory = MemorySaver()
app_graph = workflow.compile(checkpointer=memory)

# ---------------------------------------------------------
# API ROUTES
# ---------------------------------------------------------
class ChatRequest(BaseModel):
    message: str
    project_id: str

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    try:
        config = {"configurable": {"thread_id": req.project_id}}
        inputs = {"messages": [HumanMessage(content=req.message)], "iterations": 0}
        
        output = app_graph.invoke(inputs, config=config)
        
        ai_message = output["draft"]
        context_used = output.get("context", "")
        criticism = output.get("criticism", "")
        
        return {
            "response": ai_message,
            "context_retrieved": bool(context_used),
            "critic_intervened": criticism != "PASS" and criticism != ""
        }
    except Exception as e:
        print(e)
        return {"response": f"Error: {str(e)}"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        # Read file
        content = await file.read()
        text = content.decode("utf-8")
        
        # Split text
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        chunks = text_splitter.split_text(text)
        
        # Store in ChromaDB
        docs = [Document(page_content=chunk, metadata={"source": file.filename}) for chunk in chunks]
        vector_store.add_documents(docs)
        
        return {"status": "success", "chunks_added": len(chunks)}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/projects")
async def get_projects():
    # Mock projects for the dashboard
    return [
        {"id": "proj-1", "name": "The Library Incident", "type": "Reel Series", "lastEdited": "Just now"},
        {"id": "proj-2", "name": "Midnight Café", "type": "Short Film", "lastEdited": "2 days ago"},
        {"id": "proj-3", "name": "College Chaos", "type": "Comedy Series", "lastEdited": "1 week ago"}
    ]
