import os
from typing import TypedDict, Optional
from langchain_mcp_adapters.client import MultiServerMCPClient
import json
from langgraph.checkpoint.mongodb import MongoDBSaver
import uuid
from langchain_groq import ChatGroq
import asyncio
from langgraph.graph import StateGraph, START, END

from dotenv import load_dotenv
load_dotenv()
class FinSightState(TypedDict):
    ticker: str
    query: str
    price_data: Optional[dict]
    news_data: Optional[list]
    earnings_data: Optional[dict]
    final_answer: Optional[str]

import sys

mcp_client = MultiServerMCPClient(
    {
        "finsight-tools": {
            "command": sys.executable,
            "args": ["mcp_server.py"],
            "transport": "stdio",
        }
    }
)
llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)
async def market_agent_node(state: FinSightState) -> dict:
    tools = await mcp_client.get_tools()
    fetch_price_tool = next(t for t in tools if t.name == "fetch_price")

    raw_result = await fetch_price_tool.ainvoke({"ticker": state["ticker"]})
    json_string = "{}"
    if isinstance(raw_result, str):
        json_string = raw_result
    elif isinstance(raw_result, list) and len(raw_result) > 0:
        json_string = raw_result[0].get("text", "{}")
    try:
        price_data = json.loads(json_string)
    except json.JSONDecodeError:
        price_data = None

    return {"price_data": price_data}

async def sentiment_agent_node(state: FinSightState) -> dict:
    tools = await mcp_client.get_tools()
    get_news_tool = next(t for t in tools if t.name == "get_news")

    raw_result = await get_news_tool.ainvoke({"ticker": state["ticker"], "limit": 5})
    json_string = "[]"
    if isinstance(raw_result, str):
        json_string = raw_result
    elif isinstance(raw_result, list) and len(raw_result) > 0:
        json_string = raw_result[0].get("text", "[]")
    try:
        news_data = json.loads(json_string)
    except json.JSONDecodeError:
        news_data = []

    return {"news_data": news_data}

async def earnings_agent_node(state: FinSightState) -> dict:
    tools = await mcp_client.get_tools()
    get_earnings_tool = next(t for t in tools if t.name == "get_earnings")

    raw_result = await get_earnings_tool.ainvoke({"ticker": state["ticker"]})
    json_string = "{}"
    if isinstance(raw_result, str):
        json_string = raw_result
    elif isinstance(raw_result, list) and len(raw_result) > 0:
        json_string = raw_result[0].get("text", "{}")
    try:
        earnings_data = json.loads(json_string)
    except json.JSONDecodeError:
        earnings_data = None

    return {"earnings_data": earnings_data}
async def aggregator_node(state: FinSightState) -> dict:
    prompt = f"""You are a financial analyst. Analyse {state['ticker']} based on available data.

User question: {state['query']}

Available data:
- Price data: {state['price_data'] if state['price_data'] and state['price_data'].get('price') else 'Not available (ticker may need exchange suffix e.g. TCS.NS for NSE stocks)'}
- Earnings data: {state['earnings_data'] if state['earnings_data'] and state['earnings_data'].get('trailing_eps') else 'Not available'}
- Recent news: {state['news_data'] if state['news_data'] else 'Not available'}

Rules:
- Only analyse data that is actually available
- If price/earnings data is missing, explain why (wrong ticker format) and suggest the correct format
- Never fabricate numbers
- Be concise and direct"""

    response = await llm.ainvoke(prompt)

    return {"final_answer": response.content}
graph = StateGraph(FinSightState)

graph.add_node("market_agent", market_agent_node)
graph.add_node("sentiment_agent", sentiment_agent_node)
graph.add_node("earnings_agent", earnings_agent_node)

graph.add_edge(START, "market_agent")
graph.add_edge(START, "sentiment_agent")
graph.add_edge(START, "earnings_agent")

graph.add_node("aggregator", aggregator_node)

graph.add_edge("market_agent", "aggregator")
graph.add_edge("sentiment_agent", "aggregator")
graph.add_edge("earnings_agent", "aggregator")

graph.add_edge("aggregator", END)
async def create_app():
    mongodb_client = MongoDBSaver.from_conn_string(
        os.getenv("MONGODB_URL", "mongodb://localhost:27017"),
        db_name="finsight",
        collection_name="checkpoints"
    )
    return graph.compile(checkpointer=mongodb_client)


async def test_graph():
    agent = await create_app()
    result = await agent.ainvoke(
        {
            "ticker": "AAPL",
            "query": "should I buy?",
            "price_data": None,
            "news_data": None,
            "earnings_data": None,
            "final_answer": None,
        },
        config={"configurable": {"thread_id": "test-thread-1"}}
    )
    print("Final state:", result)
if __name__ == "__main__":
    asyncio.run(test_graph())