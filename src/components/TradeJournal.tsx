import React from 'react';
import { TradeSignal } from '../lib/gemini';
import { format } from 'date-fns';
import { FileText } from 'lucide-react';
import { cn } from '../lib/utils';

export function TradeJournal({ signals }: { signals: TradeSignal[] }) {
  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/50 rounded-2xl border border-white/5 text-zinc-500">
        <FileText className="w-8 h-8 mb-4 opacity-50" />
        <p>No trades logged yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Trade Journal</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-zinc-400">
          <thead className="text-xs text-zinc-500 uppercase bg-zinc-900/80 border-b border-white/5">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entry</th>
              <th className="px-4 py-3">SL</th>
              <th className="px-4 py-3">TP1</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-zinc-800/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{format(new Date(s.timestamp), 'MM-dd HH:mm')}</td>
                <td className="px-4 py-3 font-medium text-white">{s.asset}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    s.action === 'BUY' ? "bg-emerald-500/20 text-emerald-400" :
                    s.action === 'SELL' ? "bg-rose-500/20 text-rose-400" :
                    "bg-zinc-800 text-zinc-400"
                  )}>
                    {s.action}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono">{s.entry}</td>
                <td className="px-4 py-3 font-mono text-rose-400">{s.stop_loss}</td>
                <td className="px-4 py-3 font-mono text-emerald-400">{s.take_profit_1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
