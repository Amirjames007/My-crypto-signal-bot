import React, { useState, useEffect, useRef } from 'react';
import { fetchKlines, fetchTickers } from '../lib/binance';
import { calculateEMA, calculateRSI, calculateMACD, calculateATR, calculateBollingerBands, generateSMCData } from '../lib/indicators';
import { analyzeCryptoData, TradeSignal } from '../lib/ai';
import { SignalCard } from './SignalCard';
import { TradeJournal } from './TradeJournal';
import { Activity, RefreshCw, AlertCircle, Bot, StopCircle, LogIn, LogOut, User } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc, limit, getDocFromServer } from 'firebase/firestore';

const ASSETS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT', 'DOTUSDT', 'LINKUSDT', 'AVAXUSDT', 'MATICUSDT'];
const TIMEFRAMES = ['15m', '1h', '4h', '1d'];

export function Dashboard() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [asset, setAsset] = useState(ASSETS[0]);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[2]); // Default 4h
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSignal, setCurrentSignal] = useState<TradeSignal | null>(null);
  const [journal, setJournal] = useState<TradeSignal[]>([]);
  const [isAutoPilot, setIsAutoPilot] = useState(false);
  const [autoPilotStatus, setAutoPilotStatus] = useState<string>('');
  
  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Firestore listener for journal
  useEffect(() => {
    if (!user) {
      setJournal([]);
      return;
    }

    const q = query(
      collection(db, 'trades'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trades = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      setJournal(trades);
      if (trades.length > 0 && !currentSignal) {
        setCurrentSignal(trades[0]);
      }
    }, (err) => {
      console.error("Firestore error:", err);
      setError("Failed to sync with database. Check your connection.");
    });

    return () => unsubscribe();
  }, [user]);

  // Test connection to Firestore
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    }
    testConnection();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentSignal(null);
    } catch (err: any) {
      setError(err.message || "Failed to sign out");
    }
  };

  // Use ref to access latest journal state inside intervals
  const journalRef = useRef(journal);
  useEffect(() => {
    journalRef.current = journal;
  }, [journal]);

  const runAnalysisForAsset = async (targetAsset: string, targetTimeframe: string, isAuto: boolean = false) => {
    if (!user) {
      setError("Please sign in to run analysis.");
      return;
    }
    
    if (!isAuto) setLoading(true);
    setError(null);
    try {
      if (isAuto) setAutoPilotStatus(`Analyzing ${targetAsset} (${targetTimeframe})...`);
      
      // 1. Fetch Data
      const klines = await fetchKlines(targetAsset, targetTimeframe, 200);
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

      // Evaluate previous pending trades for this asset
      const high = Math.max(...klines.slice(-5).map(k => k.high));
      const low = Math.min(...klines.slice(-5).map(k => k.low));

      // 4. AI Analysis (Pass recent trades for learning)
      const signal = await analyzeCryptoData(targetAsset, technicalData, smcData, targetTimeframe, user.uid, journalRef.current);
      
      // 5. Save to Firestore
      await addDoc(collection(db, 'trades'), signal);
      
      // 6. Update pending trades in Firestore
      const pendingTrades = journalRef.current.filter(t => t.status === 'PENDING' && t.asset === targetAsset);
      for (const trade of pendingTrades) {
        if (!(trade as any).id) continue;
        
        let newStatus: 'PENDING' | 'WON' | 'LOST' = 'PENDING';
        if (trade.action === 'BUY') {
          if (low <= trade.stop_loss) newStatus = 'LOST';
          else if (high >= trade.take_profit_1) newStatus = 'WON';
        } else if (trade.action === 'SELL') {
          if (high >= trade.stop_loss) newStatus = 'LOST';
          else if (low <= trade.take_profit_1) newStatus = 'WON';
        }
        
        if (newStatus !== 'PENDING') {
          await updateDoc(doc(db, 'trades', (trade as any).id), { status: newStatus });
        }
      }

    } catch (err: any) {
      console.error(`Analysis failed for ${targetAsset}:`, err);
      if (!isAuto) setError(err.message || `An error occurred during analysis of ${targetAsset}`);
    } finally {
      if (!isAuto) setLoading(false);
      if (isAuto) setAutoPilotStatus('Waiting for next cycle...');
    }
  };

  const runAnalysis = () => runAnalysisForAsset(asset, timeframe, false);

  // Auto-Pilot Logic
  useEffect(() => {
    if (!isAutoPilot || !user) {
      setAutoPilotStatus('');
      return;
    }

    let isCancelled = false;

    const runAutoPilotCycle = async () => {
      try {
        setAutoPilotStatus('Scanning market for opportunities...');
        
        // 1. Fetch market data for all assets
        const tickers = await fetchTickers(ASSETS);
        
        // 2. Score assets based on volatility and volume
        const scoredAssets = tickers.map(t => {
          const range = (t.highPrice - t.lowPrice) / t.lastPrice;
          const volatilityScore = range * 100;
          const volumeScore = Math.log10(t.quoteVolume);
          return {
            symbol: t.symbol,
            volatility: volatilityScore,
            score: volatilityScore * volumeScore
          };
        }).sort((a, b) => b.score - a.score);

        // 3. Select top 3 assets to analyze
        const topAssets = scoredAssets.slice(0, 3);
        
        for (const target of topAssets) {
          if (isCancelled) break;
          
          // 4. Select timeframe based on volatility
          let selectedTimeframe = '4h';
          if (target.volatility > 8) selectedTimeframe = '15m';
          else if (target.volatility > 5) selectedTimeframe = '1h';
          else if (target.volatility < 2) selectedTimeframe = '1d';
          
          await runAnalysisForAsset(target.symbol, selectedTimeframe, true);
          
          // Wait 15 seconds between assets
          if (!isCancelled) {
            setAutoPilotStatus(`Waiting before next asset...`);
            await new Promise(resolve => setTimeout(resolve, 15000));
          }
        }
      } catch (err) {
        console.error("Auto-pilot cycle error:", err);
        setAutoPilotStatus('Cycle failed. Retrying later...');
      }
    };

    // Run immediately on start
    runAutoPilotCycle();

    // Then run every 2 hours for more responsiveness
    const intervalId = setInterval(runAutoPilotCycle, 2 * 60 * 60 * 1000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [isAutoPilot, user]);

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
        
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4 bg-zinc-900/80 p-2 rounded-xl border border-white/5">
            {user ? (
              <div className="flex items-center gap-3 px-3 py-1 border-r border-white/10">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-emerald-500/30" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-emerald-400" />
                  </div>
                )}
                <div className="hidden lg:block">
                  <p className="text-xs font-medium text-white truncate max-w-[100px]">{user.displayName || 'Trader'}</p>
                  <button onClick={handleLogout} className="text-[10px] text-zinc-500 hover:text-rose-400 flex items-center gap-1">
                    <LogOut className="w-2 h-2" /> Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg text-sm px-4 py-2 transition-colors border border-white/10"
              >
                <LogIn className="w-4 h-4" /> Sign In
              </button>
            )}

            <select 
              value={asset} 
              onChange={e => setAsset(e.target.value)}
              disabled={isAutoPilot || !user}
              className="bg-black border border-white/10 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 outline-none disabled:opacity-50"
            >
              {ASSETS.map(a => <option key={a} value={a}>{a.replace('USDT', '/USDT')}</option>)}
            </select>
            
            <select 
              value={timeframe} 
              onChange={e => setTimeframe(e.target.value)}
              disabled={isAutoPilot || !user}
              className="bg-black border border-white/10 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 outline-none disabled:opacity-50"
            >
              {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <button 
              onClick={runAnalysis}
              disabled={loading || isAutoPilot || !user}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
              {loading ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>

          <div className="flex items-center justify-end gap-3">
            {isAutoPilot && <span className="text-xs text-emerald-400 animate-pulse">{autoPilotStatus}</span>}
            <button
              onClick={() => setIsAutoPilot(!isAutoPilot)}
              disabled={!user}
              className={`flex items-center gap-2 font-medium rounded-lg text-sm px-4 py-2 focus:outline-none transition-colors disabled:opacity-50 ${
                isAutoPilot 
                  ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30' 
                  : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30'
              }`}
            >
              {isAutoPilot ? <StopCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              {isAutoPilot ? 'Stop Auto-Pilot' : 'Start Auto-Pilot (4H)'}
            </button>
          </div>
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
