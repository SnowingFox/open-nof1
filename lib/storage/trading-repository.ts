import { PrismaClient, Opeartion, Symbol } from '@prisma/client';
import prisma from './prisma-client';

export interface TradingSessionData {
  symbol: string;
  reasoning: string;
  userPrompt: string;
  toolCalls: any[];
  success: boolean;
  error?: string;
  trades?: TradeData[];
}

export interface TradeData {
  symbol: string;
  operation: 'Buy' | 'Sell' | 'Hold';
  leverage?: number;
  amount?: number;
  pricing?: number;
  stopLoss?: number;
  takeProfit?: number;
}

/**
 * Trading Repository
 * Handles database operations for trading sessions and history
 */
export class TradingRepository {
  constructor(private db: PrismaClient = prisma) {}

  /**
   * Save a trading session to database
   */
  async saveTradingSession(sessionData: TradingSessionData): Promise<void> {
    try {
      await this.db.chat.create({
        data: {
          reasoning: sessionData.reasoning,
          userPrompt: sessionData.userPrompt,
          tradings: {
            create: (sessionData.trades || []).map(trade => ({
              symbol: this.mapSymbol(trade.symbol),
              opeartion: this.mapOperation(trade.operation),
              leverage: trade.leverage || 1,
              amount: trade.amount || 0,
              pricing: trade.pricing || 0,
              stopLoss: trade.stopLoss || 0,
              takeProfit: trade.takeProfit || 0,
            })),
          },
        },
      });

      console.log(`📝 Trading session saved to database`);
    } catch (error) {
      console.error('Failed to save trading session:', error);
      // Don't throw - logging failure shouldn't stop trading
    }
  }

  /**
   * Map symbol string to enum
   */
  private mapSymbol(symbol: string): Symbol {
    const baseSymbol = symbol.split('/')[0].toUpperCase();

    switch (baseSymbol) {
      case 'BTC':
        return Symbol.BTC;
      case 'ETH':
        return Symbol.ETH;
      case 'BNB':
        return Symbol.BNB;
      case 'SOL':
        return Symbol.SOL;
      case 'DOGE':
        return Symbol.DOGE;
      default:
        return Symbol.BTC; // Default fallback
    }
  }

  /**
   * Map operation string to enum
   */
  private mapOperation(operation: string): Opeartion {
    const normalized = operation.toLowerCase();

    if (normalized.includes('buy') || normalized.includes('long')) {
      return Opeartion.Buy;
    } else if (normalized.includes('sell') || normalized.includes('short')) {
      return Opeartion.Sell;
    } else {
      return Opeartion.Hold;
    }
  }

  /**
   * Get recent trading sessions
   */
  async getRecentSessions(limit: number = 10): Promise<any[]> {
    try {
      return await this.db.chat.findMany({
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          tradings: true,
        },
      });
    } catch (error) {
      console.error('Failed to fetch recent sessions:', error);
      return [];
    }
  }

  /**
   * Get trading history for a specific symbol
   */
  async getTradeHistory(symbol: string, limit: number = 20): Promise<any[]> {
    try {
      const mappedSymbol = this.mapSymbol(symbol);

      return await this.db.trading.findMany({
        where: {
          symbol: mappedSymbol,
        },
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          Chat: true,
        },
      });
    } catch (error) {
      console.error('Failed to fetch trade history:', error);
      return [];
    }
  }

  /**
   * Get historical returns for Sharpe Ratio calculation
   */
  async getHistoricalReturns(days: number = 30): Promise<number[]> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const trades = await this.db.trading.findMany({
        where: {
          createdAt: {
            gte: since,
          },
          pricing: {
            not: null,
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Calculate daily returns
      // This is a simplified calculation - in production you'd want to track actual PnL
      const returns: number[] = [];
      for (let i = 1; i < trades.length; i++) {
        const prevPrice = trades[i - 1].pricing || 0;
        const currPrice = trades[i].pricing || 0;

        if (prevPrice > 0) {
          const dailyReturn = (currPrice - prevPrice) / prevPrice;
          returns.push(dailyReturn);
        }
      }

      return returns;
    } catch (error) {
      console.error('Failed to fetch historical returns:', error);
      return [];
    }
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats(): Promise<{
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
  }> {
    try {
      const trades = await this.db.trading.findMany({
        where: {
          pricing: {
            not: null,
          },
        },
      });

      // This is simplified - you'd need actual PnL data to calculate properly
      const totalTrades = trades.length;
      const winningTrades = trades.filter(t => (t.pricing || 0) > 0).length;
      const losingTrades = totalTrades - winningTrades;
      const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;

      return {
        totalTrades,
        winningTrades,
        losingTrades,
        winRate,
      };
    } catch (error) {
      console.error('Failed to fetch performance stats:', error);
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
      };
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.db.$disconnect();
  }
}
