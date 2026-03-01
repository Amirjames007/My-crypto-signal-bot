import React from 'react';
import { TradeSignal } from '../lib/ai';
import { format, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { FileText, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '../lib/utils';

export function TradeJournal({ signals }: { signals: TradeSignal[] }) {
  const exportPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(16);
    doc.text('Institutional Crypto AI - Performance Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

    // Calculate stats
    const todaySignals = signals.filter(s => isToday(new Date(s.timestamp)));
    const weeklySignals = signals.filter(s => isThisWeek(new Date(s.timestamp)));
    const monthlySignals = signals.filter(s => isThisMonth(new Date(s.timestamp)));

    const getStats = (sigs: TradeSignal[]) => {
      const won = sigs.filter(s => s.status === 'WON').length;
      const lost = sigs.filter(s => s.status === 'LOST').length;
      const pending = sigs.filter(s => s.status === 'PENDING' || !s.status).length;
      const totalResolved = won + lost;
      const winRate = totalResolved > 0 ? ((won / totalResolved) * 100).toFixed(1) : '0.0';
      
      // Calculate performance percentage (Profit Factor simplified)
      // Assuming RR is roughly 1:2 on average for this calculation if not explicitly parsed
      // A more accurate way would be to parse the rr_ratio string, but for simplicity:
      // Performance % = (WinRate * AverageReward) - (LossRate * AverageRisk)
      // If we assume Risk = 1, Reward = 2:
      // Perf = (WinRate/100 * 2) - ((100-WinRate)/100 * 1)
      const winRateNum = parseFloat(winRate);
      const performancePct = totalResolved > 0 
        ? (((winRateNum / 100) * 2) - (((100 - winRateNum) / 100) * 1)) * 100 
        : 0;
        
      const formattedPerf = performancePct > 0 ? `+${performancePct.toFixed(1)}%` : `${performancePct.toFixed(1)}%`;

      return { won, lost, pending, winRate, formattedPerf };
    };

    const todayStats = getStats(todaySignals);
    const weeklyStats = getStats(weeklySignals);
    const monthlyStats = getStats(monthlySignals);
    const allTimeStats = getStats(signals);

    // Performance Summary Section
    doc.setFontSize(12);
    doc.text('Performance Summary', 14, 32);
    
    autoTable(doc, {
      startY: 36,
      head: [['Period', 'Won', 'Lost', 'Pending', 'Win Rate', 'Est. Perf.']],
      body: [
        ['Today', todayStats.won.toString(), todayStats.lost.toString(), todayStats.pending.toString(), `${todayStats.winRate}%`, todayStats.formattedPerf],
        ['This Week', weeklyStats.won.toString(), weeklyStats.lost.toString(), weeklyStats.pending.toString(), `${weeklyStats.winRate}%`, weeklyStats.formattedPerf],
        ['This Month', monthlyStats.won.toString(), monthlyStats.lost.toString(), monthlyStats.pending.toString(), `${monthlyStats.winRate}%`, monthlyStats.formattedPerf],
        ['All Time', allTimeStats.won.toString(), allTimeStats.lost.toString(), allTimeStats.pending.toString(), `${allTimeStats.winRate}%`, allTimeStats.formattedPerf],
      ],
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 5) {
          if (data.cell.raw.toString().startsWith('+')) {
            data.cell.styles.textColor = [34, 197, 94]; // emerald-500
          } else if (data.cell.raw.toString().startsWith('-')) {
            data.cell.styles.textColor = [244, 63, 94]; // rose-500
          }
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 36;

    doc.setFontSize(12);
    doc.text('Trade History', 14, finalY + 10);

    const tableColumn = ['Date', 'Asset', 'Action', 'Entry', 'SL', 'TP1', 'Status'];
    const tableRows = signals.map(s => [
      format(new Date(s.timestamp), 'MM-dd HH:mm'),
      s.asset,
      s.action,
      s.entry,
      s.stop_loss.toString(),
      s.take_profit_1.toString(),
      s.status || 'PENDING'
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: finalY + 14,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [20, 20, 20] },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 6) {
          if (data.cell.raw === 'WON') {
            data.cell.styles.textColor = [34, 197, 94]; // emerald-500
          } else if (data.cell.raw === 'LOST') {
            data.cell.styles.textColor = [244, 63, 94]; // rose-500
          }
        }
      }
    });

    doc.save('ai_trading_performance.pdf');
  };

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
        <button onClick={exportPDF} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors">
          <Download className="w-3 h-3" /> PDF
        </button>
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
              <th className="px-4 py-3">Status</th>
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
                <td className="px-4 py-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    s.status === 'WON' ? "bg-emerald-500/20 text-emerald-400" :
                    s.status === 'LOST' ? "bg-rose-500/20 text-rose-400" :
                    "bg-zinc-800 text-zinc-400"
                  )}>
                    {s.status || 'PENDING'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
