import { TradingBroker } from '../exchange/types';
import { Position } from '../broker/binance-broker';
import { RiskGuard } from '../risk/risk-guard';

/**
 * Position Manager
 * Centralized position tracking and management
 */
export class PositionManager {
  private positions: Map<string, Position> = new Map();
  private lastSyncTime: number = 0;
  private syncCooldown: number = 5000; // 5 seconds cooldown between syncs

  constructor(private broker: TradingBroker) {}

  /**
   * Sync positions from the broker
   */
  async syncPositions(symbols?: string[]): Promise<void> {
    const now = Date.now();

    // Prevent too frequent syncs
    if (now - this.lastSyncTime < this.syncCooldown) {
      console.log(`⏭️  Skipping position sync (cooldown: ${this.syncCooldown}ms)`);
      return;
    }

    try {
      console.log(`🔄 Syncing positions...`);
      const positions = await this.broker.getPositions(symbols);

      // Clear old positions
      if (symbols && symbols.length > 0) {
        // Only clear specified symbols
        symbols.forEach(symbol => {
          const normalized = symbol.includes('/') ? symbol : `${symbol}/USDT`;
          this.positions.delete(normalized);
        });
      } else {
        // Clear all positions
        this.positions.clear();
      }

      // Update with new positions (ensure all required fields are present)
      positions.forEach(position => {
        this.positions.set(position.symbol, position as Position);
      });

      this.lastSyncTime = now;
      console.log(`✓ Synced ${positions.length} position(s)`);
    } catch (error) {
      console.error('Failed to sync positions:', error);
    }
  }

  /**
   * Get a specific position
   */
  getPosition(symbol: string): Position | null {
    const normalized = symbol.includes('/') ? symbol : `${symbol}/USDT`;
    return this.positions.get(normalized) || null;
  }

  /**
   * Get all positions
   */
  getAllPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  /**
   * Check if has position for a symbol
   */
  hasPosition(symbol: string): boolean {
    const normalized = symbol.includes('/') ? symbol : `${symbol}/USDT`;
    return this.positions.has(normalized);
  }

  /**
   * Check if has a long position
   */
  hasLongPosition(symbol: string): boolean {
    const position = this.getPosition(symbol);
    return position !== null && position.side === 'long';
  }

  /**
   * Check if has a short position
   */
  hasShortPosition(symbol: string): boolean {
    const position = this.getPosition(symbol);
    return position !== null && position.side === 'short';
  }

  /**
   * Get total number of open positions
   */
  getPositionCount(): number {
    return this.positions.size;
  }

  /**
   * Get total unrealized PnL across all positions
   */
  getTotalUnrealizedPnL(): number {
    return Array.from(this.positions.values()).reduce(
      (total, position) => total + position.pnl,
      0
    );
  }

  /**
   * Get total margin used across all positions
   */
  getTotalMarginUsed(): number {
    return Array.from(this.positions.values()).reduce(
      (total, position) => total + (position.amount * position.entryPrice / position.leverage),
      0
    );
  }

  /**
   * Check if can open a new position (risk management)
   */
  canOpenPosition(symbol: string, riskGuard: RiskGuard, maxPositions: number = 5): boolean {
    // Check if already has max positions
    if (this.getPositionCount() >= maxPositions) {
      console.warn(`⚠️  Cannot open position: already have ${maxPositions} positions`);
      return false;
    }

    // Check if already has a position for this symbol
    if (this.hasPosition(symbol)) {
      console.warn(`⚠️  Cannot open position: already have position for ${symbol}`);
      return false;
    }

    // Additional risk checks can be added here
    // For example: check if total margin usage is below threshold

    return true;
  }

  /**
   * Check if should close position based on risk criteria
   */
  shouldClosePosition(symbol: string, maxLossPercent: number = 0.05): boolean {
    const position = this.getPosition(symbol);

    if (!position) {
      return false;
    }

    // Calculate loss percentage
    const positionValue = position.amount * position.entryPrice;
    const lossPercent = Math.abs(position.pnl) / positionValue;

    // If loss exceeds threshold, should close
    if (position.pnl < 0 && lossPercent > maxLossPercent) {
      console.warn(
        `⚠️  Position ${symbol} loss (${(lossPercent * 100).toFixed(2)}%) exceeds threshold (${maxLossPercent * 100}%)`
      );
      return true;
    }

    return false;
  }

  /**
   * Get position summary for display
   */
  getPositionSummary(): string {
    const positions = this.getAllPositions();

    if (positions.length === 0) {
      return 'No open positions';
    }

    let summary = `\n📊 Open Positions (${positions.length}):\n`;
    summary += '─'.repeat(80) + '\n';

    positions.forEach(pos => {
      const pnlSign = pos.pnl >= 0 ? '+' : '';
      const pnlPercent = (pos.pnl / (pos.amount * pos.entryPrice)) * 100;

      summary += `${pos.symbol} | ${pos.side.toUpperCase()} ${pos.leverage}x | `;
      summary += `Entry: $${pos.entryPrice.toFixed(2)} | `;
      summary += `Mark: $${pos.markPrice.toFixed(2)} | `;
      summary += `PnL: ${pnlSign}$${pos.pnl.toFixed(2)} (${pnlSign}${pnlPercent.toFixed(2)}%)\n`;
    });

    summary += '─'.repeat(80) + '\n';
    summary += `Total PnL: ${this.getTotalUnrealizedPnL() >= 0 ? '+' : ''}$${this.getTotalUnrealizedPnL().toFixed(2)}\n`;

    return summary;
  }

  /**
   * Force refresh position data (ignoring cooldown)
   */
  async forceSync(symbols?: string[]): Promise<void> {
    this.lastSyncTime = 0; // Reset cooldown
    await this.syncPositions(symbols);
  }

  /**
   * Clear all cached positions (for testing)
   */
  clear(): void {
    this.positions.clear();
    this.lastSyncTime = 0;
  }
}
