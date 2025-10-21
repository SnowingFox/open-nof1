import { TradingBroker, OrderResult } from '../exchange/types';
import { OrderParams, Position, AccountInfo } from './binance-broker';

/**
 * Mock Broker for Development and Testing
 * Simulates trading without making real API calls
 */
export class MockBroker implements TradingBroker {
  private mockPositions: Map<string, Position> = new Map();
  private mockBalance: number = 10000; // Start with $10,000 USDT
  private orderCounter: number = 1;
  private mockPrices: Map<string, number> = new Map([
    ['BTC/USDT', 100000],
    ['ETH/USDT', 3800],
    ['SOL/USDT', 180],
    ['BNB/USDT', 650],
    ['DOGE/USDT', 0.35],
  ]);

  constructor(initialBalance: number = 10000) {
    this.mockBalance = initialBalance;
    console.log(`\n🎭 MockBroker initialized with $${initialBalance} USDT`);
    console.log(`📝 This is a SIMULATION - no real trades will be executed\n`);
  }

  /**
   * Sleep utility for realistic delays
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
   * Get mock price for a symbol
   */
  private getMockPrice(symbol: string): number {
    const normalized = this.normalizeSymbol(symbol);
    const price = this.mockPrices.get(normalized);

    if (!price) {
      // Generate a random price if not predefined
      return Math.random() * 1000 + 100;
    }

    // Add some random volatility (±0.5%)
    const volatility = 0.005;
    const randomChange = (Math.random() - 0.5) * 2 * volatility;
    return price * (1 + randomChange);
  }

  /**
   * Update mock price (simulate market movement)
   */
  private updateMockPrice(symbol: string): void {
    const normalized = this.normalizeSymbol(symbol);
    const currentPrice = this.mockPrices.get(normalized) || 1000;

    // Simulate random price movement (±1%)
    const movement = (Math.random() - 0.5) * 0.02;
    const newPrice = currentPrice * (1 + movement);

    this.mockPrices.set(normalized, newPrice);
  }

  /**
   * Set leverage (mocked)
   */
  async setLeverage(symbol: string, leverage: number): Promise<void> {
    await this.sleep(100); // Simulate API delay
    console.log(`✓ [MOCK] Leverage set to ${leverage}x for ${symbol}`);
  }

  /**
   * Set margin mode (mocked)
   */
  async setMarginMode(symbol: string, mode: 'isolated' | 'cross'): Promise<void> {
    await this.sleep(100); // Simulate API delay
    console.log(`✓ [MOCK] Margin mode set to ${mode} for ${symbol}`);
  }

  /**
   * Place an order (mocked)
   */
  async placeOrder(params: OrderParams): Promise<OrderResult> {
    const startTime = Date.now();
    const symbol = this.normalizeSymbol(params.symbol);

    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 [MOCK] Placing ${params.side.toUpperCase()} order for ${symbol}`);
      console.log(`${'='.repeat(60)}`);

      await this.sleep(200); // Simulate API delay

      // Get current mock price
      const currentPrice = this.getMockPrice(symbol);
      console.log(`[MOCK] Current price: $${currentPrice.toFixed(2)}`);

      // Calculate order amount
      let orderAmount: number;
      if (params.amount) {
        orderAmount = params.amount;
      } else if (params.cost && params.leverage) {
        orderAmount = (params.cost * params.leverage) / currentPrice;
        console.log(`[MOCK] Notional value: $${(params.cost * params.leverage).toFixed(2)}`);
      } else {
        throw new Error('Either amount or (cost + leverage) must be specified');
      }

      console.log(`[MOCK] Order amount: ${orderAmount.toFixed(6)} ${symbol.split('/')[0]}`);

      // Generate mock order ID
      const orderId = `MOCK_${this.orderCounter++}_${Date.now()}`;
      console.log(`✓ [MOCK] Order placed successfully! Order ID: ${orderId}`);

      // Update position if not reduce-only
      if (!params.reduceOnly) {
        const existingPosition = this.mockPositions.get(symbol);

        if (existingPosition) {
          // Close or modify existing position
          if (
            (existingPosition.side === 'long' && params.side === 'sell') ||
            (existingPosition.side === 'short' && params.side === 'buy')
          ) {
            // Closing position
            this.mockPositions.delete(symbol);
            console.log(`✓ [MOCK] Position closed for ${symbol}`);
          }
        } else {
          // Open new position
          const newPosition: Position = {
            symbol,
            side: params.side === 'buy' ? 'long' : 'short',
            amount: orderAmount,
            entryPrice: currentPrice,
            markPrice: currentPrice,
            pnl: 0,
            leverage: params.leverage || 1,
            liquidationPrice: this.calculateLiquidationPrice(
              currentPrice,
              params.side === 'buy' ? 'long' : 'short',
              params.leverage || 1
            ),
          };

          this.mockPositions.set(symbol, newPosition);
          console.log(`✓ [MOCK] Position opened: ${newPosition.side.toUpperCase()} ${symbol}`);
        }
      }

      // Simulate protection orders
      if (params.stopLoss) {
        await this.sleep(100);
        console.log(`✓ [MOCK] Stop loss order placed at $${params.stopLoss}`);
      }

      if (params.takeProfit) {
        await this.sleep(100);
        console.log(`✓ [MOCK] Take profit order placed at $${params.takeProfit}`);
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ [MOCK] Order completed in ${Date.now() - startTime}ms`);
      console.log(`${'='.repeat(60)}\n`);

      return {
        success: true,
        orderId,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ [MOCK] Error placing order:`, errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Calculate liquidation price
   */
  private calculateLiquidationPrice(
    entryPrice: number,
    side: 'long' | 'short',
    leverage: number
  ): number {
    // Simplified liquidation calculation
    const maintenanceMarginRate = 0.004; // 0.4%
    const liquidationPercentage = (1 / leverage) - maintenanceMarginRate;

    if (side === 'long') {
      return entryPrice * (1 - liquidationPercentage);
    } else {
      return entryPrice * (1 + liquidationPercentage);
    }
  }

  /**
   * Get positions (mocked)
   */
  async getPositions(symbols?: string[]): Promise<Position[]> {
    await this.sleep(100); // Simulate API delay

    // Update mock prices and PnL
    for (const [symbol, position] of this.mockPositions.entries()) {
      this.updateMockPrice(symbol);
      const newPrice = this.getMockPrice(symbol);

      position.markPrice = newPrice;

      // Calculate PnL
      if (position.side === 'long') {
        position.pnl = (newPrice - position.entryPrice) * position.amount;
      } else {
        position.pnl = (position.entryPrice - newPrice) * position.amount;
      }
    }

    if (symbols && symbols.length > 0) {
      const normalizedSymbols = symbols.map(s => this.normalizeSymbol(s));
      return Array.from(this.mockPositions.values()).filter(p =>
        normalizedSymbols.includes(p.symbol)
      );
    }

    return Array.from(this.mockPositions.values());
  }

  /**
   * Get account information (mocked)
   */
  async getAccountInfo(): Promise<AccountInfo> {
    await this.sleep(100); // Simulate API delay

    const positions = await this.getPositions();
    const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
    const usedMargin = positions.reduce((sum, p) =>
      sum + (p.amount * p.entryPrice / p.leverage), 0
    );

    return {
      balance: this.mockBalance + totalPnL,
      usedMargin,
      availableMargin: this.mockBalance - usedMargin,
      totalPnL,
      totalMargin: usedMargin,
    };
  }

  /**
   * Reset mock state (for testing)
   */
  reset(initialBalance: number = 10000): void {
    this.mockPositions.clear();
    this.mockBalance = initialBalance;
    this.orderCounter = 1;
    console.log(`\n🔄 [MOCK] Broker reset with $${initialBalance} USDT\n`);
  }

  /**
   * Get current mock state (for debugging)
   */
  getState() {
    return {
      balance: this.mockBalance,
      positions: Array.from(this.mockPositions.values()),
      prices: Object.fromEntries(this.mockPrices),
    };
  }
}

/**
 * Factory function to create MockBroker
 */
export function createMockBroker(initialBalance?: number): TradingBroker {
  return new MockBroker(initialBalance);
}
