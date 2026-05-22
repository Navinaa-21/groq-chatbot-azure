from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv()

app = FastAPI(title="Retail Chatbot Backend")

# Add CORS middleware to support separate frontend development if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    print("WARNING: GROQ_API_KEY environment variable is not set!")
    client = None
else:
    client = Groq(api_key=api_key)

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

SYSTEM_PROMPT = """You are a polite, helpful, and concise customer retail assistant for a premium store called 'Aura Retail'.
Your goals are:
1. Help customers with product browsing, recommendations, and queries.
2. Answer order-related FAQs (e.g., shipping, returns, order tracking).
3. Provide general customer support.
Keep your responses engaging, clear, and relatively brief (typically 1-3 sentences) to suit a chat bubble interface.
Always maintain a helpful, welcoming, and professional brand voice.
"""

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not client:
        raise HTTPException(
            status_code=500,
            detail="Groq API key is not configured on the server."
        )
    
    if not request.message.strip():
        raise HTTPException(
            status_code=400,
            detail="Message content cannot be empty."
        )
        
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": request.message}
            ],
            max_tokens=500,
            temperature=0.7
        )
        reply = response.choices[0].message.content
        return ChatResponse(reply=reply)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error communicating with Groq API: {str(e)}"
        )

# Serve the static frontend.
# Define API routes *before* mounting StaticFiles to prevent shadowing.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
else:
    print(f"WARNING: Frontend directory not found at {FRONTEND_DIR}")

if __name__ == "__main__":
    import uvicorn
    # Azure App Service sets the PORT environment variable
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting server on port {port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
