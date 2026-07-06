import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper function to fetch from Binance securely
async function fetchBinance(pathStr: string): Promise<any> {
  const url = `https://api.binance.com${pathStr}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Binance API error: ${response.statusText}`);
  }
  return response.json();
}

// 1. Get Top Tickers Proxy (to avoid CORS and get cached-like performance)
app.get("/api/binance/tickers", async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await fetchBinance("/api/v3/ticker/24hr");
    // Filter top high-volume USDT pairs to keep the app clean
    const targetSymbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "ADAUSDT", "XRPUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "NEARUSDT", "LTCUSDT", "SUIUSDT"];
    const filtered = data
      .filter((item: any) => targetSymbols.includes(item.symbol))
      .map((item: any) => ({
        symbol: item.symbol,
        price: parseFloat(item.lastPrice),
        priceChangePercent: parseFloat(item.priceChangePercent),
        highPrice: parseFloat(item.highPrice),
        lowPrice: parseFloat(item.lowPrice),
        volume: parseFloat(item.volume),
      }));
    res.json(filtered);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get Candles Proxy
app.get("/api/binance/klines", async (req: Request, res: Response): Promise<void> => {
  try {
    const { symbol = "BTCUSDT", interval = "1h", limit = "100" } = req.query;
    const data = await fetchBinance(`/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    
    const formatted = data.map((candle: any) => ({
      time: candle[0], // open time
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
    }));
    
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get Order Book Proxy
app.get("/api/binance/depth", async (req: Request, res: Response): Promise<void> => {
  try {
    const { symbol = "BTCUSDT", limit = "50" } = req.query;
    const data = await fetchBinance(`/api/v3/depth?symbol=${symbol}&limit=${limit}`);
    
    // Sort and calculate cumulative sums
    let bidTotal = 0;
    const bids = data.bids.map((bid: any) => {
      const price = parseFloat(bid[0]);
      const amount = parseFloat(bid[1]);
      bidTotal += amount;
      return { price, amount, total: bidTotal };
    });

    let askTotal = 0;
    const asks = data.asks.map((ask: any) => {
      const price = parseFloat(ask[0]);
      const amount = parseFloat(ask[1]);
      askTotal += amount;
      return { price, amount, total: askTotal };
    });

    res.json({ bids, asks });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Custom Coin Search Proxy (to verify any coin input by user exists and get its base ticker)
app.get("/api/binance/search", async (req: Request, res: Response): Promise<void> => {
  try {
    const { symbol } = req.query;
    if (!symbol) {
      res.status(400).json({ error: "Symbol query parameter is required." });
      return;
    }
    const cleanSymbol = (symbol as string).toUpperCase().trim();
    const data = await fetchBinance(`/api/v3/ticker/24hr?symbol=${cleanSymbol}`);
    res.json({
      symbol: data.symbol,
      price: parseFloat(data.lastPrice),
      priceChangePercent: parseFloat(data.priceChangePercent),
      highPrice: parseFloat(data.highPrice),
      lowPrice: parseFloat(data.lowPrice),
      volume: parseFloat(data.volume),
    });
  } catch (error: any) {
    res.status(404).json({ error: `Symbol not found on Binance. Please use standard format like BTCUSDT, SOLUSDT.` });
  }
});

// 5. AI Signal Generator (Gemini-powered Quantitative Analysis)
app.post("/api/analyze", async (req: Request, res: Response): Promise<void> => {
  try {
    const { symbol, currentPrice, candles, orderBookSummary } = req.body;

    if (!symbol || !currentPrice || !candles) {
      res.status(400).json({ error: "Missing required parameters for analysis." });
      return;
    }

    const systemInstruction = `You are a World-Class Crypto Quantitative Trading Analyst & Technical Analysis Expert with over 15 years of institutional trading experience.
Your specialty is finding high-win-rate (70%+) scalp, intraday, and swing setups on Binance.
You have absolute knowledge about order flow, liquidity pools, order books, and advanced indicators (RSI, MACD, Moving Averages, Support & Resistance).

Your objective is to analyze the provided cryptocurrency market data and construct a mathematically optimized trade signal with the following constraints:
1. Strict Risk Management: The Take Profit targets MUST yield a Risk-to-Reward Ratio (RRR) of 1.5 or greater. That means the distance from Entry to TP must be at least 1.5x the distance from Entry to Stop Loss.
2. Analyze where the dense "Liquidity Walls" (Order Book clusters) are. Major buy walls are support liquidity; major sell walls are resistance liquidity.
3. Be highly realistic. If the market is extremely sideways or dangerous, you may recommend 'HOLD'. Otherwise, choose 'BUY' or 'SELL'.
4. Provide a granular analysis highlighting specific reasons: Fibonacci ratios, volume profile, support/resistance confirmations, and order book imbalance.

You must respond in strict JSON format matching the schema provided.`;

    const prompt = `Perform a full professional trading analysis on the following Binance data:
Symbol: ${symbol}
Current Price: ${currentPrice}

Order Book Summary:
- Top 10 Bids (Buy Orders) total volume: ${orderBookSummary?.bidsVolume || "N/A"}
- Top 10 Asks (Sell Orders) total volume: ${orderBookSummary?.asksVolume || "N/A"}
- Bid/Ask Volume Ratio (Skew): ${orderBookSummary?.skew || "N/A"}
- Identified Order Book Walls (Large Liquidity): ${JSON.stringify(orderBookSummary?.walls || [])}

Candlestick Data (Last 20 periods, showing newest first):
${candles.slice(0, 20).map((c: any, idx: number) => `Period ${idx+1}: Time ${new Date(c.time).toISOString()} | O: ${c.open} | H: ${c.high} | L: ${c.low} | C: ${c.close} | V: ${c.volume}`).join("\n")}

Construct a complete, highly accurate signal following the instructions. Return valid JSON only.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["symbol", "direction", "confidence", "entryRange", "stopLoss", "takeProfit1", "takeProfit2", "takeProfit3", "riskRewardRatio", "analysisText", "indicators", "liquidityZones"],
          properties: {
            symbol: { type: Type.STRING },
            direction: { 
              type: Type.STRING, 
              enum: ["BUY", "SELL", "HOLD"] 
            },
            confidence: { 
              type: Type.INTEGER,
              description: "Confidence rating of this signal, from 1 to 100."
            },
            entryRange: {
              type: Type.OBJECT,
              required: ["min", "max"],
              properties: {
                min: { type: Type.NUMBER, description: "Lower bound of ideal entry price zone." },
                max: { type: Type.NUMBER, description: "Upper bound of ideal entry price zone." }
              }
            },
            stopLoss: { 
              type: Type.NUMBER, 
              description: "Strict stop loss price level." 
            },
            takeProfit1: { type: Type.NUMBER, description: "Conservative take profit target 1." },
            takeProfit2: { type: Type.NUMBER, description: "Moderate take profit target 2." },
            takeProfit3: { type: Type.NUMBER, description: "Aggressive take profit target 3." },
            riskRewardRatio: { 
              type: Type.NUMBER, 
              description: "Calculated risk-reward ratio, e.g. 2.5. Must be 1.5 or greater." 
            },
            analysisText: { 
              type: Type.STRING, 
              description: "Professional markdown analysis report including Technical indicators, orderbook analysis, and trading logic." 
            },
            indicators: {
              type: Type.OBJECT,
              required: ["rsi", "macd", "trend"],
              properties: {
                rsi: { type: Type.NUMBER, description: "Relative Strength Index estimate (1-100)." },
                macd: { type: Type.STRING, description: "MACD status (e.g. Bullish Crossover, Bearish Convergence)." },
                trend: { type: Type.STRING, description: "Current market trend description (e.g. Strongly Bullish, Ranging, Moderately Bearish)." }
              }
            },
            liquidityZones: {
              type: Type.ARRAY,
              description: "Price zones where major order books clusters/walls represent substantial liquidity.",
              items: {
                type: Type.OBJECT,
                required: ["price", "type", "volume", "strength"],
                properties: {
                  price: { type: Type.NUMBER },
                  type: { type: Type.STRING, enum: ["SUPPORT_WALL", "RESISTANCE_WALL"] },
                  volume: { type: Type.NUMBER },
                  strength: { type: Type.STRING, enum: ["STRONG", "MODERATE"] }
                }
              }
            }
          }
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response generated by Gemini API.");
    }

    res.json(JSON.parse(responseText));
  } catch (error: any) {
    console.error("AI Analysis endpoint error:", error);
    res.status(500).json({ error: error.message || "An error occurred during AI analysis." });
  }
});

// Setup Vite Dev server or production static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
