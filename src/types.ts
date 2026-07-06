export interface TickerInfo {
  symbol: string;
  price: number;
  priceChangePercent: number;
  highPrice?: number;
  lowPrice?: number;
  volume?: number;
}

export interface CandleData {
  time: number; // timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookItem {
  price: number;
  amount: number;
  total: number; // cumulative total
  isWall: boolean; // Is this a large liquidity wall?
}

export interface OrderBook {
  bids: OrderBookItem[];
  asks: OrderBookItem[];
  bidVolume: number;
  askVolume: number;
  skew: number; // bid/ask volume ratio
}

export type SignalDirection = 'BUY' | 'SELL' | 'HOLD';

export interface TradingSignal {
  symbol: string;
  direction: SignalDirection;
  confidence: number; // e.g., 85 for 85%
  entryRange: {
    min: number;
    max: number;
  };
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskRewardRatio: number; // e.g., 2.5
  analysisText: string;
  indicators: {
    rsi: number;
    macd: string;
    trend: string;
  };
  liquidityZones: {
    price: number;
    type: 'SUPPORT_WALL' | 'RESISTANCE_WALL';
    volume: number;
    strength: 'STRONG' | 'MODERATE';
  }[];
  timestamp: number;
}
