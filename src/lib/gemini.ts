import { GoogleGenAI, Type } from '@google/genai';

export type TradeSignal = {
  asset: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  entry: string;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  rr_ratio: string;
  ai_reasoning: string;
  timestamp: number;
};

export async function analyzeCryptoData(
  asset: string,
  technicalData: any,
  smcData: any,
  timeframe: string
): Promise<TradeSignal> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing');
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are an Elite Quantitative Developer & Institutional Crypto AI Architect.
Analyze the following technical, SMC, and on-chain data for ${asset} on the ${timeframe} timeframe.
Use the googleSearch tool to fetch the latest Twitter/X sentiment, Macro News events, Whale wallet movements, and BTC Dominance (BTC.D).

Technical Data:
${JSON.stringify(technicalData, null, 2)}

Smart Money Concepts (SMC) Data:
${JSON.stringify(smcData, null, 2)}

Evaluate the confluence of these factors.
Apply Strict Risk Management:
- Minimum 1:2 Risk-to-Reward ratio.
- Stop-Loss must be calculated using ATR combined with structural Order Blocks.

Return a STRICT JSON output with the following structure:
{
  "asset": "COIN",
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": 1-100,
  "entry": "0.0",
  "stop_loss": 0.0,
  "take_profit_1": 0.0,
  "take_profit_2": 0.0,
  "rr_ratio": "1:3",
  "ai_reasoning": "Detailed breakdown of Indicators, SMC, and Sentiment"
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          asset: { type: Type.STRING },
          action: { type: Type.STRING, enum: ['BUY', 'SELL', 'HOLD'] },
          confidence: { type: Type.INTEGER },
          entry: { type: Type.STRING },
          stop_loss: { type: Type.NUMBER },
          take_profit_1: { type: Type.NUMBER },
          take_profit_2: { type: Type.NUMBER },
          rr_ratio: { type: Type.STRING },
          ai_reasoning: { type: Type.STRING },
        },
        required: [
          'asset',
          'action',
          'confidence',
          'entry',
          'stop_loss',
          'take_profit_1',
          'take_profit_2',
          'rr_ratio',
          'ai_reasoning',
        ],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('No response from Gemini');
  }

  const result = JSON.parse(text);
  return {
    ...result,
    timestamp: Date.now(),
  };
}
