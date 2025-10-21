import ccxt from 'ccxt';
import { TradingBroker, OrderResult } from '../exchange/types';
import { binance } from '../trading/binance';

export interface OrderParams {
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
}

export interface Position {
  symbol: string;
  side: 'long' | 'short';
  amount: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  leverage: number;
  liquidationPrice: number;
}

export interface AccountInfo {
  balance: number;
  usedMargin: number;
  availableMargin: number;
  totalPnL: number;
  totalMargin: number;
}

/**
 * Binance Broker Implementation
 * Provides unified interface for Binance futures trading
 */
export class BinanceBroker implements TradingBroker {
  constructor(private exchange: any = binance) {}

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Normalize symbol format
   */
  private normalizeSymbol(symbol: string): string {
    return symbol.includes('/') ? symbol : `${symbol}/USDT`;
  }

  /**
   * Set leverage for a symbol
   */
  async setLeverage(symbol: string, leverage: number): Promise<void> {
    try {
      const normalized = this.normalizeSymbol(symbol);
      await this.exchange.setLeverage(Math.floor(leverage), normalized);
      console.log(`✓ Leverage set to ${leverage}x for ${normalized}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Warning setting leverage:`, errorMessage);
    }
  }

  /**
   * Set margin mode
   */
  async setMarginMode(symbol: string, mode: 'isolated' | 'cross'): Promise<void> {
    try {
      const normalized = this.normalizeSymbol(symbol);
      await this.exchange.setMarginMode(mode, normalized);
      console.log(`✓ Margin mode set to ${mode} for ${normalized}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Warning setting margin mode:`, errorMessage);
    }
  }

  /**
   * Place a stop loss order with retry
   */
  private async placeStopLoss(
    symbol: string,
    amount: number,
    stopPrice: number,
    side: 'buy' | 'sell',
    maxRetries: number = 3
  ): Promise<string | number | undefined> {
    const stopSide = side === 'buy' ? 'sell' : 'buy';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const order = await this.exchange.createOrder(
          symbol,
          'STOP_MARKET',
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
          const delayMs = attempt * 1000;
          console.log(`⏳ Retrying in ${delayMs}ms...`);
          await this.sleep(delayMs);
        }
      }
    }

    return undefined;
  }

  /**
   * Place a take profit order with retry
   */
  private async placeTakeProfit(
    symbol: string,
    amount: number,
    profitPrice: number,
    side: 'buy' | 'sell',
    maxRetries: number = 3
  ): Promise<string | number | undefined> {
    const profitSide = side === 'buy' ? 'sell' : 'buy';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const order = await this.exchange.createOrder(
          symbol,
          'TAKE_PROFIT_MARKET',
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
          const delayMs = attempt * 1000;
          console.log(`⏳ Retrying in ${delayMs}ms...`);
          await this.sleep(delayMs);
        }
      }
    }

    return undefined;
  }

  /**
   * Emergency close a position
   */
  private async emergencyClose(
    symbol: string,
    amount: number,
    side: 'buy' | 'sell'
  ): Promise<boolean> {
    try {
      console.log(`\n⚠️ EMERGENCY: Closing position for ${symbol}...`);
      const closeSide = side === 'buy' ? 'sell' : 'buy';

      const order = await this.exchange.createOrder(
        symbol,
        'market',
        closeSide,
        amount,
        undefined,
        { reduceOnly: true }
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
   * Place an order with full protection
   */
  async placeOrder(params: OrderParams): Promise<OrderResult> {
    const startTime = Date.now();
    const symbol = this.normalizeSymbol(params.symbol);

    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 Placing ${params.side.toUpperCase()} order for ${symbol}`);
      console.log(`${'='.repeat(60)}`);

      // Set leverage and margin mode if specified
      if (params.leverage && params.leverage > 1) {
        await this.setLeverage(symbol, params.leverage);
        await this.setMarginMode(symbol, 'cross');
      }

      // Calculate order amount
      let orderAmount: number;
      if (params.amount) {
        orderAmount = params.amount;
      } else if (params.cost && params.leverage) {
        const ticker = await this.exchange.fetchTicker(symbol);
        const currentPrice = Number(ticker.last);
        orderAmount = (params.cost * params.leverage) / currentPrice;
        console.log(`Current price: $${currentPrice.toFixed(2)}`);
        console.log(`Notional value: $${(params.cost * params.leverage).toFixed(2)}`);
      } else {
        throw new Error('Either amount or (cost + leverage) must be specified');
      }

      // Place main order
      const orderParams: any = {};
      if (params.reduceOnly) {
        orderParams.reduceOnly = true;
      }

      let order: any;
      if (params.type === 'limit' && params.price) {
        console.log(`\nPlacing LIMIT ${params.side.toUpperCase()} order at $${params.price}...`);
        order = await this.exchange.createOrder(
          symbol,
          'limit',
          params.side,
          orderAmount,
          params.price,
          orderParams
        );
      } else {
        console.log(`\nPlacing MARKET ${params.side.toUpperCase()} order...`);
        order = await this.exchange.createOrder(
          symbol,
          'market',
          params.side,
          orderAmount,
          undefined,
          orderParams
        );
      }

      console.log(`✓ Order placed successfully! Order ID: ${order.id}`);

      // Place protection orders if specified and not reducing only
      let stopLossOrderId: string | number | undefined;
      let takeProfitOrderId: string | number | undefined;
      let protectionFailed = false;

      if (!params.reduceOnly && (params.stopLoss || params.takeProfit)) {
        console.log(`\n🛡️ Setting protection orders...`);

        if (params.stopLoss) {
          console.log(`Setting stop loss at $${params.stopLoss}...`);
          stopLossOrderId = await this.placeStopLoss(
            symbol,
            orderAmount,
            params.stopLoss,
            params.side,
            3
          );

          if (!stopLossOrderId) {
            protectionFailed = true;
            console.error(`❌ CRITICAL: Stop loss protection failed for ${symbol}`);
          }
        }

        if (params.takeProfit && !protectionFailed) {
          console.log(`Setting take profit at $${params.takeProfit}...`);
          takeProfitOrderId = await this.placeTakeProfit(
            symbol,
            orderAmount,
            params.takeProfit,
            params.side,
            3
          );

          if (!takeProfitOrderId) {
            console.warn(`⚠️ Warning: Take profit placement failed (not critical)`);
          }
        }

        // If stop loss failed, immediately close the position
        if (protectionFailed) {
          console.error(`\n❌ CRITICAL: Protection orders failed. Initiating emergency close...`);

          const closeSuccess = await this.emergencyClose(symbol, orderAmount, params.side);

          if (closeSuccess) {
            return {
              success: false,
              error: 'Position opened but protection orders failed. Position was closed immediately for safety.',
            };
          } else {
            return {
              success: false,
              error: `CRITICAL: Position opened at ${symbol} without protection and emergency close failed! Order ID: ${order.id}. MANUAL INTERVENTION REQUIRED!`,
            };
          }
        }
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ Order completed in ${Date.now() - startTime}ms`);
      console.log(`${'='.repeat(60)}\n`);

      return {
        success: true,
        orderId: String(order.id),
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ Error placing order:`, errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get positions for specified symbols
   */
  async getPositions(symbols?: string[]): Promise<Position[]> {
    try {
      const normalizedSymbols = symbols?.map(s => this.normalizeSymbol(s));
      const positions = await this.exchange.fetchPositions(normalizedSymbols);

      return positions
        .filter((p: any) => p.contracts && p.contracts !== 0)
        .map((p: any) => ({
          symbol: p.symbol || '',
          side: (p.side === 'long' ? 'long' : 'short') as 'long' | 'short',
          amount: Math.abs(Number(p.contracts || 0)),
          entryPrice: Number(p.entryPrice || 0),
          markPrice: Number(p.markPrice || 0),
          pnl: Number(p.unrealizedPnl || 0),
          leverage: Number(p.leverage || 1),
          liquidationPrice: Number(p.liquidationPrice || 0),
        }));
    } catch (error) {
      console.error('Error fetching positions:', error);
      return [];
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<AccountInfo> {
    try {
      const balance = await this.exchange.fetchBalance();
      const balanceFree = balance.free as unknown as Record<string, number>;
      const balanceUsed = balance.used as unknown as Record<string, number>;

      const availableBalance = Number(balanceFree?.['USDT'] || 0);
      const usedMargin = Number(balanceUsed?.['USDT'] || 0);

      // Get all positions to calculate total PnL
      const positions = await this.getPositions();
      const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);

      return {
        balance: availableBalance + usedMargin + totalPnL,
        usedMargin,
        availableMargin: availableBalance,
        totalPnL,
        totalMargin: usedMargin,
      };
    } catch (error) {
      console.error('Error fetching account info:', error);
      return {
        balance: 0,
        usedMargin: 0,
        availableMargin: 0,
        totalPnL: 0,
        totalMargin: 0,
      };
    }
  }
}

/**
 * Factory function to create BinanceBroker
 */
export function createBinanceBroker(): TradingBroker {
  return new BinanceBroker();
}
