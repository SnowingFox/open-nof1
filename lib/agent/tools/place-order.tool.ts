import { tool } from 'ai';
import { z } from 'zod';
import { riskGuard } from '@/lib/risk/risk-guard';
import { getSharedBroker, getSharedPositionManager } from '../shared-instances';

export const placeOrderTool = tool({
  description: `Place a trading order for cryptocurrency futures.

IMPORTANT: This tool will execute a REAL trade. Use it carefully.

Actions:
- 'open_long': Open a long position (buy to enter)
- 'close_long': Close a long position (sell to exit)
- 'open_short': Open a short position (sell to enter)
- 'close_short': Close a short position (buy to exit)

Parameters:
- symbol: Trading pair (e.g., 'BTC/USDT')
- action: Trading action (see above)
- cost: Amount in USDT to invest (for opening positions)
- leverage: Leverage multiplier (1-20, for opening positions)
- stopLoss: Stop loss price (optional but recommended)
- takeProfit: Take profit price (optional but recommended)

Risk limits:
- Max leverage: ${riskGuard.getMaxLeverage()}x
- Max cost per trade: $${riskGuard.getMaxCost()}
- Allowed symbols: ${riskGuard.getWhitelist().join(', ')}`,

  parameters: z.object({
    symbol: z.string(),
    action: z.enum(['open_long', 'close_long', 'open_short', 'close_short']),
    cost: z.number().positive().optional(),
    leverage: z.number().min(1).max(20).optional(),
    stopLoss: z.number().optional(),
    takeProfit: z.number().optional(),
  }),

  execute: async ({ symbol, action, cost, leverage, stopLoss, takeProfit }: any) => {
    try {
      const broker = getSharedBroker();
      const positionManager = getSharedPositionManager();

      // Validate parameters based on action
      if (action === 'open_long' || action === 'open_short') {
        if (!cost) {
          return {
            success: false,
            error: 'Cost is required for opening positions',
          };
        }
        if (!leverage) {
          return {
            success: false,
            error: 'Leverage is required for opening positions',
          };
        }

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

        // Check if can open position
        if (!positionManager.canOpenPosition(symbol, riskGuard, 5)) {
          return {
            success: false,
            error: 'Cannot open position: max positions reached or position already exists',
          };
        }
      }

      // Execute based on action
      if (action === 'open_long') {
        // Open long position (buy)
        const result = await broker.placeOrder({
          symbol,
          side: 'buy',
          type: 'market',
          cost,
          leverage,
          stopLoss,
          takeProfit,
        });

        // Sync positions after trade
        await positionManager.forceSync([symbol]);

        return {
          success: result.success,
          orderId: result.orderId,
          action: 'open_long',
          symbol,
          cost,
          leverage,
          message: `✅ Opened LONG position: ${symbol} for $${cost} at ${leverage}x leverage`,
          error: result.error,
        };
      }
      else if (action === 'close_long') {
        // Close long position
        const position = positionManager.getPosition(symbol);

        if (!position || position.side !== 'long') {
          return {
            success: false,
            error: `No long position found for ${symbol}`,
          };
        }

        const result = await broker.placeOrder({
          symbol,
          side: 'sell',
          type: 'market',
          amount: position.amount,
          reduceOnly: true,
        });

        // Sync positions after trade
        await positionManager.forceSync([symbol]);

        return {
          success: result.success,
          orderId: result.orderId,
          action: 'close_long',
          symbol,
          message: `✅ Closed LONG position for ${symbol}`,
          error: result.error,
        };
      }
      else if (action === 'open_short') {
        // Open short position (sell)
        const result = await broker.placeOrder({
          symbol,
          side: 'sell',
          type: 'market',
          cost,
          leverage,
          stopLoss,
          takeProfit,
        });

        // Sync positions after trade
        await positionManager.forceSync([symbol]);

        return {
          success: result.success,
          orderId: result.orderId,
          action: 'open_short',
          symbol,
          cost,
          leverage,
          message: `✅ Opened SHORT position: ${symbol} for $${cost} at ${leverage}x leverage`,
          error: result.error,
        };
      }
      else if (action === 'close_short') {
        // Close short position
        const position = positionManager.getPosition(symbol);

        if (!position || position.side !== 'short') {
          return {
            success: false,
            error: `No short position found for ${symbol}`,
          };
        }

        const result = await broker.placeOrder({
          symbol,
          side: 'buy',
          type: 'market',
          amount: position.amount,
          reduceOnly: true,
        });

        // Sync positions after trade
        await positionManager.forceSync([symbol]);

        return {
          success: result.success,
          orderId: result.orderId,
          action: 'close_short',
          symbol,
          message: `✅ Closed SHORT position for ${symbol}`,
          error: result.error,
        };
      }

      return {
        success: false,
        error: 'Invalid action',
      };

    } catch (error) {
      console.error('Order execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute order',
      };
    }
  },
} as any);
