import React, { useState } from 'react';
import { TradeSignal } from '../lib/ai';
import { TrendingUp, TrendingDown, Minus, ShieldAlert, Target, Crosshair, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';

export function SignalCard({ signal }: { signal: TradeSignal | null }) {
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);

  if (!signal) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-zinc-900/50 rounded-2xl border border-white/5 text-zinc-500">
        <Target className="w-12 h-12 mb-4 opacity-50" />
        <p>Awaiting analysis...</p>
      </div>
    );
  }

  const isBuy = signal.action === 'BUY';
  const isSell = signal.action === 'SELL';
  const isHold = signal.action === 'HOLD';

  return (
    <div className={cn(
      "p-6 rounded-2xl border transition-all duration-500",
      isBuy ? "bg-emerald-950/20 border-emerald-500/20" :
      isSell ? "bg-rose-950/20 border-rose-500/20" :
      "bg-zinc-900/50 border-white/10"
    )}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            {signal.asset}
            <span className={cn(
              "text-sm px-2 py-1 rounded-md font-mono font-medium",
              isBuy ? "bg-emerald-500/20 text-emerald-400" :
              isSell ? "bg-rose-500/20 text-rose-400" :
              "bg-zinc-800 text-zinc-400"
            )}>
              {signal.action}
            </span>
          </h2>
          <p className="text-sm text-zinc-400 mt-1">Confidence: {signal.confidence}%</p>
        </div>
        <div className={cn(
          "p-3 rounded-xl",
          isBuy ? "bg-emerald-500/10 text-emerald-400" :
          isSell ? "bg-rose-500/10 text-rose-400" :
          "bg-zinc-800 text-zinc-400"
        )}>
          {isBuy && <TrendingUp className="w-6 h-6" />}
          {isSell && <TrendingDown className="w-6 h-6" />}
          {isHold && <Minus className="w-6 h-6" />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-black/20 border border-white/5">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
            <Crosshair className="w-4 h-4" /> Entry
          </div>
          <div className="font-mono text-lg text-white">{signal.entry}</div>
        </div>
        <div className="p-4 rounded-xl bg-black/20 border border-white/5">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
            <ShieldAlert className="w-4 h-4" /> Stop Loss
          </div>
          <div className="font-mono text-lg text-rose-400">{signal.stop_loss}</div>
        </div>
        <div className="p-4 rounded-xl bg-black/20 border border-white/5">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
            <Target className="w-4 h-4" /> Take Profit 1
          </div>
          <div className="font-mono text-lg text-emerald-400">{signal.take_profit_1}</div>
        </div>
        <div className="p-4 rounded-xl bg-black/20 border border-white/5">
          <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
            <Target className="w-4 h-4" /> Take Profit 2
          </div>
          <div className="font-mono text-lg text-emerald-400">{signal.take_profit_2}</div>
        </div>
      </div>

      <div className="mb-6">
        <div className="text-sm text-zinc-400 mb-2">Risk/Reward Ratio</div>
        <div className="font-mono text-xl text-white">{signal.rr_ratio}</div>
      </div>

      <div>
        <button 
          onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
          className="flex items-center justify-between w-full text-left text-sm text-zinc-400 mb-2 hover:text-zinc-300 transition-colors focus:outline-none"
        >
          <span>AI Reasoning (Technicals, SMC, Sentiment)</span>
          {isReasoningExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {isReasoningExpanded && (
          <div className="text-sm text-zinc-300 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5 mt-2 overflow-hidden">
            <div className="prose prose-invert prose-sm max-w-none">
              <Markdown>{signal.ai_reasoning}</Markdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
