import { EMA, MACD, RSI, ATR } from "technicalindicators";
import { hyperliquid } from "./hyperliquid";

export interface MarketState {
  // Current indicators
  current_price: number;
  current_ema20: number;
  current_macd: number;
  current_rsi: number;

  // Open Interest
  open_interest: {
    latest: number;
    average: number;
  };

  // Funding Rate (critical for perpetuals)
  funding_rate: number;

  // Orderbook depth (for liquidity analysis)
  orderbook: {
    bid_liquidity_10: number; // Total $ liquidity in top 10 bids
    ask_liquidity_10: number; // Total $ liquidity in top 10 asks
    spread_bps: number; // Spread in basis points
    imbalance_ratio: number; // Bid/Ask ratio (>1 = more buy pressure)
  };

  // Intraday series (by minute)
  intraday: {
    mid_prices: number[];
    ema_20: number[];
    macd: number[];
    rsi_7: number[];
    rsi_14: number[];
  };

  // Longer-term context (4-hour timeframe)
  longer_term: {
    ema_20: number;
    ema_50: number;
    atr_3: number;
    atr_14: number;
    current_volume: number;
    average_volume: number;
    macd: number[];
    rsi_14: number[];
  };
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
function calculateEMA(values: number[], period: number): number[] {
  const emaValues = EMA.calculate({ values, period });
  return emaValues;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
function calculateMACD(
  values: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): number[] {
  const macdValues = MACD.calculate({
    values,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  return macdValues.map((v) => v.MACD || 0);
}

/**
 * Calculate RSI (Relative Strength Index)
 */
function calculateRSI(values: number[], period: number): number[] {
  const rsiValues = RSI.calculate({ values, period });
  return rsiValues;
}

/**
 * Calculate ATR (Average True Range)
 */
function calculateATR(
  high: number[],
  low: number[],
  close: number[],
  period: number
): number[] {
  const atrValues = ATR.calculate({ high, low, close, period });
  return atrValues;
}

/**
 * Fetch current market state for a given coin symbol
 * @param symbol - Trading pair symbol (e.g., 'BTC/USDT')
 * @returns Market state with all technical indicators
 */
export async function getCurrentMarketState(
  symbol: string
): Promise<MarketState> {
  try {
    // Normalize symbol format for hyperliquid perpetual contracts
    // Hyperliquid expects format like "BTC/USDC:USDC" for perpetuals
    const normalizedSymbol = symbol.includes("/")
      ? symbol
      : `${symbol}/USDC:USDC`;

    // Fetch 1-minute OHLCV data (last 100 candles for intraday analysis)
    const ohlcv1m = await hyperliquid.fetchOHLCV(
      normalizedSymbol,
      "1m",
      undefined,
      100
    );

    // Fetch 4-hour OHLCV data (last 100 candles for longer-term context)
    const ohlcv4h = await hyperliquid.fetchOHLCV(
      normalizedSymbol,
      "4h",
      undefined,
      100
    );

    // Extract price data from 1-minute candles
    const closes1m = ohlcv1m.map((candle) => Number(candle[4])); // Close prices

    // Extract price data from 4-hour candles
    const closes4h = ohlcv4h.map((candle) => Number(candle[4]));
    const highs4h = ohlcv4h.map((candle) => Number(candle[2]));
    const lows4h = ohlcv4h.map((candle) => Number(candle[3]));
    const volumes4h = ohlcv4h.map((candle) => Number(candle[5]));

    // Calculate intraday indicators (1-minute timeframe)
    const ema20_1m = calculateEMA(closes1m, 20);
    const macd_1m = calculateMACD(closes1m);
    const rsi7_1m = calculateRSI(closes1m, 7);
    const rsi14_1m = calculateRSI(closes1m, 14);

    // Calculate longer-term indicators (4-hour timeframe)
    const ema20_4h = calculateEMA(closes4h, 20);
    const ema50_4h = calculateEMA(closes4h, 50);
    const atr3_4h = calculateATR(highs4h, lows4h, closes4h, 3);
    const atr14_4h = calculateATR(highs4h, lows4h, closes4h, 14);
    const macd_4h = calculateMACD(closes4h);
    const rsi14_4h = calculateRSI(closes4h, 14);

    // Get last 10 values for intraday series
    const last10MidPrices = closes1m.slice(-10);
    const last10EMA20 = ema20_1m.slice(-10).map((v) => Number(v) || 0);
    const last10MACD = macd_1m.slice(-10).map((v) => Number(v) || 0);
    const last10RSI7 = rsi7_1m.slice(-10).map((v) => Number(v) || 0);
    const last10RSI14 = rsi14_1m.slice(-10).map((v) => Number(v) || 0);

    // Get last 10 MACD and RSI values for 4-hour timeframe
    const last10MACD4h = macd_4h.slice(-10).map((v) => Number(v) || 0);
    const last10RSI14_4h = rsi14_4h.slice(-10).map((v) => Number(v) || 0);

    // Current values (latest)
    const current_price = Number(closes1m[closes1m.length - 1]) || 0;
    const current_ema20 = Number(ema20_1m[ema20_1m.length - 1]) || 0;
    const current_macd = Number(macd_1m[macd_1m.length - 1]) || 0;
    const current_rsi = Number(rsi7_1m[rsi7_1m.length - 1]) || 0;

    // Fetch open interest and funding rate for perpetual futures
    const openInterestData = { latest: 0, average: 0 };
    let fundingRate = 0;

    try {
      // Try to fetch open interest and funding rate using the normalized symbol
      const openInterest = await hyperliquid.fetchOpenInterest(
        normalizedSymbol
      );

      if (openInterest && typeof openInterest.openInterestAmount === "number") {
        openInterestData.latest = openInterest.openInterestAmount;
        openInterestData.average = openInterest.openInterestAmount; // Using same value as average
      }

      // Try to fetch funding rate
      const fundingRates = await hyperliquid.fetchFundingRate(normalizedSymbol);
      if (fundingRates && typeof fundingRates.fundingRate === "number") {
        fundingRate = fundingRates.fundingRate;
      }
    } catch (error) {
      console.warn("Could not fetch open interest or funding rate:", error);
      // Continue with default values
    }

    // Calculate average volume for 4-hour timeframe
    const averageVolume4h =
      volumes4h.reduce((sum, vol) => sum + vol, 0) / volumes4h.length;
    const currentVolume4h = volumes4h[volumes4h.length - 1];

    // Fetch orderbook depth for liquidity analysis
    const orderbookData = {
      bid_liquidity_10: 0,
      ask_liquidity_10: 0,
      spread_bps: 0,
      imbalance_ratio: 1,
    };

    try {
      const orderbook = await hyperliquid.fetchOrderBook(normalizedSymbol, 10);

      // Calculate liquidity (sum of price * size for top 10 levels)
      const bidLiquidity = orderbook.bids
        .slice(0, 10)
        .reduce((sum, level) => {
          const price = level[0] ?? 0;
          const size = level[1] ?? 0;
          return sum + price * size;
        }, 0);
      const askLiquidity = orderbook.asks
        .slice(0, 10)
        .reduce((sum, level) => {
          const price = level[0] ?? 0;
          const size = level[1] ?? 0;
          return sum + price * size;
        }, 0);

      // Calculate spread in basis points
      const bestBid = orderbook.bids[0]?.[0] || 0;
      const bestAsk = orderbook.asks[0]?.[0] || 0;
      const spreadBps =
        bestBid > 0 ? ((bestAsk - bestBid) / bestBid) * 10000 : 0;

      // Calculate imbalance ratio (bid/ask)
      const imbalanceRatio = askLiquidity > 0 ? bidLiquidity / askLiquidity : 1;

      orderbookData.bid_liquidity_10 = bidLiquidity;
      orderbookData.ask_liquidity_10 = askLiquidity;
      orderbookData.spread_bps = spreadBps;
      orderbookData.imbalance_ratio = imbalanceRatio;
    } catch (error) {
      console.warn("Could not fetch orderbook:", error);
      // Continue with default values
    }

    return {
      current_price,
      current_ema20,
      current_macd,
      current_rsi,
      open_interest: openInterestData,
      funding_rate: fundingRate,
      orderbook: orderbookData,
      intraday: {
        mid_prices: last10MidPrices,
        ema_20: last10EMA20,
        macd: last10MACD,
        rsi_7: last10RSI7,
        rsi_14: last10RSI14,
      },
      longer_term: {
        ema_20: Number(ema20_4h[ema20_4h.length - 1]) || 0,
        ema_50: Number(ema50_4h[ema50_4h.length - 1]) || 0,
        atr_3: Number(atr3_4h[atr3_4h.length - 1]) || 0,
        atr_14: Number(atr14_4h[atr14_4h.length - 1]) || 0,
        current_volume: currentVolume4h,
        average_volume: averageVolume4h,
        macd: last10MACD4h,
        rsi_14: last10RSI14_4h,
      },
    };
  } catch (error) {
    console.error("Error fetching market state:", error);
    throw error;
  }
}

/**
 * Format market state as a human-readable string
 */
export function formatMarketState(state: MarketState): string {
  return `
    Current Market State:
    current_price = ${
        state.current_price
      }, current_ema20 = ${state.current_ema20.toFixed(
        3
      )}, current_macd = ${state.current_macd.toFixed(
        3
      )}, current_rsi (7 period) = ${state.current_rsi.toFixed(3)}

    PERPETUAL FUTURES DATA (Critical for trading decisions):

    Open Interest: Latest: ${state.open_interest.latest.toFixed(
        2
      )} BTC, Average: ${state.open_interest.average.toFixed(2)} BTC
    ${
      state.open_interest.latest > state.open_interest.average
        ? "⚠️ OI increasing - strong momentum"
        : "⚠️ OI decreasing - weakening momentum"
    }

    Funding Rate: ${state.funding_rate.toExponential(2)} (${
        state.funding_rate > 0
          ? "Longs pay shorts - bearish signal"
          : state.funding_rate < 0
          ? "Shorts pay longs - bullish signal"
          : "Neutral"
      })

    ORDERBOOK LIQUIDITY (for entry/exit timing):
    Bid Liquidity (top 10): $${state.orderbook.bid_liquidity_10.toFixed(0)}
    Ask Liquidity (top 10): $${state.orderbook.ask_liquidity_10.toFixed(0)}
    Spread: ${state.orderbook.spread_bps.toFixed(2)} bps
    Imbalance Ratio: ${state.orderbook.imbalance_ratio.toFixed(3)} ${
        state.orderbook.imbalance_ratio > 1.1
          ? "(Buy pressure)"
          : state.orderbook.imbalance_ratio < 0.9
          ? "(Sell pressure)"
          : "(Balanced)"
      }

    Intraday series (by minute, oldest → latest):

    Mid prices: [${state.intraday.mid_prices.map((v) => v.toFixed(1)).join(", ")}]

    EMA indicators (20‑period): [${state.intraday.ema_20
        .map((v) => v.toFixed(3))
        .join(", ")}]

    MACD indicators: [${state.intraday.macd.map((v) => v.toFixed(3)).join(", ")}]

    RSI indicators (7‑Period): [${state.intraday.rsi_7
        .map((v) => v.toFixed(3))
        .join(", ")}]

    RSI indicators (14‑Period): [${state.intraday.rsi_14
        .map((v) => v.toFixed(3))
        .join(", ")}]

    Longer‑term context (4‑hour timeframe):

    20‑Period EMA: ${state.longer_term.ema_20.toFixed(
        3
      )} vs. 50‑Period EMA: ${state.longer_term.ema_50.toFixed(3)}

    3‑Period ATR: ${state.longer_term.atr_3.toFixed(
        3
      )} vs. 14‑Period ATR: ${state.longer_term.atr_14.toFixed(3)}

    Current Volume: ${state.longer_term.current_volume.toFixed(
        3
      )} vs. Average Volume: ${state.longer_term.average_volume.toFixed(3)}

    MACD indicators: [${state.longer_term.macd.map((v) => v.toFixed(3)).join(", ")}]

    RSI indicators (14‑Period): [${state.longer_term.rsi_14
        .map((v) => v.toFixed(3))
        .join(", ")}]
    `.trim();
    }
