import React from 'react';
import { TradingSignal, SignalDirection } from '../types';
import { Target, ShieldAlert, Award, Compass, Zap, HelpCircle, Flame, CheckCircle2 } from 'lucide-react';

interface SignalInsightProps {
  symbol: string;
  signal: TradingSignal | null;
  loading: boolean;
  onGenerateSignal: () => void;
  mockExecuting: boolean;
  onExecuteMockTrade: () => void;
  successMessage: string;
}

export default function SignalInsight({
  symbol,
  signal,
  loading,
  onGenerateSignal,
  mockExecuting,
  onExecuteMockTrade,
  successMessage,
}: SignalInsightProps) {
  
  const getDirectionBadge = (dir: SignalDirection) => {
    switch (dir) {
      case 'BUY':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            STRONG BUY
          </span>
        );
      case 'SELL':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
            STRONG SELL
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
            HOLD / SIDEWAYS
          </span>
        );
    }
  };

  return (
    <div className="bg-[#161A1E] rounded-xl border border-[#2B2F36] p-5 flex flex-col h-full shadow-lg relative overflow-hidden" id="signal-insight-panel">
      {/* Dynamic Glow background */}
      {signal && signal.direction === 'BUY' && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl pointer-events-none rounded-full"></div>
      )}
      {signal && signal.direction === 'SELL' && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl pointer-events-none rounded-full"></div>
      )}

      {/* Panel Title */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2B2F36]" id="signal-panel-header">
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">AI Signal Generator</h3>
          <p className="text-[10px] text-[#848E9C] font-mono mt-0.5">Real-time Orderflow + Liquidity Scan</p>
        </div>
        
        <button
          onClick={onGenerateSignal}
          disabled={loading}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1 ${
            loading
              ? 'bg-[#2B2F36] text-slate-500 cursor-not-allowed'
              : 'bg-yellow-500 hover:bg-yellow-600 text-black shadow-sm active:scale-95'
          }`}
          id="trigger-analysis-btn"
        >
          <Zap className={`w-3.5 h-3.5 ${loading ? 'animate-pulse' : ''}`} />
          {loading ? 'ANALYZING...' : 'RUN AI DESK'}
        </button>
      </div>

      {!signal && !loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6" id="no-signal-state">
          <Flame className="w-12 h-12 text-yellow-500/60 mb-3 animate-bounce" />
          <h4 className="text-sm font-bold text-white mb-1">Interactive Trading Desk Ready</h4>
          <p className="text-xs text-[#848E9C] max-w-[240px] leading-relaxed mb-4">
            Select a token from the left or search any Binance pair, then run the AI engine.
          </p>
          <button
            onClick={onGenerateSignal}
            className="px-4 py-2 bg-[#2B2F36] hover:bg-[#383d47] text-white border border-[#484F59] rounded-lg text-xs font-bold transition-all"
            id="initial-scan-btn"
          >
            Start First Scan
          </button>
        </div>
      ) : loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4" id="signal-loading-state">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-yellow-500 border-r-yellow-500 rounded-full animate-spin"></div>
          </div>
          <div className="text-center space-y-1">
            <h4 className="text-xs font-bold font-mono text-yellow-500 tracking-widest animate-pulse">SIFTING ORDERBOOK LIQUIDITY</h4>
            <p className="text-[10px] text-[#848E9C] max-w-[200px] leading-relaxed">
              Evaluating candle setups, calculating strict RRR values, and locating dense bids/asks zones...
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between" id="active-signal-details">
          {/* Badge & Confidence Score Header */}
          <div className="text-center mb-4" id="signal-badge-confidence">
            <div className="mb-2">{getDirectionBadge(signal.direction)}</div>
            <h3 className="text-lg font-bold tracking-tight text-white">{signal.symbol} Setup</h3>
            <p className="text-[10px] text-[#848E9C] font-mono mt-0.5">
              Confidence Score: <span className="text-yellow-500 font-bold">{signal.confidence}%</span>
            </p>
          </div>

          {/* Key Trade Parameters */}
          <div className="space-y-3 flex-1" id="signal-parameters-container">
            {/* Entry Range */}
            <div className="bg-[#2B2F36]/60 border border-[#383d47] p-2.5 rounded-lg flex items-center justify-between" id="signal-entry-block">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-[9px] text-[#848E9C] uppercase font-bold">Ideal Entry zone</div>
                  <div className="text-xs font-bold font-mono text-white mt-0.5">
                    ${signal.entryRange.min.toLocaleString(undefined, { maximumFractionDigits: 4 })} - ${signal.entryRange.max.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </div>
                </div>
              </div>
              <div className="text-[10px] bg-cyan-950/40 text-cyan-400 border border-cyan-800/30 px-2 py-0.5 rounded font-mono">
                LIMIT
              </div>
            </div>

            {/* Take Profits */}
            <div className="bg-[#2B2F36]/40 border-l-4 border-emerald-500 p-2.5 rounded-lg" id="signal-tp-block">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-emerald-400" />
                <span className="text-[9px] text-emerald-400 uppercase font-bold tracking-wide">Target Profits (Take Profit)</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center mt-1.5">
                <div className="bg-[#161A1E] p-1.5 rounded border border-[#2B2F36]">
                  <span className="text-[9px] text-[#848E9C] block">TP 1</span>
                  <span className="text-xs font-bold font-mono text-emerald-400">${signal.takeProfit1.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                </div>
                <div className="bg-[#161A1E] p-1.5 rounded border border-[#2B2F36]">
                  <span className="text-[9px] text-[#848E9C] block">TP 2</span>
                  <span className="text-xs font-bold font-mono text-emerald-400">${signal.takeProfit2.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                </div>
                <div className="bg-[#161A1E] p-1.5 rounded border border-[#2B2F36]">
                  <span className="text-[9px] text-[#848E9C] block">TP 3</span>
                  <span className="text-xs font-bold font-mono text-emerald-300">${signal.takeProfit3.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                </div>
              </div>
            </div>

            {/* Stop Loss */}
            <div className="bg-[#2B2F36]/40 border-l-4 border-rose-500 p-2.5 rounded-lg flex items-center justify-between" id="signal-sl-block">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <div>
                  <div className="text-[9px] text-rose-400 uppercase font-bold">Strict Stop Loss</div>
                  <div className="text-xs font-bold font-mono text-rose-300 mt-0.5">
                    ${signal.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </div>
                </div>
              </div>
              <span className="text-[9px] text-[#848E9C] font-mono">
                -{((Math.abs(signal.entryRange.max - signal.stopLoss) / signal.entryRange.max) * 100).toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="mt-3 pt-3 border-t border-[#2B2F36] space-y-2 text-[11px] font-mono" id="signal-stats-summary">
            <div className="flex justify-between">
              <span className="text-[#848E9C]">Risk Reward Ratio</span>
              <span className="text-emerald-400 font-bold">1:{signal.riskRewardRatio}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#848E9C]">Market Trend</span>
              <span className="text-yellow-500 font-bold">{signal.indicators.trend}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#848E9C]">RSI Estimation</span>
              <span className="text-white font-bold">{signal.indicators.rsi}</span>
            </div>
          </div>

          {/* Mock Trade Action Button */}
          <div className="mt-4" id="action-btn-container">
            <button
              onClick={onExecuteMockTrade}
              disabled={mockExecuting}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2.5 rounded-lg text-xs transition-all active:scale-98 shadow-md"
              id="execute-mock-trade-btn"
            >
              {mockExecuting ? 'TRANSMITTING ORDER...' : 'EXECUTE TRADE ON BINANCE'}
            </button>
            {successMessage && (
              <div className="mt-2.5 p-2 bg-emerald-950/60 border border-emerald-900/40 rounded-lg flex items-center gap-2 text-[10px] text-emerald-400 font-mono" id="success-feedback">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
