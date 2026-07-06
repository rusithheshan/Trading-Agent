import React, { useState, useRef, useMemo } from 'react';
import { CandleData, TradingSignal, TickerInfo } from '../types';
import { Maximize2, Layers, AlertCircle, TrendingUp, Compass } from 'lucide-react';

interface TradingChartProps {
  symbol: string;
  candles: CandleData[];
  ticker: TickerInfo | undefined;
  interval: string;
  setInterval: (interval: string) => void;
  activeSignal: TradingSignal | null;
  loading: boolean;
}

export default function TradingChart({
  symbol,
  candles,
  ticker,
  interval,
  setInterval,
  activeSignal,
  loading,
}: TradingChartProps) {
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);
  const [showAIOverlays, setShowAIOverlays] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const intervals = ['1m', '5m', '15m', '1h', '4h', '1d'];

  // Calculate scales and bounds for the SVG
  const chartBounds = useMemo(() => {
    if (candles.length === 0) return { minPrice: 0, maxPrice: 0, priceRange: 0 };
    
    let min = Infinity;
    let max = -Infinity;
    
    candles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    });

    // If an active AI signal exists, expand bounds to make sure entry, TP, and SL lines fit nicely on the chart!
    if (activeSignal && showAIOverlays) {
      const levels = [
        activeSignal.stopLoss,
        activeSignal.takeProfit1,
        activeSignal.takeProfit2,
        activeSignal.takeProfit3,
        activeSignal.entryRange.min,
        activeSignal.entryRange.max,
      ];
      levels.forEach((lvl) => {
        if (lvl < min) min = lvl * 0.998;
        if (lvl > max) max = lvl * 1.002;
      });
    }

    // Add small buffer
    const pad = (max - min) * 0.05 || 1;
    return {
      minPrice: min - pad,
      maxPrice: max + pad,
      priceRange: (max + pad) - (min - pad),
    };
  }, [candles, activeSignal, showAIOverlays]);

  // Dimension details
  const svgWidth = 800;
  const svgHeight = 360;
  const chartPaddingLeft = 10;
  const chartPaddingRight = 80;
  const chartPaddingTop = 20;
  const chartPaddingBottom = 30;

  const innerWidth = svgWidth - chartPaddingLeft - chartPaddingRight;
  const innerHeight = svgHeight - chartPaddingTop - chartPaddingBottom;

  // Coordinate conversion helpers
  const getX = (index: number) => {
    if (candles.length === 0) return 0;
    return chartPaddingLeft + (index / (candles.length - 1)) * innerWidth;
  };

  const getY = (price: number) => {
    const { minPrice, priceRange } = chartBounds;
    if (priceRange === 0) return 0;
    // Note SVG 0 is top, so we subtract from height
    return chartPaddingTop + innerHeight - ((price - minPrice) / priceRange) * innerHeight;
  };

  // Grid price levels to render
  const gridPriceLevels = useMemo(() => {
    const { minPrice, maxPrice, priceRange } = chartBounds;
    if (priceRange === 0) return [];
    
    const count = 5;
    const levels = [];
    for (let i = 0; i <= count; i++) {
      levels.push(minPrice + (priceRange * i) / count);
    }
    return levels;
  }, [chartBounds]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (candles.length === 0 || !containerRef.current) return;

    // Find bounding box to calculate relative X
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const fraction = (relativeX - (chartPaddingLeft / svgWidth) * rect.width) / ((innerWidth / svgWidth) * rect.width);
    
    let index = Math.round(fraction * (candles.length - 1));
    if (index < 0) index = 0;
    if (index >= candles.length) index = candles.length - 1;

    setHoveredCandle(candles[index]);
  };

  const handleMouseLeave = () => {
    setHoveredCandle(null);
  };

  const getPriceColor = (change: number) => {
    return change >= 0 ? 'text-emerald-400' : 'text-rose-400';
  };

  const formattedPrice = (price: number | undefined) => {
    if (price === undefined) return '--';
    return price >= 100 
      ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : price >= 1
      ? price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })
      : price.toFixed(6);
  };

  const displayedCandle = hoveredCandle || candles[candles.length - 1];

  return (
    <div className="flex flex-col bg-slate-950 border-b border-slate-800 p-4 font-sans text-slate-100 flex-1 min-h-0" ref={containerRef} id="trading-chart-viewport">
      {/* Ticker Header Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4" id="chart-header">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-lg flex items-center justify-center">
            <Compass className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white tracking-wide" id="chart-title">{symbol}</span>
              <span className="text-[10px] bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded font-mono uppercase">
                SPOT
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-sm font-mono font-bold ${getPriceColor(ticker?.priceChangePercent || 0)}`} id="current-ticker-price">
                ${formattedPrice(ticker?.price)}
              </span>
              <span className={`text-xs font-mono font-semibold ${getPriceColor(ticker?.priceChangePercent || 0)}`}>
                {ticker?.priceChangePercent && ticker.priceChangePercent >= 0 ? '+' : ''}
                {ticker?.priceChangePercent?.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Timeframe Selectors */}
        <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 p-1 rounded-lg" id="timeframe-selectors">
          {intervals.map((int) => (
            <button
              key={int}
              onClick={() => setInterval(int)}
              className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                interval === int
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold shadow-sm shadow-cyan-500/5'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
              id={`interval-btn-${int}`}
            >
              {int}
            </button>
          ))}
        </div>

        {/* Signal Overlay Toggle */}
        {activeSignal && (
          <button
            onClick={() => setShowAIOverlays(!showAIOverlays)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
              showAIOverlays 
                ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800/40' 
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            id="toggle-overlays-btn"
          >
            <Layers className="w-3.5 h-3.5" />
            AI Overlays: {showAIOverlays ? 'ON' : 'OFF'}
          </button>
        )}
      </div>

      {/* Candlestick Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-slate-900/30 border border-slate-900 rounded-lg p-2.5 mb-3 text-[10px] font-mono text-slate-400" id="candlestick-info-bar">
        <div>
          <span>TIME:</span>{' '}
          <span className="text-white">
            {displayedCandle ? new Date(displayedCandle.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--'}
          </span>
        </div>
        <div>
          <span>OPEN:</span>{' '}
          <span className="text-emerald-400">{formattedPrice(displayedCandle?.open)}</span>
        </div>
        <div>
          <span>HIGH:</span>{' '}
          <span className="text-emerald-300">{formattedPrice(displayedCandle?.high)}</span>
        </div>
        <div>
          <span>LOW:</span>{' '}
          <span className="text-rose-300">{formattedPrice(displayedCandle?.low)}</span>
        </div>
        <div>
          <span>CLOSE:</span>{' '}
          <span className="text-rose-400">{formattedPrice(displayedCandle?.close)}</span>
        </div>
        <div>
          <span>VOLUME:</span>{' '}
          <span className="text-slate-200">
            {displayedCandle?.volume ? displayedCandle.volume.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '--'}
          </span>
        </div>
      </div>

      {/* Main SVG Chart Container */}
      <div className="flex-1 min-h-[280px] relative bg-slate-950/60 rounded-xl border border-slate-900/80 overflow-hidden" id="chart-svg-container">
        {loading && (
          <div className="absolute inset-0 bg-slate-950/75 flex flex-col items-center justify-center gap-3 z-10">
            <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-cyan-400 animate-spin"></div>
            <span className="text-xs font-mono text-slate-400">Loading candles for {symbol}...</span>
          </div>
        )}

        {candles.length === 0 && !loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <AlertCircle className="w-8 h-8 text-slate-600" />
            <span className="text-xs text-slate-400">No trading historical kline data found.</span>
          </div>
        ) : (
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="cursor-crosshair overflow-visible"
            id="trading-candles-svg"
          >
            {/* Background horizontal Grid Lines */}
            {gridPriceLevels.map((price, idx) => (
              <g key={`grid-${idx}`}>
                <line
                  x1={chartPaddingLeft}
                  y1={getY(price)}
                  x2={svgWidth - chartPaddingRight}
                  y2={getY(price)}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={svgWidth - chartPaddingRight + 6}
                  y={getY(price) + 3}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="start"
                >
                  {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </text>
              </g>
            ))}

            {/* AI Signal Horizontal Indicators */}
            {activeSignal && showAIOverlays && (
              <g id="ai-levels-overlay-group">
                {/* Take Profit 3 */}
                <line
                  x1={chartPaddingLeft}
                  y1={getY(activeSignal.takeProfit3)}
                  x2={svgWidth - chartPaddingRight}
                  y2={getY(activeSignal.takeProfit3)}
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="1 1"
                  opacity="0.8"
                />
                <rect
                  x={svgWidth - chartPaddingRight + 6}
                  y={getY(activeSignal.takeProfit3) - 8}
                  width="70"
                  height="16"
                  fill="#064e3b"
                  rx="3"
                />
                <text
                  x={svgWidth - chartPaddingRight + 12}
                  y={getY(activeSignal.takeProfit3) + 4}
                  fill="#34d399"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  TP3: {activeSignal.takeProfit3.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </text>

                {/* Take Profit 2 */}
                <line
                  x1={chartPaddingLeft}
                  y1={getY(activeSignal.takeProfit2)}
                  x2={svgWidth - chartPaddingRight}
                  y2={getY(activeSignal.takeProfit2)}
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="1 1"
                  opacity="0.9"
                />
                <rect
                  x={svgWidth - chartPaddingRight + 6}
                  y={getY(activeSignal.takeProfit2) - 8}
                  width="70"
                  height="16"
                  fill="#064e3b"
                  rx="3"
                />
                <text
                  x={svgWidth - chartPaddingRight + 12}
                  y={getY(activeSignal.takeProfit2) + 4}
                  fill="#34d399"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  TP2: {activeSignal.takeProfit2.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </text>

                {/* Take Profit 1 */}
                <line
                  x1={chartPaddingLeft}
                  y1={getY(activeSignal.takeProfit1)}
                  x2={svgWidth - chartPaddingRight}
                  y2={getY(activeSignal.takeProfit1)}
                  stroke="#34d399"
                  strokeWidth="2"
                  opacity="0.95"
                />
                <rect
                  x={svgWidth - chartPaddingRight + 6}
                  y={getY(activeSignal.takeProfit1) - 8}
                  width="70"
                  height="16"
                  fill="#065f46"
                  rx="3"
                />
                <text
                  x={svgWidth - chartPaddingRight + 12}
                  y={getY(activeSignal.takeProfit1) + 4}
                  fill="#a7f3d0"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  TP1: {activeSignal.takeProfit1.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </text>

                {/* Entry Price Zone Band */}
                <rect
                  x={chartPaddingLeft}
                  y={getY(activeSignal.entryRange.max)}
                  width={innerWidth}
                  height={Math.max(2, getY(activeSignal.entryRange.min) - getY(activeSignal.entryRange.max))}
                  fill="url(#entry-zone-gradient)"
                  opacity="0.18"
                />
                <line
                  x1={chartPaddingLeft}
                  y1={getY((activeSignal.entryRange.min + activeSignal.entryRange.max) / 2)}
                  x2={svgWidth - chartPaddingRight}
                  y2={getY((activeSignal.entryRange.min + activeSignal.entryRange.max) / 2)}
                  stroke="#06b6d4"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                <rect
                  x={svgWidth - chartPaddingRight + 6}
                  y={getY((activeSignal.entryRange.min + activeSignal.entryRange.max) / 2) - 8}
                  width="70"
                  height="16"
                  fill="#083344"
                  rx="3"
                />
                <text
                  x={svgWidth - chartPaddingRight + 12}
                  y={getY((activeSignal.entryRange.min + activeSignal.entryRange.max) / 2) + 4}
                  fill="#67e8f9"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  ENTRY: {((activeSignal.entryRange.min + activeSignal.entryRange.max) / 2).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </text>

                {/* Stop Loss Line */}
                <line
                  x1={chartPaddingLeft}
                  y1={getY(activeSignal.stopLoss)}
                  x2={svgWidth - chartPaddingRight}
                  y2={getY(activeSignal.stopLoss)}
                  stroke="#ef4444"
                  strokeWidth="2.5"
                />
                <rect
                  x={svgWidth - chartPaddingRight + 6}
                  y={getY(activeSignal.stopLoss) - 8}
                  width="70"
                  height="16"
                  fill="#7f1d1d"
                  rx="3"
                />
                <text
                  x={svgWidth - chartPaddingRight + 12}
                  y={getY(activeSignal.stopLoss) + 4}
                  fill="#fecaca"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  SL: {activeSignal.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </text>
              </g>
            )}

            {/* Candle wicks & bodies */}
            {candles.map((candle, idx) => {
              const x = getX(idx);
              const candleWidth = Math.max(2, (innerWidth / candles.length) * 0.72);
              
              const isUp = candle.close >= candle.open;
              const color = isUp ? '#10b981' : '#f43f5e';
              
              const yHigh = getY(candle.high);
              const yLow = getY(candle.low);
              const yOpen = getY(candle.open);
              const yClose = getY(candle.close);
              
              const rectY = Math.min(yOpen, yClose);
              const rectHeight = Math.max(1, Math.abs(yOpen - yClose));
              
              return (
                <g key={`candle-${idx}`} className="transition-all hover:opacity-80">
                  {/* Wick */}
                  <line
                    x1={x}
                    y1={yHigh}
                    x2={x}
                    y2={yLow}
                    stroke={color}
                    strokeWidth="1.2"
                  />
                  {/* Body */}
                  <rect
                    x={x - candleWidth / 2}
                    y={rectY}
                    width={candleWidth}
                    height={rectHeight}
                    fill={color}
                    stroke={color}
                    strokeWidth="0.5"
                  />
                </g>
              );
            })}

            {/* SVG Definitions for Gradients */}
            <defs>
              <linearGradient id="entry-zone-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0891b2" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
              </linearGradient>
            </defs>
          </svg>
        )}
      </div>

      {/* RRR Educational Callout */}
      {activeSignal && (
        <div className="mt-4 p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between" id="rrr-callout">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400"></span>
            <div>
              <p className="text-xs text-white font-semibold">Active Risk-to-Reward Execution</p>
              <p className="text-[10px] text-slate-400 font-mono">
                TP Targets are strategically set wide to guarantee a high mathematical ratio.
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 font-mono block">Ratio:</span>
            <span className="text-sm font-bold font-mono text-emerald-400">
              1:{activeSignal.riskRewardRatio.toFixed(1)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
