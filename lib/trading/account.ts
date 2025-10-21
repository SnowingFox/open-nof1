import { binance } from "./binance";

export interface ExitPlan {
  profit_target: number;
  stop_loss: number;
  invalidation_condition: string;
}

export interface Position {
  symbol: string;
  quantity: number;
  entry_price: number;
  current_price: number;
  liquidation_price: number;
  unrealized_pnl: number;
  leverage: number;
  exit_plan: ExitPlan;
  confidence: number;
  risk_usd: number;
  sl_oid: number; // Stop Loss Order ID
  tp_oid: number; // Take Profit Order ID
  wait_for_fill: boolean;
  entry_oid: number; // Entry Order ID
  notional_usd: number;
}

export interface AccountPerformance {
  current_total_return_percent: number;
  available_cash: number;
  current_account_value: number;
  positions: Position[];
  sharpe_ratio: number;
}

/**
 * Calculate Sharpe Ratio based on historical returns
 * @param returns Array of historical returns
 * @param riskFreeRate Risk-free rate (default: 0)
 * @returns Sharpe ratio
 */
function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0
): number {
  if (returns.length === 0) return 0;

  const avgReturn =
    returns.reduce((sum, r) => sum + r, 0) / returns.length - riskFreeRate;
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
    returns.length;
  const stdDev = Math.sqrt(variance);

  return stdDev === 0 ? 0 : avgReturn / stdDev;
}

/**
 * Find order ID for a specific type (stop loss or take profit)
 * @param orders Array of open orders
 * @param symbol Trading symbol
 * @param orderType Type of order to find
 * @returns Order ID or -1 if not found
 */
function findOrderId(
  orders: Array<{
    symbol?: string;
    type?: string;
    id?: string | number;
  }>,
  symbol: string,
  orderType: "STOP_MARKET" | "TAKE_PROFIT_MARKET"
): number {
  const order = orders.find(
    (o) => o.symbol === symbol.replace("/", "") && o.type === orderType
  );
  return order ? Number(order.id) : -1;
}

/**
 * Fetch account information and performance for given symbols
 * @param symbols Array of trading symbols (e.g., ['BTC/USDT', 'ETH/USDT'])
 * @param initialCapital Initial capital for return calculation (optional)
 * @returns Account performance data
 */
export async function getAccountInformationAndPerformance(
  symbols: string[],
  initialCapital?: number
): Promise<AccountPerformance> {
  try {
    // Fetch account balance
    const balance = await binance.fetchBalance();

    // Get available cash (USDT)
    const balanceFree = balance.free as unknown as Record<string, number>;
    const availableCash = Number(balanceFree?.["USDT"] || 0);

    // Fetch all positions
    const positions = await binance.fetchPositions(symbols);

    // Fetch current market prices
    const tickers = await binance.fetchTickers(symbols);

    // Process each position
    const processedPositions: Position[] = [];
    let totalUnrealizedPnl = 0;

    for (const position of positions) {
      // Skip positions with zero contracts
      if (!position.contracts || position.contracts === 0) continue;

      const symbol = position.symbol;
      const normalizedSymbol = symbol.includes("/") ? symbol : `${symbol}/USDT`;
      const baseSymbol = normalizedSymbol.split("/")[0];

      // Get current price from tickers
      const ticker = tickers[normalizedSymbol];
      const currentPrice = Number(ticker?.last || position.markPrice || 0);

      // Extract position data
      const quantity = Math.abs(Number(position.contracts || 0));
      const entryPrice = Number(position.entryPrice || 0);
      const liquidationPrice = Number(position.liquidationPrice || 0);
      const unrealizedPnl = Number(position.unrealizedPnl || 0);
      const leverage = Number(position.leverage || 1);
      const notionalUsd = Number(position.notional || quantity * currentPrice);

      totalUnrealizedPnl += unrealizedPnl;

      // Fetch open orders for this specific symbol to avoid rate limits
      let openOrders: Array<{
        symbol?: string;
        type?: string;
        id?: string | number;
      }> = [];
      try {
        openOrders = await binance.fetchOpenOrders(normalizedSymbol);
      } catch (error) {
        console.warn(
          `Could not fetch open orders for ${normalizedSymbol}:`,
          error
        );
      }

      // Find stop loss and take profit orders
      const slOrderId = findOrderId(
        openOrders,
        normalizedSymbol,
        "STOP_MARKET"
      );
      const tpOrderId = findOrderId(
        openOrders,
        normalizedSymbol,
        "TAKE_PROFIT_MARKET"
      );

      // Find entry order (this might be filled already, so we look in order history)
      let entryOrderId = -1;
      try {
        const orderHistory = await binance.fetchClosedOrders(
          normalizedSymbol,
          undefined,
          10
        );
        const entryOrder = orderHistory.find(
          (o) => o.side === (position.side === "long" ? "buy" : "sell")
        );
        entryOrderId = entryOrder ? Number(entryOrder.id) : -1;
      } catch (error) {
        console.warn(`Could not fetch order history for ${symbol}:`, error);
      }

      // Calculate exit plan based on position
      const stopLossPercent = 0.03; // 3% default
      const takeProfitPercent = 0.05; // 5% default

      const isLong = position.side === "long";
      const stopLoss = isLong
        ? entryPrice * (1 - stopLossPercent)
        : entryPrice * (1 + stopLossPercent);
      const profitTarget = isLong
        ? entryPrice * (1 + takeProfitPercent)
        : entryPrice * (1 - takeProfitPercent);

      // Calculate risk in USD
      const riskUsd = Math.abs((entryPrice - stopLoss) * quantity);

      // Create invalidation condition based on symbol
      const invalidationCondition = `If 4-hour MACD crosses below ${
        baseSymbol === "BTC"
          ? "-2000"
          : baseSymbol === "ETH"
          ? "-80"
          : baseSymbol === "BNB"
          ? "-40"
          : "-5"
      }`;

      const exitPlan: ExitPlan = {
        profit_target: profitTarget,
        stop_loss: stopLoss,
        invalidation_condition: invalidationCondition,
      };

      processedPositions.push({
        symbol: baseSymbol,
        quantity,
        entry_price: entryPrice,
        current_price: currentPrice,
        liquidation_price: liquidationPrice,
        unrealized_pnl: unrealizedPnl,
        leverage,
        exit_plan: exitPlan,
        confidence: 0.65, // Default confidence
        risk_usd: riskUsd,
        sl_oid: slOrderId,
        tp_oid: tpOrderId,
        wait_for_fill: false,
        entry_oid: entryOrderId,
        notional_usd: notionalUsd,
      });
    }

    // Calculate current account value
    const currentAccountValue = availableCash + totalUnrealizedPnl;

    // Calculate total return
    const initial = initialCapital || 10000; // Default initial capital if not provided
    const currentTotalReturnPercent =
      ((currentAccountValue - initial) / initial) * 100;

    // Calculate Sharpe Ratio
    // For a proper Sharpe ratio, we'd need historical returns
    // Here we'll use a simplified calculation based on current performance
    const returns = positions
      .filter((p) => p.contracts && p.contracts !== 0)
      .map((p) => Number(p.percentage || 0) / 100);
    const sharpeRatio = calculateSharpeRatio(returns);

    return {
      current_total_return_percent: currentTotalReturnPercent,
      available_cash: availableCash,
      current_account_value: currentAccountValue,
      positions: processedPositions,
      sharpe_ratio: sharpeRatio,
    };
  } catch (error) {
    console.error("Error fetching account information:", error);
    throw error;
  }
}

/**
 * Format account performance as a human-readable string
 */
export function formatAccountPerformance(
  performance: AccountPerformance
): string {
  let output = `HERE IS YOUR ACCOUNT INFORMATION & PERFORMANCE
Current Total Return (percent): ${performance.current_total_return_percent.toFixed(
    2
  )}%

Available Cash: ${performance.available_cash.toFixed(2)}

Current Account Value: ${performance.current_account_value.toFixed(2)}

Current live positions & performance:`;

  for (const pos of performance.positions) {
    output += ` {'symbol': '${pos.symbol}', 'quantity': ${
      pos.quantity
    }, 'entry_price': ${pos.entry_price}, 'current_price': ${
      pos.current_price
    }, 'liquidation_price': ${
      pos.liquidation_price
    }, 'unrealized_pnl': ${pos.unrealized_pnl.toFixed(2)}, 'leverage': ${
      pos.leverage
    }, 'exit_plan': {'profit_target': ${pos.exit_plan.profit_target.toFixed(
      2
    )}, 'stop_loss': ${pos.exit_plan.stop_loss.toFixed(
      2
    )}, 'invalidation_condition': '${
      pos.exit_plan.invalidation_condition
    }'}, 'confidence': ${pos.confidence}, 'risk_usd': ${pos.risk_usd.toFixed(
      3
    )}, 'sl_oid': ${pos.sl_oid}, 'tp_oid': ${pos.tp_oid}, 'wait_for_fill': ${
      pos.wait_for_fill
    }, 'entry_oid': ${
      pos.entry_oid
    }, 'notional_usd': ${pos.notional_usd.toFixed(2)}}`;
  }

  output += `\n\nSharpe Ratio: ${performance.sharpe_ratio.toFixed(3)}`;

  return output;
}

/**
 * Get initial position information for a symbol
 * @param symbol - Trading symbol (e.g., 'BTC/USDT')
 * @returns Initial position information including entry price and quantity
 */
export async function getInitialPricing(symbol: string) {
  try {
    const balance = await binance.fetchBalance();
    const positions = balance.info.positions || [];

    // Find the position for the specified symbol
    const position = positions.find((p: any) => {
      const posSymbol = p.symbol.replace("USDT", "/USDT");
      return posSymbol === symbol;
    });

    if (!position || parseFloat(position.positionAmt) === 0) {
      return null;
    }

    return {
      symbol,
      quantity: Math.abs(parseFloat(position.positionAmt)),
      entry_price: parseFloat(position.entryPrice),
      side: parseFloat(position.positionAmt) > 0 ? "long" : "short",
      leverage: parseFloat(position.leverage),
      unrealized_pnl: parseFloat(position.unRealizedProfit),
      liquidation_price: parseFloat(position.liquidationPrice || "0"),
    };
  } catch (error) {
    console.error(`Error fetching initial pricing for ${symbol}:`, error);
    throw error;
  }
}
