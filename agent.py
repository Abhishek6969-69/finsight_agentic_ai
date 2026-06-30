from typing import TypedDict, Optional
from langchain_mcp_adapters.client import MultiServerMCPClient
import json
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

mcp_client = MultiServerMCPClient(
    {
        "finsight-tools": {
            "command": "python3",
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

    # raw_result looks like: [{'type': 'text', 'text': '{"ticker":...}', 'id': '...'}]
    json_string = raw_result[0]["text"]
    price_data = json.loads(json_string)

    return {"price_data": price_data}

async def sentiment_agent_node(state: FinSightState) -> dict:
    tools = await mcp_client.get_tools()
    get_news_tool = next(t for t in tools if t.name == "get_news")

    raw_result = await get_news_tool.ainvoke({"ticker": state["ticker"], "limit": 5})

    # raw_result looks like: [{'type': 'text', 'text': '[{"headline":...}]', 'id': '...'}]
    json_string = raw_result[0]["text"]
    news_data = json.loads(json_string)

    return {"news_data": news_data}

async def earnings_agent_node(state: FinSightState) -> dict:
    tools = await mcp_client.get_tools()
    get_earnings_tool = next(t for t in tools if t.name == "get_earnings")

    raw_result = await get_earnings_tool.ainvoke({"ticker": state["ticker"]})

    # raw_result looks like: [{'type': 'text', 'text': '{"trailing_eps":...}', 'id': '...'}]
    json_string = raw_result[0]["text"]
    earnings_data = json.loads(json_string)

    return {"earnings_data": earnings_data}
async def aggregator_node(state: FinSightState) -> dict:
    prompt = f"""You are a financial analyst. Based on the following data, give a concise recommendation for {state['ticker']}.

User's question: {state['query']}

Price data: {state['price_data']}

Earnings data: {state['earnings_data']}

Recent news headlines: {state['news_data']}

Give a clear, well-reasoned answer covering: current valuation, earnings trend, and market sentiment from news. End with a balanced take — not financial advice, just analysis."""

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
app = graph.compile()


async def test_graph():
    result = await app.ainvoke({
        "ticker": "AAPL",
        "query": "should I buy?",
        "price_data": None,
        "news_data": None,
        "earnings_data": None,
        "final_answer": None,
    })
    print("Final state:", result)

if __name__ == "__main__":
    asyncio.run(test_graph())