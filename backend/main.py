from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import json

from agent import app as agent_app

app = FastAPI()

# Allow frontend (Next.js on port 3000) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    ticker: str
    query: str

async def generate_stream(ticker: str, query: str):
    initial_state = {
        "ticker": ticker,
        "query": query,
        "price_data": None,
        "news_data": None,
        "earnings_data": None,
        "final_answer": None,
    }

    async for event in agent_app.astream_events(initial_state, version="v2"):
        kind = event["event"]
        name = event.get("name", "")

        if kind == "on_chat_model_stream" and name == "ChatGroq":
            token = event["data"]["chunk"].content
            if token:
                yield f"data: {json.dumps({'token': token})}\n\n"

    yield f"data: {json.dumps({'done': True})}\n\n"
@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    return StreamingResponse(
        generate_stream(request.ticker, request.query),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )