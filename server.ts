import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // Proxy for Binance 24h Ticker data
  app.get("/api/ticker", async (req, res) => {
    try {
      const { symbols } = req.query;
      const url = `https://data-api.binance.vision/api/v3/ticker/24hr${symbols ? `?symbols=${symbols}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Binance API returned ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Binance ticker proxy error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch ticker data from Binance" });
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
