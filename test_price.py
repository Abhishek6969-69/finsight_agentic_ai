import yfinance as yf

stock = yf.Ticker("AAPL")
info = stock.info

print("Price:", info.get("currentPrice"))
print("Market Cap:", info.get("marketCap"))
print("PE Ratio:", info.get("trailingPE"))
print("52w High:", info.get("fiftyTwoWeekHigh"))
print("52w Low:", info.get("fiftyTwoWeekLow"))

print("Trailing EPS:", info.get("trailingEps"))
print("Forward EPS:", info.get("forwardEps"))
print("Earnings Growth:", info.get("earningsGrowth"))