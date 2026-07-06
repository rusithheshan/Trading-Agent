import React from 'react';
import { OrderBook } from '../types';
import { Layers, HelpCircle, Flame } from 'lucide-react';

interface LiveOrderBookProps {
  orderBook: OrderBook | null;
  loading: boolean;
  symbol: string;
}

export default function LiveOrderBook({ orderBook, loading, symbol }: LiveOrderBookProps) {
  const formattedPrice = (price: number) => {
    return price >= 100
      ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : price >= 1
      ? price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })
      : price.toFixed(6);
  };

  const getPercentageWidth = (amount: number, maxAmount: number) => {
    if (maxAmount === 0) return '0%';
    const pct = (amount / maxAmount) * 100;
    return `${Math.min(100, Math.max(2, pct))}%`;
  };

  const maxBidAmount = orderBook ? Math.max(...orderBook.bids.map((b) => b.amount)) : 0;
  const maxAskAmount = orderBook ? Math.max(...orderBook.asks.map((a) => a.amount)) : 0;

  return (
    <div className="flex-1 bg-[#161A1E] rounded-xl border border-[#2B2F36] p-4 flex flex-col min-h-[220px]" id="live-order-book">
      {/* Title */}
      <div className="text-xs font-bold text-[#848E9C] uppercase mb-3 flex items-center justify-between" id="order-book-title-header">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
          Order Book & Gaps
        </span>
        <span className="text-[10px] font-mono text-slate-500 lowercase">
          {symbol.replace('USDT', '')}/USDT
        </span>
      </div>

      {loading && !orderBook ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8">
          <div className="w-5 h-5 border-2 border-slate-700 border-t-yellow-500 rounded-full animate-spin"></div>
          <span className="text-[10px] text-slate-500 font-mono">Syncing bids & asks...</span>
        </div>
      ) : !orderBook ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-xs font-mono">
          No live depth data synchronized.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden" id="order-book-grid">
          {/* Bids Column (Green) */}
          <div className="flex flex-col h-full overflow-hidden" id="bids-section">
            <div className="flex justify-between text-[10px] text-[#848E9C] font-semibold mb-2 px-1">
              <span>Bid Price ($)</span>
              <span>Size ({symbol.replace('USDT', '')})</span>
            </div>
            
            <div className="space-y-1 font-mono text-xs overflow-y-auto max-h-[160px] custom-scrollbar pr-1">
              {orderBook.bids.slice(0, 8).map((bid, idx) => {
                const isWall = bid.amount > maxBidAmount * 0.6;
                return (
                  <div
                    key={`bid-${idx}`}
                    className={`relative flex justify-between items-center py-1 px-1.5 rounded transition-all hover:bg-slate-800/20 ${
                      isWall ? 'border-r-2 border-emerald-500/80 bg-emerald-950/10' : ''
                    }`}
                  >
                    {/* Visual bar graph representation */}
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-emerald-500/5 transition-all duration-300 pointer-events-none"
                      style={{ width: getPercentageWidth(bid.amount, maxBidAmount) }}
                    />
                    
                    <span className={`font-semibold z-10 flex items-center gap-1 ${isWall ? 'text-emerald-300' : 'text-emerald-400'}`}>
                      {formattedPrice(bid.price)}
                      {isWall && (
                        <span className="text-[8px] bg-emerald-900/60 text-emerald-300 px-1 rounded uppercase tracking-tighter shrink-0 font-bold scale-90">
                          WALL
                        </span>
                      )}
                    </span>
                    
                    <span className="text-[#EAECEF] font-medium z-10 text-right">
                      {bid.amount >= 100
                        ? bid.amount.toFixed(1)
                        : bid.amount >= 1
                        ? bid.amount.toFixed(3)
                        : bid.amount.toFixed(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Asks Column (Red) */}
          <div className="flex flex-col h-full overflow-hidden" id="asks-section">
            <div className="flex justify-between text-[10px] text-[#848E9C] font-semibold mb-2 px-1">
              <span>Ask Price ($)</span>
              <span>Size ({symbol.replace('USDT', '')})</span>
            </div>

            <div className="space-y-1 font-mono text-xs overflow-y-auto max-h-[160px] custom-scrollbar pr-1">
              {orderBook.asks.slice(0, 8).map((ask, idx) => {
                const isWall = ask.amount > maxAskAmount * 0.6;
                return (
                  <div
                    key={`ask-${idx}`}
                    className={`relative flex justify-between items-center py-1 px-1.5 rounded transition-all hover:bg-slate-800/20 ${
                      isWall ? 'border-r-2 border-rose-500/80 bg-rose-950/10' : ''
                    }`}
                  >
                    {/* Visual bar graph representation */}
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-rose-500/5 transition-all duration-300 pointer-events-none"
                      style={{ width: getPercentageWidth(ask.amount, maxAskAmount) }}
                    />

                    <span className={`font-semibold z-10 flex items-center gap-1 ${isWall ? 'text-rose-300' : 'text-rose-400'}`}>
                      {formattedPrice(ask.price)}
                      {isWall && (
                        <span className="text-[8px] bg-rose-900/60 text-rose-300 px-1 rounded uppercase tracking-tighter shrink-0 font-bold scale-90">
                          WALL
                        </span>
                      )}
                    </span>

                    <span className="text-[#EAECEF] font-medium z-10 text-right">
                      {ask.amount >= 100
                        ? ask.amount.toFixed(1)
                        : ask.amount >= 1
                        ? ask.amount.toFixed(3)
                        : ask.amount.toFixed(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Skew Information */}
      {orderBook && (
        <div className="mt-3 pt-2.5 border-t border-[#2B2F36] flex items-center justify-between text-[10px] font-mono text-[#848E9C]" id="skew-stat">
          <div className="flex items-center gap-2">
            <span>Flow Ratio (Bids/Asks):</span>
            <span className={`font-bold ${orderBook.skew >= 1.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {orderBook.skew.toFixed(2)}x
            </span>
          </div>
          <div>
            <span>Spread:</span>{' '}
            <span className="text-white font-bold">
              {orderBook.asks.length && orderBook.bids.length 
                ? (orderBook.asks[0].price - orderBook.bids[0].price).toLocaleString(undefined, { maximumFractionDigits: 4 }) 
                : '--'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
