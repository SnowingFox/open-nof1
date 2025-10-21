import { tool } from 'ai';
import { z } from 'zod';
import { buy } from '@/lib/trading/buy';
import { sell } from '@/lib/trading/sell';
import { riskGuard } from '@/lib/risk/risk-guard';

export const placeOrderTool = tool({
  description: `Place a buy or sell order for cryptocurrency futures.

IMPORTANT: This tool will execute a REAL trade. Use it carefully.

Parameters:
- symbol: Trading pair (e.g., 'BTC/USDT')
- side: 'buy' for long, 'sell' for short/close
- cost: Amount in USDT to invest (for buy/sell)
- leverage: Leverage multiplier (1-20)
- stopLoss: Stop loss price (optional but recommended)
- takeProfit: Take profit price (optional but recommended)

Risk limits:
- Max leverage: ${riskGuard.getMaxLeverage()}x
- Max cost per trade: $${riskGuard.getMaxCost()}
- Allowed symbols: ${riskGuard.getWhitelist().join(', ')}`,

  parameters: z.object({
    symbol: z.string(),
    side: z.enum(['buy', 'sell']),
    cost: z.number().positive(),
    leverage: z.number().min(1).max(20),
    stopLoss: z.number().optional(),
    takeProfit: z.number().optional(),
  }),

  execute: async ({ symbol, side, cost, leverage, stopLoss, takeProfit }: any) => {
    try {
      // 风控检查
      const validation = riskGuard.validate({
        symbol,
        cost,
        leverage,
      });

      if (!validation.allowed) {
        return {
          success: false,
          error: `Risk check failed: ${validation.reason}`,
          rejected: true,
        };
      }

      // 执行订单
      if (side === 'buy') {
        const result = await buy({
          symbol,
          cost,
          leverage,
          stopLoss,
          takeProfit,
        });

        return {
          success: result.success,
          orderId: result.orderId,
          side: 'buy',
          symbol,
          cost,
          leverage,
          message: `✅ Bought ${symbol} for $${cost} at ${leverage}x leverage`,
        };
      } else {
        const result = await sell({
          symbol,
          closePosition: true,  // 默认平仓
        });

        return {
          success: result.success,
          orderId: result.orderId,
          side: 'sell',
          symbol,
          message: `✅ Closed position for ${symbol}`,
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute order',
      };
    }
  },
} as any);
