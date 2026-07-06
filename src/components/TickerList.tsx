import React, { useState, useEffect } from 'react';
import { Search, RotateCw, Activity, CheckCircle, TrendingUp, TrendingDown, HelpCircle, Plus } from 'lucide-react';
import { TickerInfo } from '../types';

interface TickerListProps {
  activeSymbol: string;
  setActiveSymbol: (symbol: string) => void;
  tickers: TickerInfo[];
  loading: boolean;
  onRefresh: () => void;
  autoRefreshInterval: number; // in seconds
  setAutoRefreshInterval: (sec: number) => void;
  onAddSymbol: (symbol: string) => Promise<boolean>;
}

export default function TickerList({
  activeSymbol,
  setActiveSymbol,
  tickers,
  loading,
  onRefresh,
  autoRefreshInterval,
  setAutoRefreshInterval,
  onAddSymbol,
}: TickerListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [countdown, setCountdown] = useState(autoRefreshInterval);

  // Handle auto-refresh countdown
  useEffect(() => {
    if (autoRefreshInterval === 0) return;
    setCountdown(autoRefreshInterval);
    
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onRefresh();
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefreshInterval, onRefresh]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    if (!searchQuery.trim()) return;

    let cleanQuery = searchQuery.toUpperCase().trim();
    if (!cleanQuery.endsWith('USDT') && !cleanQuery.endsWith('BUSD') && !cleanQuery.endsWith('BTC')) {
      cleanQuery += 'USDT'; // default to USDT
    }

    setIsSearching(true);
    try {
      const success = await onAddSymbol(cleanQuery);
      if (success) {
        setSearchQuery('');
        setActiveSymbol(cleanQuery);
      } else {
        setSearchError('Symbol not found or already added.');
      }
    } catch (err) {
      setSearchError('Error finding symbol.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-100 font-sans" id="ticker-list-sidebar">
      {/* Search Header */}
      <div className="p-4 border-b border-slate-800" id="sidebar-search-container">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>Binance Markets</span>
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE
          </span>
        </h2>
        
        <form onSubmit={handleSearchSubmit} className="relative mb-2">
          <input
            type="text"
            placeholder="Search coin (e.g. SOL, BTC...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 pl-3 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
            id="market-search-input"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 transition-colors p-1"
            title="Search and Add Pair"
            id="search-add-btn"
          >
            {isSearching ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </form>
        
        {searchError && (
          <p className="text-[10px] text-red-400 bg-red-950/20 px-2 py-1 rounded border border-red-900/30 font-mono" id="search-error-msg">
            {searchError}
          </p>
        )}
      </div>

      {/* Auto Refresh Config */}
      <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono" id="refresh-settings">
        <span className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-cyan-400" />
          Update Interval:
        </span>
        <div className="flex items-center gap-2">
          <select
            value={autoRefreshInterval}
            onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
            className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-200 focus:outline-none focus:border-cyan-500"
            id="interval-select"
          >
            <option value={1}>1s</option>
            <option value={3}>3s</option>
            <option value={5}>5s</option>
            <option value={10}>10s</option>
            <option value={0}>Manual</option>
          </select>
          
          {autoRefreshInterval > 0 ? (
            <span className="text-[10px] text-cyan-400 min-w-[20px] text-right" id="refresh-countdown">
              {countdown}s
            </span>
          ) : (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="text-slate-400 hover:text-cyan-400 p-0.5 transition-colors"
              title="Refresh Now"
              id="manual-refresh-btn"
            >
              <RotateCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Ticker List Scrollable */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 custom-scrollbar" id="tickers-scrollable">
        {tickers.map((ticker) => {
          const isActive = ticker.symbol === activeSymbol;
          const isPositive = ticker.priceChangePercent >= 0;
          
          return (
            <button
              key={ticker.symbol}
              onClick={() => setActiveSymbol(ticker.symbol)}
              className={`w-full flex items-center justify-between p-3.5 text-left transition-all relative ${
                isActive 
                  ? 'bg-slate-800/60 border-l-2 border-cyan-400' 
                  : 'hover:bg-slate-850/40'
              }`}
              id={`ticker-row-${ticker.symbol}`}
            >
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white tracking-wide flex items-center gap-1">
                  {ticker.symbol.replace('USDT', '')}
                  <span className="text-[9px] text-slate-500">/USDT</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Vol: {ticker.volume ? ticker.volume.toLocaleString(undefined, { maximumFractionDigits: 0 }) : 'N/A'}
                </span>
              </div>

              <div className="flex flex-col items-end text-right font-mono">
                <span className={`text-xs font-semibold ${isActive ? 'text-cyan-400' : 'text-slate-200'}`}>
                  {ticker.price >= 100
                    ? ticker.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : ticker.price >= 1
                    ? ticker.price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })
                    : ticker.price.toFixed(6)}
                </span>
                <span className={`text-[10px] flex items-center gap-0.5 mt-0.5 ${
                  isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {isPositive ? '+' : ''}
                  {ticker.priceChangePercent.toFixed(2)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Instructions Info */}
      <div className="p-3.5 bg-slate-950/60 border-t border-slate-800 text-[10px] text-slate-500 leading-relaxed font-mono" id="sidebar-footer">
        <p className="flex items-center gap-1 text-slate-400 font-semibold mb-1">
          <CheckCircle className="w-3 h-3 text-cyan-400" />
          Real-time Sync
        </p>
        Analyzing Binance order flows, liquidity depth gaps & multi-timeframe candles continuously.
      </div>
    </div>
  );
}
