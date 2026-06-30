from fastmcp import FastMCP
import yfinance as yf
import os
from dotenv import load_dotenv
import requests

load_dotenv()  # reads .env file and loads variables into environment

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
mcp = FastMCP("finsight-tools")

@mcp.tool()
def fetch_price(ticker: str) -> dict:
    """Get current price and key stats for a stock ticker."""
    stock = yf.Ticker(ticker)
    info = stock.info

    return {
        "ticker": ticker,
        "price": info.get("currentPrice"),
        "market_cap": info.get("marketCap"),
        "pe_ratio": info.get("trailingPE"),
        "52w_high": info.get("fiftyTwoWeekHigh"),
        "52w_low": info.get("fiftyTwoWeekLow"),
    }
@mcp.tool()
def get_earnings(ticker: str) -> dict:
    """Get trailing and forward earnings per share, plus earnings growth rate for a ticker."""
    stock = yf.Ticker(ticker)
    info = stock.info

    return {
        "ticker": ticker,
        "trailing_eps": info.get("trailingEps"),
        "forward_eps": info.get("forwardEps"),
        "earnings_growth": info.get("earningsGrowth"),
    }
@mcp.tool()
def get_news(ticker: str, limit: int = 5) -> list[dict]:
    """Get recent news headlines for a stock ticker."""
    url = "https://finnhub.io/api/v1/company-news"
    params = {
        "symbol": ticker,
        "from": "2026-06-01",
        "to": "2026-06-30",
        "token": FINNHUB_API_KEY,
    }
    response = requests.get(url, params=params)
    articles = response.json()

    results = []
    for article in articles[:limit]:
        results.append({
            "headline": article.get("headline"),
            "source": article.get("source"),
            "url": article.get("url"),
        })
    return results
if __name__ == "__main__":
    mcp.run()