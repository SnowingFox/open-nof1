import { binance } from "./binance";

export interface SellOptions {
  symbol: string; // 交易对，如 'BTC/USDT' 或 'BTC'
  amount?: number; // 卖出数量（币的数量）
  cost?: number; // 卖出金额（USDT 数量，用于开空仓）
  leverage?: number; // 杠杆倍数 (1-20)
  orderType?: "market" | "limit"; // 订单类型：市价单或限价单
  price?: number; // 限价单价格（仅限价单需要）
  stopLoss?: number; // 止损价格（可选）
  takeProfit?: number; // 止盈价格（可选）
  reduceOnly?: boolean; // 只减仓（用于平仓）
  positionSide?: "LONG" | "SHORT" | "BOTH"; // 仓位方向
  closePosition?: boolean; // 是否平仓（平掉现有多头仓位）
}

export interface SellResult {
  success: boolean;
  orderId?: string | number;
  symbol: string;
  side: string;
  type: string;
  amount: number;
  price?: number;
  cost?: number;
  leverage?: number;
  stopLossOrderId?: string | number;
  takeProfitOrderId?: string | number;
  timestamp: number;
  info?: any;
  error?: string;
}

/**
 * Validate leverage (must be between 1 and 20)
 */
function validateLeverage(leverage: number): number {
  if (leverage < 1) {
    console.warn(`Leverage ${leverage} is too low. Setting to 1x.`);
    return 1;
  }
  if (leverage > 20) {
    console.warn(
      `Leverage ${leverage} exceeds maximum of 20x. Setting to 20x.`
    );
    return 20;
  }
  return Math.floor(leverage);
}

/**
 * Normalize symbol format
 */
function normalizeSymbol(symbol: string): string {
  return symbol.includes("/") ? symbol : `${symbol}/USDT`;
}

/**
 * Set leverage for a trading pair
 */
async function setLeverage(symbol: string, leverage: number): Promise<void> {
  try {
    await binance.setLeverage(leverage, symbol);
    console.log(`✓ Leverage set to ${leverage}x for ${symbol}`);
  } catch (error: any) {
    console.warn(`Warning setting leverage for ${symbol}:`, error.message);
  }
}

/**
 * Set margin mode (CROSSED or ISOLATED)
 */
async function setMarginMode(
  symbol: string,
  marginMode: "cross" | "isolated" = "cross"
): Promise<void> {
  try {
    await binance.setMarginMode(marginMode, symbol);
    console.log(`✓ Margin mode set to ${marginMode} for ${symbol}`);
  } catch (error: any) {
    console.warn(`Warning setting margin mode for ${symbol}:`, error.message);
  }
}

/**
 * Get current position for a symbol
 */
async function getCurrentPosition(symbol: string): Promise<number> {
  try {
    const positions = await binance.fetchPositions([symbol]);
    const position = positions.find((p) => p.symbol === symbol);

    if (position && position.contracts) {
      return Number(position.contracts);
    }

    return 0;
  } catch (error: any) {
    console.warn(`Warning fetching position for ${symbol}:`, error.message);
    return 0;
  }
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Place a stop loss order with retry
 */
async function placeStopLoss(
  symbol: string,
  amount: number,
  stopPrice: number,
  side: "buy" | "sell",
  maxRetries: number = 3
): Promise<string | number | undefined> {
  // Stop loss is opposite direction to entry
  const stopSide = side === "sell" ? "buy" : "sell";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const order = await binance.createOrder(
        symbol,
        "STOP_MARKET",
        stopSide,
        amount,
        undefined,
        {
          stopPrice: stopPrice,
          reduceOnly: true,
        }
      );

      console.log(`✓ Stop loss order placed at $${stopPrice}`);
      return order.id;
    } catch (error: any) {
      console.error(`⚠️ Stop loss attempt ${attempt}/${maxRetries} failed:`, error.message);

      if (attempt < maxRetries) {
        const delayMs = attempt * 1000; // Exponential backoff: 1s, 2s, 3s
        console.log(`⏳ Retrying in ${delayMs}ms...`);
        await sleep(delayMs);
      } else {
        console.error(`❌ Stop loss placement failed after ${maxRetries} attempts`);
        return undefined;
      }
    }
  }

  return undefined;
}

/**
 * Place a take profit order with retry
 */
async function placeTakeProfit(
  symbol: string,
  amount: number,
  profitPrice: number,
  side: "buy" | "sell",
  maxRetries: number = 3
): Promise<string | number | undefined> {
  // Take profit is opposite direction to entry
  const profitSide = side === "sell" ? "buy" : "sell";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const order = await binance.createOrder(
        symbol,
        "TAKE_PROFIT_MARKET",
        profitSide,
        amount,
        undefined,
        {
          stopPrice: profitPrice,
          reduceOnly: true,
        }
      );

      console.log(`✓ Take profit order placed at $${profitPrice}`);
      return order.id;
    } catch (error: any) {
      console.error(`⚠️ Take profit attempt ${attempt}/${maxRetries} failed:`, error.message);

      if (attempt < maxRetries) {
        const delayMs = attempt * 1000; // Exponential backoff: 1s, 2s, 3s
        console.log(`⏳ Retrying in ${delayMs}ms...`);
        await sleep(delayMs);
      } else {
        console.error(`❌ Take profit placement failed after ${maxRetries} attempts`);
        return undefined;
      }
    }
  }

  return undefined;
}

/**
 * Emergency close a position
 */
async function emergencyClosePosition(
  symbol: string,
  amount: number,
  side: "buy" | "sell"
): Promise<boolean> {
  try {
    console.log(`\n⚠️ EMERGENCY: Closing position for ${symbol}...`);

    // Close is opposite direction to entry
    const closeSide = side === "sell" ? "buy" : "sell";

    const order = await binance.createOrder(
      symbol,
      "market",
      closeSide,
      amount,
      undefined,
      {
        reduceOnly: true,
      }
    );

    console.log(`✅ Emergency close successful! Order ID: ${order.id}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Emergency close failed:`, error.message);
    return false;
  }
}

/**
 * Sell (Short or Close Long) a futures contract
 *
 * @param options - Sell options including symbol, amount/cost, leverage, etc.
 * @returns Sell result with order details
 *
 * @example
 * // Open a short position
 * const result = await sell({
 *   symbol: 'BTC/USDT',
 *   cost: 1000,        // Use $1000 USDT
 *   leverage: 10,      // 10x leverage
 *   stopLoss: 115000,  // Stop loss at $115,000 (above entry for shorts)
 *   takeProfit: 105000 // Take profit at $105,000 (below entry for shorts)
 * });
 *
 * @example
 * // Close an existing long position
 * const result = await sell({
 *   symbol: 'BTC/USDT',
 *   closePosition: true // Close entire position
 * });
 *
 * @example
 * // Sell ETH with limit order (short)
 * const result = await sell({
 *   symbol: 'ETH/USDT',
 *   amount: 5,         // Sell 5 ETH
 *   leverage: 15,      // 15x leverage
 *   orderType: 'limit',
 *   price: 3900        // Limit price at $3900
 * });
 */
export async function sell(options: SellOptions): Promise<SellResult> {
  const startTime = Date.now();

  try {
    // Normalize and validate inputs
    const symbol = normalizeSymbol(options.symbol);
    const orderType = options.orderType || "market";

    console.log(`\n${"=".repeat(60)}`);
    console.log(`🔴 SELLING ${symbol}`);
    console.log(`${"=".repeat(60)}`);

    // Determine order amount
    let orderAmount: number;
    let leverage: number = 1;
    let reduceOnly: boolean = options.reduceOnly || false;

    if (options.closePosition) {
      // Close existing position
      console.log(`Fetching current position...`);
      const currentPosition = await getCurrentPosition(symbol);

      if (currentPosition === 0) {
        throw new Error(`No open position found for ${symbol}`);
      }

      if (currentPosition < 0) {
        throw new Error(
          `Cannot close short position with sell. Current position: ${currentPosition}`
        );
      }

      orderAmount = Math.abs(currentPosition);
      reduceOnly = true;

      console.log(`Current position: ${currentPosition}`);
      console.log(`Closing position with ${orderAmount} contracts`);
    } else if (options.amount) {
      // Amount specified directly
      orderAmount = options.amount;
      leverage = validateLeverage(options.leverage || 1);
    } else if (options.cost) {
      // Calculate amount from cost (for opening short position)
      leverage = validateLeverage(options.leverage || 1);

      const ticker = await binance.fetchTicker(symbol);
      const currentPrice = Number(ticker.last);

      // With leverage, we can control more with less capital
      orderAmount = (options.cost * leverage) / currentPrice;

      console.log(`Current price: $${currentPrice.toFixed(2)}`);
      console.log(`Margin: $${options.cost.toFixed(2)}`);
      console.log(`Notional value: $${(options.cost * leverage).toFixed(2)}`);
      console.log(
        `Order amount: ${orderAmount.toFixed(6)} ${symbol.split("/")[0]}`
      );
    } else {
      throw new Error(
        "Either 'amount', 'cost', or 'closePosition' must be specified"
      );
    }

    // Set leverage and margin mode for futures (skip if just closing)
    if (!options.closePosition && leverage > 1) {
      await setLeverage(symbol, leverage);
      await setMarginMode(symbol, "cross");
    }

    // Prepare order parameters
    const params: any = {};

    if (options.positionSide) {
      params.positionSide = options.positionSide;
    }

    if (reduceOnly) {
      params.reduceOnly = true;
    }

    // Place the main order
    let order: any;

    if (orderType === "limit") {
      if (!options.price) {
        throw new Error("Price must be specified for limit orders");
      }

      console.log(`\nPlacing LIMIT SELL order at $${options.price}...`);
      order = await binance.createOrder(
        symbol,
        "limit",
        "sell",
        orderAmount,
        options.price,
        params
      );
    } else {
      console.log(`\nPlacing MARKET SELL order...`);
      order = await binance.createOrder(
        symbol,
        "market",
        "sell",
        orderAmount,
        undefined,
        params
      );
    }

    console.log(`✓ Order placed successfully! Order ID: ${order.id}`);

    // Place stop loss and take profit orders if specified (only for new positions)
    let stopLossOrderId: string | number | undefined;
    let takeProfitOrderId: string | number | undefined;
    let protectionFailed = false;

    if (!options.closePosition && (options.stopLoss || options.takeProfit)) {
      console.log(`\n🛡️ Setting protection orders...`);

      if (options.stopLoss) {
        console.log(`Setting stop loss at $${options.stopLoss}...`);
        stopLossOrderId = await placeStopLoss(
          symbol,
          orderAmount,
          options.stopLoss,
          "sell",
          3  // Max 3 retries
        );

        if (!stopLossOrderId) {
          protectionFailed = true;
          console.error(`❌ CRITICAL: Stop loss protection failed for ${symbol}`);
        }
      }

      if (options.takeProfit && !protectionFailed) {
        console.log(`Setting take profit at $${options.takeProfit}...`);
        takeProfitOrderId = await placeTakeProfit(
          symbol,
          orderAmount,
          options.takeProfit,
          "sell",
          3  // Max 3 retries
        );

        if (!takeProfitOrderId) {
          console.warn(`⚠️ Warning: Take profit placement failed (not critical)`);
          // Take profit failure is not critical, we still have stop loss
        }
      }

      // If stop loss failed, immediately close the position
      if (protectionFailed) {
        console.error(`\n❌ CRITICAL: Protection orders failed. Initiating emergency close...`);

        const closeSuccess = await emergencyClosePosition(
          symbol,
          orderAmount,
          "sell"
        );

        if (closeSuccess) {
          throw new Error(
            `Position opened but protection orders failed. Position was closed immediately for safety. ` +
            `Please check market conditions and try again.`
          );
        } else {
          throw new Error(
            `CRITICAL: Position opened at ${symbol} without protection and emergency close failed! ` +
            `Order ID: ${order.id}. MANUAL INTERVENTION REQUIRED!`
          );
        }
      }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`✅ SELL order completed in ${Date.now() - startTime}ms`);
    console.log(`${"=".repeat(60)}\n`);

    return {
      success: true,
      orderId: order.id,
      symbol: symbol,
      side: "sell",
      type: orderType,
      amount: orderAmount,
      price: order.price || order.average,
      cost: order.cost,
      leverage: leverage,
      stopLossOrderId,
      takeProfitOrderId,
      timestamp: order.timestamp || startTime,
      info: order.info,
    };
  } catch (error: any) {
    console.error(`\n❌ Error selling ${options.symbol}:`, error.message);

    return {
      success: false,
      symbol: normalizeSymbol(options.symbol),
      side: "sell",
      type: options.orderType || "market",
      amount: options.amount || 0,
      timestamp: startTime,
      error: error.message,
    };
  }
}

/**
 * Quick sell helper for opening short position
 *
 * @example
 * await quickShort('BTC', 1000, 10); // Short BTC with $1000 at 10x leverage
 */
export async function quickShort(
  symbol: string,
  costUSDT: number,
  leverage: number = 1,
  stopLossPrice?: number,
  takeProfitPrice?: number
): Promise<SellResult> {
  return sell({
    symbol,
    cost: costUSDT,
    leverage,
    stopLoss: stopLossPrice,
    takeProfit: takeProfitPrice,
  });
}

/**
 * Quick close position helper
 *
 * @example
 * await quickClose('BTC'); // Close BTC long position
 */
export async function quickClose(symbol: string): Promise<SellResult> {
  return sell({
    symbol,
    closePosition: true,
  });
}
