import { tool } from 'ai';
import { z } from 'zod';
import { getAccountInformationAndPerformance, formatAccountPerformance } from '@/lib/trading/account';

export const accountInfoTool = tool({
  description: `Get your current account information including:
- Available cash (USDT balance)
- Current account value
- Open positions and their P&L
- Performance metrics (total return, Sharpe ratio)`,

  parameters: z.object({
    symbols: z.array(z.string()).describe("Array of symbols to check positions for"),
    initialCapital: z.number().optional().describe("Initial capital for return calculation"),
  }),

  execute: async ({ symbols, initialCapital }: any) => {
    try {
      const accountInfo = await getAccountInformationAndPerformance(symbols, initialCapital);
      const formatted = formatAccountPerformance(accountInfo);

      return {
        success: true,
        data: formatted,
        balance: accountInfo.available_cash,
        positions: accountInfo.positions.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch account info',
      };
    }
  },
} as any);
