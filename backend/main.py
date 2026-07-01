from typing import Optional
import uuid
import os
import json
from datetime import datetime
import asyncio

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langgraph.checkpoint.mongodb import MongoDBSaver
from motor.motor_asyncio import AsyncIOMotorClient
from agent import graph

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
    thread_id: Optional[str] = None  # if None, start new conversation

async def generate_stream(ticker: str, query: str, thread_id: str):
    initial_state = {
        "ticker": ticker,
        "query": query,
        "price_data": None,
        "news_data": None,
        "earnings_data": None,
        "final_answer": None,
    }
    config = {"configurable": {"thread_id": thread_id}}
    full_answer = ""

    try:
        with MongoDBSaver.from_conn_string(
            os.getenv("MONGODB_URL", "mongodb://localhost:27017"),
            db_name="finsight",
            collection_name="checkpoints",
        ) as checkpointer:
            agent = graph.compile(checkpointer=checkpointer)
            async for event in agent.astream_events(
                initial_state,
                config=config,
                version="v2"
            ):
                kind = event["event"]
                name = event.get("name", "")
                if kind == "on_chat_model_stream" and name == "ChatGroq":
                    token = event["data"]["chunk"].content
                    if token:
                        full_answer += token
                        yield f"data: {json.dumps({'token': token})}\n\n"

        # save clean history to our own collection
        mongo_client = AsyncIOMotorClient(
            os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        )
        db = mongo_client["finsight"]
        await db["history"].insert_one({
            "thread_id": thread_id,
            "ticker": ticker,
            "query": query,
            "final_answer": full_answer,
            "timestamp": datetime.utcnow().isoformat(),
        })
        mongo_client.close()

    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

    yield f"data: {json.dumps({'done': True})}\n\n"


@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    thread_id = request.thread_id or str(uuid.uuid4())
    return StreamingResponse(
        generate_stream(request.ticker, request.query, thread_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "X-Thread-ID": thread_id,   # send back so frontend can reuse it
        }
    )


@app.get("/history")
async def get_history():
    mongo_client = AsyncIOMotorClient(
        os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    )
    db = mongo_client["finsight"]
    cursor = db["history"].find(
        {},
        {"_id": 0}
    ).sort("timestamp", -1).limit(20)
    
    history = await cursor.to_list(length=20)
    mongo_client.close()
    return {"history": history}