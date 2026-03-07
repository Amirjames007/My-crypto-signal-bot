import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    // Use environment variable first, then fallback to the provided key for immediate fix
    const key = process.env.OPENAI_API_KEY || "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";
    
    if (!key) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    openaiClient = new OpenAI({ 
      apiKey: key,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://ais-dev.run.app", // Optional, for including your app on openrouter.ai rankings.
        "X-Title": "Crypto AI Architect", // Optional. Shows in rankings on openrouter.ai.
      }
    });
  }
  return openaiClient;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // Proxy for Binance Klines to avoid client-side blocking/CORS issues
  app.get("/api/klines", async (req, res) => {
    try {
      const { symbol, interval, limit } = req.query;
      const url = `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit || 200}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Binance API returned ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Binance proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch data from Binance" });
    }
  });

  app.post("/api/analyze", async (req, res) => {
    try {
      const { asset, technicalData, smcData, timeframe, recentTrades } = req.body;
      const openai = getOpenAI();

      const recentTradesContext = recentTrades && recentTrades.length > 0
        ? `\nRecent Trades History (Learn from these past signals to improve your accuracy):\n${JSON.stringify(recentTrades.slice(0, 5), null, 2)}\nAnalyze why past trades won or lost and adjust your strategy accordingly.`
        : '';

      const prompt = `
You are an Elite Quantitative Developer & Institutional Crypto AI Architect.
Analyze the following technical, SMC, and on-chain data for ${asset} on the ${timeframe} timeframe.

Technical Data:
${JSON.stringify(technicalData, null, 2)}

Smart Money Concepts (SMC) Data:
${JSON.stringify(smcData, null, 2)}
${recentTradesContext}

Evaluate the confluence of these factors.
Apply Strict Risk Management:
- Minimum 1:2 Risk-to-Reward ratio.
- Stop-Loss must be calculated using ATR combined with structural Order Blocks.

Return a STRICT JSON output with the following structure:
{
  "asset": "COIN",
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": 80,
  "entry": "0.0",
  "stop_loss": 0.0,
  "take_profit_1": 0.0,
  "take_profit_2": 0.0,
  "rr_ratio": "1:3",
  "ai_reasoning": "Detailed breakdown of Indicators and SMC"
}
`;

      const response = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const text = response.choices[0].message.content;
      if (!text) {
        throw new Error("No response from OpenAI");
      }

      const result = JSON.parse(text);
      res.json({
        ...result,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: error.message || "Analysis failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    
    // SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
