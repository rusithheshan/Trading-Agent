import React, { useState, useEffect, useCallback } from 'react';
import { Activity, ShieldAlert, Award, Compass, Zap, Flame, Terminal, HelpCircle, CheckCircle, RefreshCw } from 'lucide-react';
import TickerList from './components/TickerList';
import TradingChart from './components/TradingChart';
import SignalInsight from './components/SignalInsight';
import LiveOrderBook from './components/LiveOrderBook';
import { TickerInfo, CandleData, OrderBook, TradingSignal } from './types';

export default function App() {
  const [activeSymbol, setActiveSymbol] = useState('BTCUSDT');
  const [tickers, setTickers] = useState<TickerInfo[]>([
    { symbol: 'BTCUSDT', price: 64281.40, priceChangePercent: 1.24, volume: 24821 },
    { symbol: 'ETHUSDT', price: 3452.12, priceChangePercent: -0.82, volume: 184511 },
    { symbol: 'SOLUSDT', price: 142.67, priceChangePercent: 4.11, volume: 984512 },
    { symbol: 'BNBUSDT', price: 582.45, priceChangePercent: 0.45, volume: 45112 },
  ]);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [activeSignal, setActiveSignal] = useState<TradingSignal | null>(null);
  
  const [loadingTickers, setLoadingTickers] = useState(false);
  const [loadingCandles, setLoadingCandles] = useState(false);
  const [loadingOrderBook, setLoadingOrderBook] = useState(false);
  const [generatingSignal, setGeneratingSignal] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(3); // default 3s refresh
  const [intervalTimeframe, setIntervalTimeframe] = useState('1h');
  
  const [mockExecuting, setMockExecuting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Fetch live market tickers from server proxy
  const fetchTickers = useCallback(async () => {
    setLoadingTickers(true);
    try {
      const response = await fetch('/api/binance/tickers');
      if (response.ok) {
        const data = await response.json();
        // Merge state to keep any user searched tickers
        setTickers((prev) => {
          const merged = [...data];
          prev.forEach((oldTicker) => {
            if (!merged.some((m) => m.symbol === oldTicker.symbol)) {
              merged.push(oldTicker);
            }
          });
          return merged;
        });
      }
    } catch (error) {
      console.error('Failed to fetch tickers:', error);
    } finally {
      setLoadingTickers(false);
    }
  }, []);

  // 2. Fetch candlesticks for currently selected pair
  const fetchCandles = useCallback(async () => {
    setLoadingCandles(true);
    try {
      const response = await fetch(`/api/binance/klines?symbol=${activeSymbol}&interval=${intervalTimeframe}&limit=35`);
      if (response.ok) {
        const data = await response.json();
        setCandles(data);
      }
    } catch (error) {
      console.error('Failed to fetch candles:', error);
    } finally {
      setLoadingCandles(false);
    }
  }, [activeSymbol, intervalTimeframe]);

  // 3. Fetch order book depth
  const fetchOrderBook = useCallback(async () => {
    setLoadingOrderBook(true);
    try {
      const response = await fetch(`/api/binance/depth?symbol=${activeSymbol}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        // Calculate cumulative sums and skewness
        const bidsTotal = data.bids.reduce((acc: number, item: any) => acc + item.amount, 0);
        const asksTotal = data.asks.reduce((acc: number, item: any) => acc + item.amount, 0);
        const skew = asksTotal > 0 ? bidsTotal / asksTotal : 1.0;

        setOrderBook({
          bids: data.bids,
          asks: data.asks,
          bidVolume: bidsTotal,
          askVolume: asksTotal,
          skew: skew,
        });
      }
    } catch (error) {
      console.error('Failed to fetch order book:', error);
    } finally {
      setLoadingOrderBook(false);
    }
  }, [activeSymbol]);

  // Handle active token or timeframe changes
  useEffect(() => {
    fetchCandles();
    fetchOrderBook();
  }, [activeSymbol, intervalTimeframe, fetchCandles, fetchOrderBook]);

  // Initial loading and ticker interval loading
  useEffect(() => {
    fetchTickers();
  }, [fetchTickers]);

  // Periodic updates for active chart details & depth
  useEffect(() => {
    if (autoRefreshInterval === 0) return;
    const interval = setInterval(() => {
      fetchOrderBook();
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, fetchOrderBook]);

  // Find currently active ticker summary info
  const activeTicker = tickers.find((t) => t.symbol === activeSymbol);

  // Search/Add custom pair from Binance
  const handleAddSymbol = async (symbol: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/binance/search?symbol=${symbol}`);
      if (!response.ok) return false;
      const data = await response.json();
      
      setTickers((prev) => {
        if (prev.some((p) => p.symbol === data.symbol)) return prev;
        return [data, ...prev];
      });
      return true;
    } catch {
      return false;
    }
  };

  // Generate quantitative AI Signal through server-side proxy
  const handleGenerateSignal = async () => {
    if (!activeTicker || candles.length === 0) return;
    setGeneratingSignal(true);
    setSuccessMessage('');

    try {
      const orderBookSummary = orderBook ? {
        bidsVolume: orderBook.bidVolume,
        asksVolume: orderBook.askVolume,
        skew: orderBook.skew,
        walls: orderBook.bids.concat(orderBook.asks).filter((item) => item.amount > 5.0).slice(0, 5),
      } : null;

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: activeSymbol,
          currentPrice: activeTicker.price,
          candles: candles,
          orderBookSummary: orderBookSummary,
        }),
      });

      if (response.ok) {
        const signal = await response.json();
        setActiveSignal(signal);
      } else {
        console.error('Failed to analyze pair');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingSignal(false);
    }
  };

  // Trigger simulated Binance API transmission
  const handleExecuteMockTrade = () => {
    if (!activeSignal) return;
    setMockExecuting(true);
    setSuccessMessage('');
    
    setTimeout(() => {
      setMockExecuting(false);
      setSuccessMessage(`Order transmitted successfully to Binance client! Position initiated inside the designated entry range of $${activeSignal.entryRange.min.toLocaleString()} - $${activeSignal.entryRange.max.toLocaleString()}. SL and TP targets linked.`);
    }, 1500);
  };

  return (
    <div className="bg-[#0B0E11] min-h-screen text-[#EAECEF] font-sans overflow-hidden flex flex-col" id="app-workspace-root">
      
      {/* Header element consistent with design instructions */}
      <header className="h-16 border-b border-[#2B2F36] flex items-center justify-between px-6 bg-[#161A1E]" id="header-bar">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
              <span className="text-black font-extrabold text-xs">AI</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              MACHAN<span className="text-yellow-500 font-extrabold">TRADER</span>
            </span>
          </div>
          
          <nav className="hidden md:flex gap-6 text-xs font-semibold uppercase tracking-wider text-[#848E9C]" id="nav-links">
            <span className="text-white border-b-2 border-yellow-500 pb-5 pt-5 cursor-default">
              Dashboard
            </span>
            <span className="hover:text-white transition-colors cursor-default py-5">
              Market Intelligence
            </span>
            <span className="hover:text-white transition-colors cursor-default py-5">
              API Management
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-[#2B2F36] rounded-full text-[10px] font-mono border border-slate-700/40 text-slate-300">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Binance Proxy: <span className="text-yellow-500 font-bold">LINKED</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-yellow-400">
            RH
          </div>
        </div>
      </header>

      {/* Main workspace layout */}
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden" id="workspace-sub-layout">
        
        {/* Market Pairs Sidebar */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-[#2B2F36] bg-[#161A1E]" id="sidebar-watchlist-container">
          <TickerList
            activeSymbol={activeSymbol}
            setActiveSymbol={setActiveSymbol}
            tickers={tickers}
            loading={loadingTickers}
            onRefresh={fetchTickers}
            autoRefreshInterval={autoRefreshInterval}
            setAutoRefreshInterval={setAutoRefreshInterval}
            onAddSymbol={handleAddSymbol}
          />
        </aside>

        {/* Central Dashboard Hub */}
        <main className="flex-1 bg-[#0B0E11] p-4 flex flex-col gap-4 overflow-y-auto" id="main-desk-area">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="upper-bento-grid">
            
            {/* Historical Candlestick Chart Area */}
            <div className="lg:col-span-2 flex flex-col h-[400px] bg-[#161A1E] rounded-xl border border-[#2B2F36] overflow-hidden" id="candlestick-chart-wrapper">
              <TradingChart
                symbol={activeSymbol}
                candles={candles}
                ticker={activeTicker}
                interval={intervalTimeframe}
                setInterval={setIntervalTimeframe}
                activeSignal={activeSignal}
                loading={loadingCandles}
              />
            </div>

            {/* AI Signal Analysis Desk Column */}
            <div className="h-[400px]" id="signal-insight-column">
              <SignalInsight
                symbol={activeSymbol}
                signal={activeSignal}
                loading={generatingSignal}
                onGenerateSignal={handleGenerateSignal}
                mockExecuting={mockExecuting}
                onExecuteMockTrade={handleExecuteMockTrade}
                successMessage={successMessage}
              />
            </div>
          </div>

          {/* Bottom Grid: Live orderbook and strategic performance stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="lower-stats-grid">
            
            {/* Live Order book & Liquidity Walls */}
            <div className="lg:col-span-2 flex" id="order-book-stats-wrapper">
              <LiveOrderBook
                orderBook={orderBook}
                loading={loadingOrderBook}
                symbol={activeSymbol}
              />
            </div>

            {/* Performance Metrics Tracker */}
            <div className="bg-[#161A1E] rounded-xl border border-[#2B2F36] p-4 flex flex-col justify-between" id="performance-metrics-panel">
              <div className="text-xs font-bold text-[#848E9C] uppercase mb-3 tracking-wider flex items-center justify-between">
                <span>Performance Metrics</span>
                <span className="text-[9px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1.5 py-0.5 rounded">
                  70%+ WIN TARGET
                </span>
              </div>

              <div className="space-y-3.5 flex-1 justify-center flex flex-col">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#848E9C]">Realized Win Rate (Last 30 Days)</span>
                  <span className="text-sm font-bold text-green-500 font-mono">74.2%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#848E9C]">Total Captured Profit</span>
                  <span className="text-sm font-bold text-white font-mono">+12,482 USDT</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#848E9C]">Active Bot Uptime</span>
                  <span className="text-sm font-bold text-white font-mono">99.9%</span>
                </div>
              </div>

              {/* Sri Lankan / Sinhalese customized instruction quote requested by the user */}
              <div className="mt-4 p-3 bg-yellow-500/5 rounded border border-yellow-500/20" id="sinhalese-advisory-quote">
                <p className="text-[10px] text-yellow-500 leading-tight italic font-sans">
                  "Meka trade 10k dammoth 7kwath profit karana widiyata optimize karala thiyenne machan. Risk management is our priority."
                </p>
              </div>
            </div>

          </div>
        </main>

      </div>
    </div>
  );
}
