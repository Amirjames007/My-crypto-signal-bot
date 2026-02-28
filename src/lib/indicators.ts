import { Kline } from './binance';

export function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

export function calculateRSI(data: number[], period: number = 14): number[] {
  const rsi = new Array(data.length).fill(0);
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsi[i] = 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsi;
}

export function calculateMACD(data: number[], fast: number = 12, slow: number = 26, signal: number = 9) {
  const fastEMA = calculateEMA(data, fast);
  const slowEMA = calculateEMA(data, slow);
  const macdLine = fastEMA.map((f, i) => f - slowEMA[i]);
  const signalLine = calculateEMA(macdLine, signal);
  const histogram = macdLine.map((m, i) => m - signalLine[i]);
  return { macdLine, signalLine, histogram };
}

export function calculateATR(klines: Kline[], period: number = 14): number[] {
  const tr = klines.map((k, i) => {
    if (i === 0) return k.high - k.low;
    const prevClose = klines[i - 1].close;
    return Math.max(k.high - k.low, Math.abs(k.high - prevClose), Math.abs(k.low - prevClose));
  });
  const atr = new Array(tr.length).fill(0);
  let sumTR = 0;
  for (let i = 0; i < period; i++) sumTR += tr[i];
  atr[period - 1] = sumTR / period;
  for (let i = period; i < tr.length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }
  return atr;
}

export function calculateBollingerBands(data: number[], period: number = 20, multiplier: number = 2) {
  const sma = new Array(data.length).fill(0);
  const upper = new Array(data.length).fill(0);
  const lower = new Array(data.length).fill(0);

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    const mean = sum / period;
    sma[i] = mean;

    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    upper[i] = mean + multiplier * stdDev;
    lower[i] = mean - multiplier * stdDev;
  }
  return { sma, upper, lower };
}

export function generateSMCData(klines: Kline[]) {
  // Mocking advanced SMC concepts for the AI to interpret based on recent price action
  const recent = klines.slice(-20);
  const highest = Math.max(...recent.map(k => k.high));
  const lowest = Math.min(...recent.map(k => k.low));
  const current = klines[klines.length - 1].close;

  const fvg = current > highest * 0.98 ? "Bullish FVG detected near current price" : "Bearish FVG detected below current price";
  const orderBlock = current < lowest * 1.02 ? "Bullish Order Block formed at recent lows" : "Bearish Order Block formed at recent highs";
  const liquiditySweep = current > highest ? "Buy-side liquidity swept" : (current < lowest ? "Sell-side liquidity swept" : "No recent liquidity sweeps");

  return {
    fvg,
    orderBlock,
    liquiditySweep,
    fibonacci: {
      level_0: highest,
      level_0_236: highest - (highest - lowest) * 0.236,
      level_0_382: highest - (highest - lowest) * 0.382,
      level_0_5: highest - (highest - lowest) * 0.5,
      level_0_618: highest - (highest - lowest) * 0.618,
      level_1: lowest
    }
  };
}
