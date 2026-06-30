from agent import app as agent_app
import asyncio

async def main():
    async for event in agent_app.astream_events({
        "ticker": "TCS",
        "query": "should I buy?",
        "price_data": None,
        "news_data": None,
        "earnings_data": None,
        "final_answer": None,
    }, version="v2"):
        print(event["event"], event.get("name"))

if __name__ == "__main__":
    asyncio.run(main())
