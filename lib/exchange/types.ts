// K线数据点类型
export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 报价数据类型
export interface QuoteData {
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: number;
}

// 技术指标数据类型
export interface IndicatorData {
  ema20?: number;
  macd?: number;
  rsi?: number;
  [key: string]: number | undefined;
}

// 订单结果类型
export interface OrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

// 市场数据提供者接口 - 用于统一行情数据获取
export interface MarketDataProvider {
  // 获取K线数据
  getOHLCV(symbol: string, timeframe: string, limit?: number): Promise<OHLCVData[]>;

  // 获取当前报价
  getQuote(symbol: string): Promise<QuoteData>;

  // 获取技术指标数据（可选）
  getIndicators?(symbol: string, indicators: string[]): Promise<IndicatorData>;
}

// 交易经纪商接口 - 用于统一交易操作
export interface TradingBroker {
  // 下单
  placeOrder(params: {
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    amount?: number;
    cost?: number;
    price?: number;
    leverage?: number;
    stopLoss?: number;
    takeProfit?: number;
    reduceOnly?: boolean;
  }): Promise<OrderResult>;

  // 查询持仓
  getPositions(symbols?: string[]): Promise<Array<{
    symbol: string;
    side: 'long' | 'short';
    amount: number;
    entryPrice: number;
    markPrice: number;
    pnl: number;
    leverage: number;
  }>>;

  // 查询账户信息
  getAccountInfo(): Promise<{
    balance: number;
    usedMargin: number;
    availableMargin: number;
    totalPnL: number;
    totalMargin: number;
  }>;

  // 设置杠杆
  setLeverage(symbol: string, leverage: number): Promise<void>;

  // 设置保证金模式
  setMarginMode(symbol: string, mode: 'isolated' | 'cross'): Promise<void>;
}

// 交易所适配器工厂
export interface ExchangeAdapter {
  createMarketDataProvider(config: Record<string, unknown>): MarketDataProvider;
  createTradingBroker(config: Record<string, unknown>): TradingBroker;
}

// 币种符号标准化
export function normalizeSymbol(symbol: string): string {
  // 移除斜杠并转换为大写
  return symbol.replace('/', '').toUpperCase();
}

// 时间帧标准化
export function normalizeTimeframe(timeframe: string): string {
  const timeframeMap: Record<string, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '1h': '1h',
    '4h': '4h',
    '1d': '1d',
  };
  return timeframeMap[timeframe.toLowerCase()] || timeframe;
}

// 交易所适配器工厂
export interface ExchangeAdapter {
  createMarketDataProvider(config: Record<string, unknown>): MarketDataProvider;
  createTradingBroker(config: Record<string, unknown>): TradingBroker;
}
