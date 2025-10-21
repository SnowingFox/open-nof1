// Binance 行情数据提供者实现
import { MarketDataProvider, OHLCVData, QuoteData, IndicatorData } from '../exchange/types';
import { binance } from '../trading/binance';
import { getRiskConfig } from '../risk/config';

export class BinanceMarketDataProvider implements MarketDataProvider {
  async getOHLCV(symbol: string, timeframe: string, limit = 100): Promise<OHLCVData[]> {
    const normalizedSymbol = symbol.includes('/') ? symbol : `${symbol}/USDT`;

    // 根据模式选择网络
    const { binance: BinanceExchange } = await import('ccxt');
    const riskConfig = getRiskConfig();
    const exchange = riskConfig.mode === 'paper' ?
      new BinanceExchange({
        apiKey: process.env.BINANCE_API_KEY,
        secret: process.env.BINANCE_API_SECRET,
        options: { 'defaultType': 'future' },
        sandbox: true, // 使用沙盒环境
      }) :
      binance;

    const ohlcvData = await exchange.fetchOHLCV(normalizedSymbol, timeframe, undefined, limit);

    // Convert CCXT OHLCV format [timestamp, open, high, low, close, volume] to OHLCVData
    return ohlcvData.map((candle: any[]) => ({
      timestamp: candle[0],
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5],
    }));
  }

  async getQuote(symbol: string): Promise<QuoteData> {
    const normalizedSymbol = symbol.includes('/') ? symbol : `${symbol}/USDT`;

    // 根据模式选择网络
    const { binance: BinanceExchange } = await import('ccxt');
    const riskConfig = getRiskConfig();
    const exchange = riskConfig.mode === 'paper' ?
      new BinanceExchange({
        apiKey: process.env.BINANCE_API_KEY,
        secret: process.env.BINANCE_API_SECRET,
        options: { 'defaultType': 'future' },
        sandbox: true,
      }) :
      binance;

    const ticker: any = await exchange.fetchTicker(normalizedSymbol);

    return {
      bid: Number(ticker.bid) || 0,
      ask: Number(ticker.ask) || 0,
      last: Number(ticker.last) || 0,
      volume: Number(ticker.quoteVolume || ticker.baseVolume) || 0,
      timestamp: ticker.timestamp || Date.now(),
    };
  }

  async getIndicators?(symbol: string, indicators: string[]): Promise<IndicatorData> {
    // 暂时复用现有的 getCurrentMarketState 函数
    const { getCurrentMarketState } = await import('../trading/market-data');
    const marketState = await getCurrentMarketState(symbol);

    const result: IndicatorData = {};

    if (indicators.includes('ema20')) result.ema20 = marketState.current_ema20;
    if (indicators.includes('macd')) result.macd = marketState.current_macd;
    if (indicators.includes('rsi')) result.rsi = marketState.current_rsi;

    return result;
  }
}

// 工厂函数
export function createBinanceMarketDataProvider(): MarketDataProvider {
  return new BinanceMarketDataProvider();
}
