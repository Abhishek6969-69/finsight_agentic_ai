# FinSight — Multi-Agent Financial Analyst

A production-grade AI financial analyst built with LangGraph, FastMCP, FastAPI, and Next.js.

## Architecture
User Query → Next.js → FastAPI → LangGraph Supervisor
↓
┌─────────────────────────┼─────────────────────────┐
↓                         ↓                         ↓
market_agent_node      sentiment_agent_node      earnings_agent_node
(fetch_price via MCP)  (get_news via MCP)        (get_earnings via MCP)
└─────────────────────────┼─────────────────────────┘
↓
aggregator_node (Groq LLM)
↓
SSE stream → Next.js UI

## Key Features

- **Multi-agent parallel execution** — 3 LangGraph sub-agents run simultaneously via `Send()` fan-out
- **MCP tool integration** — LangGraph agent calls FastMCP server over stdio protocol
- **Real-time streaming** — FastAPI SSE streams LLM tokens token-by-token to frontend
- **Full observability** — LangSmith traces every node, token cost, and latency per run
- **Fault tolerant** — graceful handling of missing data, invalid tickers, and API failures

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Agent Orchestration | LangGraph |
| Tool Server | FastMCP |
| LLM | Groq (llama-3.3-70b-versatile) |
| Backend API | FastAPI + SSE |
| Frontend | Next.js + TypeScript + Tailwind |
| Observability | LangSmith |
| Data Sources | yfinance + Finnhub |

## Project Structure
finsight/
├── backend/
│   ├── mcp_server.py      # FastMCP tool server (fetch_price, get_news, get_earnings)
│   ├── agent.py           # LangGraph multi-agent graph
│   ├── main.py            # FastAPI SSE streaming endpoint
│   └── requirements.txt
└── frontend/
├── app/page.tsx
└── components/ChatUI.tsx

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `.env` file:
FINNHUB_API_KEY=your_key
GROQ_API_KEY=your_key
LANGSMITH_API_KEY=your_key
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=finsight

Run:

```bash
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`

## How It Works

1. User enters a ticker (e.g. `AAPL`) and query
2. FastAPI receives the request and invokes the LangGraph graph
3. Supervisor fires 3 agents in parallel:
   - `market_agent` → calls `fetch_price` MCP tool → live price, PE ratio, market cap
   - `sentiment_agent` → calls `get_news` MCP tool → latest headlines
   - `earnings_agent` → calls `get_earnings` MCP tool → EPS, growth rate
4. All 3 results merge into LangGraph state
5. `aggregator_node` calls Groq LLM with all data → generates analysis
6. Response streams token-by-token via SSE to the Next.js chat UI

## Supported Tickers

- US stocks: `AAPL`, `TSLA`, `MSFT`, `GOOGL`
- Indian stocks: `TCS.NS`, `RELIANCE.NS`, `INFY.NS`
- Crypto: `BTC-USD`, `ETH-USD`

---

*Not financial advice. For educational purposes only.*
