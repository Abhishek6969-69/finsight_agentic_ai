import os
from dotenv import load_dotenv
import requests

load_dotenv()
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")

url = "https://finnhub.io/api/v1/company-news"
params = {
    "symbol": "AAPL",
    "from": "2026-06-01",
    "to": "2026-06-30",
    "token": FINNHUB_API_KEY,
}

response = requests.get(url, params=params)
print("Status code:", response.status_code)
print(response.json()[:2])  # just show first 2 articles to keep output short