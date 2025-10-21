import { binance } from "./binance";

export interface BuyOptions {
  symbol: string; // 交易对，如 'BTC/USDT' 或 'BTC'
  amount?: number; // 购买数量（币的数量）
  cost?: number; // 购买金额（USDT 数量）
  leverage?: number; // 杠杆倍数 (1-20)
  orderType?: "market" | "limit"; // 订单类型：市价单或限价单
  price?: number; // 限价单价格（仅限价单需要）
  stopLoss?: number; // 止损价格（可选）
  takeProfit?: number; // 止盈价格（可选）
  reduceOnly?: boolean; // 只减仓（用于平仓）
  positionSide?: "LONG" | "SHORT" | "BOTH"; // 仓位方向
}

export interface BuyResult {
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
  info?: Record<string, unknown>;
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
  } catch (error) {
    // Some exchanges might not support this or it might already be set
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`Warning setting leverage for ${symbol}:`, errorMessage);
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
  } catch (error) {
    // Might already be set to the desired mode
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`Warning setting margin mode for ${symbol}:`, errorMessage);
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
  const stopSide = side === "buy" ? "sell" : "buy";

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`⚠️ Stop loss attempt ${attempt}/${maxRetries} failed:`, errorMessage);

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
  const profitSide = side === "buy" ? "sell" : "buy";

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`⚠️ Take profit attempt ${attempt}/${maxRetries} failed:`, errorMessage);

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
    const closeSide = side === "buy" ? "sell" : "buy";

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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Emergency close failed:`, errorMessage);
    return false;
  }
}

/**
 * Buy (Long) a futures contract
 *
 * @param options - Buy options including symbol, amount/cost, leverage, etc.
 * @returns Buy result with order details
 *
 * @example
 * // Buy BTC with market order
 * const result = await buy({
 *   symbol: 'BTC/USDT',
 *   cost: 1000,        // Use $1000 USDT
 *   leverage: 10,      // 10x leverage
 *   stopLoss: 105000,  // Stop loss at $105,000
 *   takeProfit: 115000 // Take profit at $115,000
 * });
 *
 * @example
 * // Buy ETH with limit order
 * const result = await buy({
 *   symbol: 'ETH/USDT',
 *   amount: 5,         // Buy 5 ETH
 *   leverage: 15,      // 15x leverage
 *   orderType: 'limit',
 *   price: 3800        // Limit price at $3800
 * });
 */
export async function buy(options: BuyOptions): Promise<BuyResult> {
  const startTime = Date.now();

  try {
    // Normalize and validate inputs
    const symbol = normalizeSymbol(options.symbol);
    const leverage = validateLeverage(options.leverage || 1);
    const orderType = options.orderType || "market";
    const reduceOnly = options.reduceOnly || false;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`🟢 BUYING ${symbol} (${leverage}x leverage)`);
    console.log(`${"=".repeat(60)}`);

    // Set leverage and margin mode for futures
    await setLeverage(symbol, leverage);
    await setMarginMode(symbol, "cross");

    // Determine order amount
    let orderAmount: number;

    if (options.amount) {
      // Amount specified directly
      orderAmount = options.amount;
    } else if (options.cost) {
      // Calculate amount from cost (USDT value)
      const ticker = await binance.fetchTicker(symbol);
      const currentPrice = Number(ticker.last);

      // With leverage, we can control more with less capital
      // cost is the actual USDT we're spending (margin)
      // notional value = cost * leverage
      orderAmount = (options.cost * leverage) / currentPrice;

      console.log(`Current price: $${currentPrice.toFixed(2)}`);
      console.log(`Margin: $${options.cost.toFixed(2)}`);
      console.log(`Notional value: $${(options.cost * leverage).toFixed(2)}`);
      console.log(
        `Order amount: ${orderAmount.toFixed(6)} ${symbol.split("/")[0]}`
      );
    } else {
      throw new Error("Either 'amount' or 'cost' must be specified");
    }

    // Prepare order parameters
    const params: Record<string, unknown> = {};

    if (options.positionSide) {
      params.positionSide = options.positionSide;
    }

    if (reduceOnly) {
      params.reduceOnly = true;
    }

    // Place the main order
    let order: Record<string, unknown>;

    if (orderType === "limit") {
      if (!options.price) {
        throw new Error("Price must be specified for limit orders");
      }

      console.log(`\nPlacing LIMIT BUY order at $${options.price}...`);
      order = await binance.createOrder(
        symbol,
        "limit",
        "buy",
        orderAmount,
        options.price,
        params
      ) as any;
    } else {
      console.log(`\nPlacing MARKET BUY order...`);
      order = await binance.createOrder(
        symbol,
        "market",
        "buy",
        orderAmount,
        undefined,
        params
      ) as any;
    }

    console.log(`✓ Order placed successfully! Order ID: ${order.id}`);

    // Place stop loss and take profit orders if specified
    let stopLossOrderId: string | number | undefined;
    let takeProfitOrderId: string | number | undefined;
    let protectionFailed = false;

    if (options.stopLoss || options.takeProfit) {
      console.log(`\n🛡️ Setting protection orders...`);

      if (options.stopLoss) {
        console.log(`Setting stop loss at $${options.stopLoss}...`);
        stopLossOrderId = await placeStopLoss(
          symbol,
          orderAmount,
          options.stopLoss,
          "buy",
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
          "buy",
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
          "buy"
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
    console.log(`✅ BUY order completed in ${Date.now() - startTime}ms`);
    console.log(`${"=".repeat(60)}\n`);

    return {
      success: true,
      orderId: order.id as string | number,
      symbol: symbol,
      side: "buy",
      type: orderType,
      amount: orderAmount,
      price: (order.price as number) || (order.average as number),
      cost: order.cost as number,
      leverage: leverage,
      stopLossOrderId,
      takeProfitOrderId,
      timestamp: (order.timestamp as number) || startTime,
      info: order.info as Record<string, unknown>,
    };
  } catch (error: any) {
    console.error(`\n❌ Error buying ${options.symbol}:`, error.message);

    return {
      success: false,
      symbol: normalizeSymbol(options.symbol),
      side: "buy",
      type: options.orderType || "market",
      amount: options.amount || 0,
      timestamp: startTime,
      error: error.message,
    };
  }
}

/**
 * Quick buy helper with minimal parameters
 *
 * @example
 * await quickBuy('BTC', 1000, 10); // Buy BTC with $1000 at 10x leverage
 */
export async function quickBuy(
  symbol: string,
  costUSDT: number,
  leverage: number = 1,
  stopLossPrice?: number,
  takeProfitPrice?: number
): Promise<BuyResult> {
  return buy({
    symbol,
    cost: costUSDT,
    leverage,
    stopLoss: stopLossPrice,
    takeProfit: takeProfitPrice,
  });
}
