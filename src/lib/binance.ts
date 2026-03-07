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
