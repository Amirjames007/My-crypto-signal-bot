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
  status?: 'PENDING' | 'WON' | 'LOST';
};

export async function analyzeCryptoData(
  asset: string,
  technicalData: any,
  smcData: any,
  timeframe: string,
  recentTrades: TradeSignal[] = []
): Promise<TradeSignal> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      asset,
      technicalData,
      smcData,
      timeframe,
      recentTrades,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to analyze data via API');
  }

  return response.json();
}
