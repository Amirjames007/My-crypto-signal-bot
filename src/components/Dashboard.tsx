import React, { useState } from 'react';
import { fetchKlines } from '../lib/binance';
import { calculateEMA, calculateRSI, calculateMACD, calculateATR, calculateBollingerBands, generateSMCData } from '../lib/indicators';
import { analyzeCryptoData, TradeSignal } from '../lib/gemini';
import { SignalCard } from './SignalCard';
import { TradeJournal } from './TradeJournal';
import { Activity, RefreshCw, AlertCircle } from 'lucide-react';

const ASSETS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT'];
const TIMEFRAMES = ['15m', '4h', '1d'];

export function Dashboard() {
  const [asset, setAsset] = useState(ASSETS[0]);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[1]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSignal, setCurrentSignal] = useState<TradeSignal | null>(null);
  const [journal, setJournal] = useState<TradeSignal[]>([]);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Data
      const klines = await fetchKlines(asset, timeframe, 200);
      const closes = klines.map(k => k.close);

      // 2. Calculate Technicals
      const ema50 = calculateEMA(closes, 50);
      const ema200 = calculateEMA(closes, 200);
      const rsi = calculateRSI(closes, 14);
      const macd = calculateMACD(closes);
      const atr = calculateATR(klines, 14);
      const bb = calculateBollingerBands(closes, 20, 2);

      const technicalData = {
        currentPrice: closes[closes.length - 1],
        ema50: ema50[ema50.length - 1],
        ema200: ema200[ema200.length - 1],
        rsi: rsi[rsi.length - 1],
        macd: {
          macdLine: macd.macdLine[macd.macdLine.length - 1],
          signalLine: macd.signalLine[macd.signalLine.length - 1],
          histogram: macd.histogram[macd.histogram.length - 1],
        },
        atr: atr[atr.length - 1],
        bollingerBands: {
          upper: bb.upper[bb.upper.length - 1],
          lower: bb.lower[bb.lower.length - 1],
          sma: bb.sma[bb.sma.length - 1],
        }
      };

      // 3. SMC Data
      const smcData = generateSMCData(klines);

      // 4. AI Analysis
      const signal = await analyzeCryptoData(asset, technicalData, smcData, timeframe);
      
      setCurrentSignal(signal);
      setJournal(prev => [signal, ...prev]);

    } catch (err: any) {
      setError(err.message || 'An error occurred during analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-emerald-400" />
            Institutional Crypto AI
          </h1>
          <p className="text-zinc-400 mt-1">Pro-Level Technicals, SMC, On-Chain & Sentiment Analysis</p>
        </div>
        
        <div className="flex items-center gap-4 bg-zinc-900/80 p-2 rounded-xl border border-white/5">
          <select 
            value={asset} 
            onChange={e => setAsset(e.target.value)}
            className="bg-black border border-white/10 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 outline-none"
          >
            {ASSETS.map(a => <option key={a} value={a}>{a.replace('USDT', '/USDT')}</option>)}
          </select>
          
          <select 
            value={timeframe} 
            onChange={e => setTimeframe(e.target.value)}
            className="bg-black border border-white/10 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 outline-none"
          >
            {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <button 
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      </header>

      {error && (
        <div className="p-4 mb-4 text-sm text-rose-400 rounded-xl bg-rose-950/20 border border-rose-500/20 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <SignalCard signal={currentSignal} />
        </div>
        <div className="lg:col-span-1">
          <TradeJournal signals={journal} />
        </div>
      </div>
    </div>
  );
}
