import { tool } from 'ai';
import { z } from 'zod';
import { getCurrentMarketState, formatMarketState } from '@/lib/trading/market-data';

export const marketDataTool = tool({
  description: `Get real-time market data for a cryptocurrency including:
- Current price
- Technical indicators (EMA, MACD, RSI, ATR)
- Volume data
- Open interest and funding rate (for perpetual futures)
- Recent price history`,

  parameters: z.object({
    symbol: z.string().describe("Trading pair symbol (e.g., 'BTC/USDT', 'ETH/USDT')"),
  }),

  execute: async ({ symbol }: any) => {
    try {
      const marketState = await getCurrentMarketState(symbol);
      const formatted = formatMarketState(marketState);

      return {
        success: true,
        data: formatted,
        symbol,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch market data',
        symbol,
      };
    }
  },
} as any);
