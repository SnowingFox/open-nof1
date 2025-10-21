import { tool } from 'ai';
import { z } from 'zod';
import { getSharedBroker, getSharedPositionManager } from '../shared-instances';

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
      const broker = getSharedBroker();
      const positionManager = getSharedPositionManager();

      // Sync positions first
      await positionManager.syncPositions(symbols);

      // Get account info
      const accountInfo = await broker.getAccountInfo();
      const availableCash = accountInfo.balance;

      // Get all positions
      const positions = positionManager.getAllPositions();
      const totalUnrealizedPnl = positionManager.getTotalUnrealizedPnL();

      // Calculate account value
      const currentAccountValue = availableCash + totalUnrealizedPnl;

      // Calculate total return
      const initial = initialCapital || 10000;
      const currentTotalReturnPercent = ((currentAccountValue - initial) / initial) * 100;

      // Calculate Sharpe Ratio (simplified based on position returns)
      const returns = positions.map(p => {
        const positionValue = p.amount * p.entryPrice;
        return p.pnl / positionValue;
      });
      const sharpeRatio = calculateSharpeRatio(returns);

      // Format positions for display
      const formattedPositions = positions.map(pos => {
        const pnlPercent = (pos.pnl / (pos.amount * pos.entryPrice)) * 100;
        const riskUsd = pos.amount * pos.entryPrice / pos.leverage;

        return {
          symbol: pos.symbol.split('/')[0],
          quantity: pos.amount,
          entry_price: pos.entryPrice,
          current_price: pos.markPrice,
          liquidation_price: pos.liquidationPrice,
          unrealized_pnl: pos.pnl,
          leverage: pos.leverage,
          side: pos.side,
          pnl_percent: pnlPercent,
          risk_usd: riskUsd,
          notional_usd: pos.amount * pos.markPrice,
        };
      });

      // Build formatted output
      let output = `HERE IS YOUR ACCOUNT INFORMATION & PERFORMANCE
Current Total Return (percent): ${currentTotalReturnPercent.toFixed(2)}%

Available Cash: ${availableCash.toFixed(2)} USDT

Current Account Value: ${currentAccountValue.toFixed(2)} USDT

Current live positions & performance (${positions.length}):
`;

      for (const pos of formattedPositions) {
        const pnlSign = pos.unrealized_pnl >= 0 ? '+' : '';
        output += `
  ${pos.symbol} ${pos.side.toUpperCase()} ${pos.leverage}x:
    Entry: $${pos.entry_price.toFixed(2)} | Current: $${pos.current_price.toFixed(2)}
    PnL: ${pnlSign}$${pos.unrealized_pnl.toFixed(2)} (${pnlSign}${pos.pnl_percent.toFixed(2)}%)
    Quantity: ${pos.quantity.toFixed(4)} | Notional: $${pos.notional_usd.toFixed(2)}
    Liquidation: $${pos.liquidation_price.toFixed(2)}
`;
      }

      output += `\nSharpe Ratio: ${sharpeRatio.toFixed(3)}`;
      output += `\nTotal Unrealized PnL: ${totalUnrealizedPnl >= 0 ? '+' : ''}$${totalUnrealizedPnl.toFixed(2)}`;

      return {
        success: true,
        data: output,
        balance: availableCash,
        positions: positions.length,
        currentAccountValue,
        totalReturn: currentTotalReturnPercent,
        sharpeRatio,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch account info',
      };
    }
  },
} as any);

/**
 * Calculate Sharpe Ratio based on historical returns
 */
function calculateSharpeRatio(returns: number[], riskFreeRate: number = 0): number {
  if (returns.length === 0) return 0;

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length - riskFreeRate;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  return stdDev === 0 ? 0 : avgReturn / stdDev;
}
