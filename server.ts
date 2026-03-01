import express from "express";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    openaiClient = new OpenAI({ apiKey: key });
  }
  return openaiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
        model: "gpt-4o-mini",
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
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
