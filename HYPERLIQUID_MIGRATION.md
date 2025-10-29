# Hyperliquid Perpetuals Migration Guide

This document outlines the migration from Binance Futures to Hyperliquid Perpetuals.

## Key Changes

### 1. Exchange Platform
- **From**: Binance Futures
- **To**: Hyperliquid DEX Perpetuals

### 2. Symbol Format
- **Old**: `BTC/USDT`, `ETH/USDT`
- **New**: `BTC/USDC:USDC`, `ETH/USDC:USDC`

Hyperliquid perpetuals use USDC as the settlement currency and require the `:USDC` suffix.

### 3. Leverage Limits
- **Binance**: Up to 125x leverage
- **Hyperliquid**: Up to 50x leverage (recommend 2-10x for safety)

### 4. Configuration

#### Environment Variables
```env
# Hyperliquid Configuration
HYPERLIQUID_PRIVATE_KEY=your_private_key
HYPERLIQUID_WALLET_ADDRESS=your_wallet_address
```

#### Hyperliquid Instance (`lib/trading/hyperliquid.ts`)
```typescript
import ccxt from "ccxt";

export const hyperliquid = new ccxt.hyperliquid({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY,
  walletAddress: process.env.HYPERLIQUID_WALLET_ADDRESS,
  enableRateLimit: true,
  options: {
    sandboxMode: true, // Set to false for production
    defaultType: "swap", // For perpetual contracts
  }
});
```

## Enhanced Features for Perpetuals Trading

### 1. Funding Rates
Funding rates are now tracked and analyzed:
- **Positive funding**: Longs pay shorts (bearish signal - market overheated)
- **Negative funding**: Shorts pay longs (bullish signal - market oversold)
- Funding paid every 8 hours

### 2. Open Interest Analysis
Open Interest is used to confirm price movements:
- **Rising OI + Rising Price**: Strong bullish momentum
- **Rising OI + Falling Price**: Strong bearish momentum
- **Falling OI**: Weakening momentum (profit-taking or position closing)

### 3. Orderbook Liquidity
Real-time orderbook depth analysis for better entry/exit timing:
- **Bid/Ask Liquidity**: Total liquidity in top 10 levels
- **Spread**: Bid-ask spread in basis points
- **Imbalance Ratio**: Bid/Ask ratio (>1.1 = buy pressure, <0.9 = sell pressure)

### 4. Enhanced Market State

The `MarketState` interface now includes:

```typescript
export interface MarketState {
  // Current indicators
  current_price: number;
  current_ema20: number;
  current_macd: number;
  current_rsi: number;

  // Open Interest (perpetual-specific)
  open_interest: {
    latest: number;
    average: number;
  };

  // Funding Rate (critical for perpetuals)
  funding_rate: number;

  // Orderbook depth (for liquidity analysis)
  orderbook: {
    bid_liquidity_10: number;
    ask_liquidity_10: number;
    spread_bps: number;
    imbalance_ratio: number;
  };

  // Technical indicators...
}
```

## AI Trading Prompt Updates

The AI system prompt has been enhanced with perpetual-specific knowledge:

### Key Additions:
1. **Funding Rate Analysis**: Interpret funding rates as sentiment indicators
2. **Open Interest Trends**: Confirm price movements with OI changes
3. **Liquidation Risk**: Calculate safe leverage levels based on ATR (volatility)
4. **Risk Management**: Enhanced focus on stop-losses and position sizing with leverage
5. **Platform Specifics**: Hyperliquid max 50x leverage, USDC settlement, 8-hour funding

### Trading Decision Framework:
- **BUY**: When indicators are bullish, funding is favorable (negative or low positive), and OI confirms momentum
- **SELL**: When indicators are bearish, funding is unfavorable (high positive), or to manage risk
- **HOLD**: When signals are mixed or waiting for clearer direction

## Files Modified

### Core Trading Files
1. **`lib/trading/hyperliquid.ts`**: Hyperliquid exchange configuration
2. **`lib/trading/current-market-state.ts`**: Enhanced with funding rates, OI, and orderbook data
3. **`lib/trading/account-information-and-performance.ts`**: Updated for USDC and Hyperliquid symbols
4. **`lib/ai/run.ts`**: Updated leverage limits (1-50x) and symbol format
5. **`lib/ai/prompt.ts`**: Comprehensive perpetuals trading prompt

### Removed Files
- **`lib/trading/binance.ts`**: No longer needed

## API Endpoints

### Updated Endpoints
- **`/api/pricing`**: Now returns Hyperliquid perpetual data including:
  - Current prices for BTC, ETH, SOL, DOGE, BNB
  - Funding rates
  - Open interest
  - Technical indicators (EMA, MACD, RSI, ATR)
  - Orderbook liquidity metrics

## Testing

To test the migration:

```bash
# Start development server
npm run dev

# Test pricing endpoint
curl http://localhost:3000/api/pricing | jq '.data.pricing.btc'

# Expected response includes:
# - current_price
# - open_interest.latest
# - funding_rate
# - orderbook data
```

## Risk Management for Perpetuals

### Critical Considerations:
1. **Leverage Amplification**: Gains and losses are multiplied by leverage
2. **Funding Costs**: Long-term positions incur funding rate costs every 8 hours
3. **Liquidation Risk**: Always calculate liquidation price and set stop-losses
4. **Volatility**: Use ATR to set appropriate stop-loss distances
5. **Position Sizing**: Account for leverage when calculating position size

### Recommended Practices:
- Start with low leverage (2-5x) until comfortable
- Always use stop-loss orders
- Monitor funding rates - high positive funding can erode profits
- Consider OI and funding rate when holding positions overnight
- Scale into positions rather than entering all at once

## Hyperliquid-Specific Features

### Advantages:
- **On-chain**: Transparent, non-custodial trading
- **Low Fees**: Competitive maker/taker fees
- **Mark Price System**: Reduces manipulation and unfair liquidations
- **Sandbox Mode**: Test strategies without real funds

### Limitations:
- Lower max leverage than Binance (50x vs 125x)
- Smaller selection of trading pairs
- Different liquidity profile than centralized exchanges

## Support

For issues or questions:
- Hyperliquid Docs: https://hyperliquid.gitbook.io/
- CCXT Hyperliquid: https://docs.ccxt.com/#/exchanges/hyperliquid

## Migration Checklist

- [x] Update exchange configuration to Hyperliquid
- [x] Change symbol format (BTC/USDT → BTC/USDC:USDC)
- [x] Update leverage limits (20x → 50x max, recommend 2-10x)
- [x] Add funding rate tracking
- [x] Add open interest analysis
- [x] Add orderbook liquidity metrics
- [x] Update AI prompt with perpetuals knowledge
- [x] Update account balance fetching (USDT → USDC)
- [x] Remove Binance dependencies
- [x] Test all endpoints

## Next Steps

1. Test the system with sandbox mode enabled
2. Verify all trading operations work correctly
3. Monitor funding rates and their impact on strategy
4. Analyze orderbook liquidity before entries/exits
5. When ready, disable sandbox mode for production trading
