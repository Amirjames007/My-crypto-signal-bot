export type Kline = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
};

export async function fetchKlines(symbol: string, interval: string, limit: number = 200): Promise<Kline[]> {
  const url = `/api/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch klines for ${symbol} at ${interval}`);
  }
  const data = await response.json();
  return data.map((d: any[]) => ({
    openTime: d[0],
    open: parseFloat(d[1]),
    high: parseFloat(d[2]),
    low: parseFloat(d[3]),
    close: parseFloat(d[4]),
    volume: parseFloat(d[5]),
    closeTime: d[6],
  }));
}

export type Ticker = {
  symbol: string;
  priceChangePercent: number;
  lastPrice: number;
  highPrice: number;
  lowPrice: number;
  quoteVolume: number;
};

export async function fetchTickers(symbols: string[]): Promise<Ticker[]> {
  const symbolsStr = JSON.stringify(symbols);
  const url = `/api/ticker?symbols=${encodeURIComponent(symbolsStr)}`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch tickers`);
  }
  const data = await response.json();
  return data.map((d: any) => ({
    symbol: d.symbol,
    priceChangePercent: parseFloat(d.priceChangePercent),
    lastPrice: parseFloat(d.lastPrice),
    highPrice: parseFloat(d.highPrice),
    lowPrice: parseFloat(d.lowPrice),
    quoteVolume: parseFloat(d.quoteVolume),
  }));
}
