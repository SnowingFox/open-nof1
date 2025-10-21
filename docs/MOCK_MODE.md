# Mock Mode Guide

## Overview

Mock mode allows you to test the entire trading system **without any API keys** or real money. It's perfect for:

- Learning how the system works
- Testing new strategies
- Developing new features
- CI/CD testing

## Quick Start

### Option 1: Test Broker Only (No AI, No API Keys)

This is the simplest way to test. It runs a comprehensive test suite of broker operations:

```bash
npm run test:broker
```

**What it does:**
- ✅ Tests account information retrieval
- ✅ Opens long and short positions
- ✅ Manages positions with stop-loss and take-profit
- ✅ Validates risk management rules
- ✅ Closes positions
- ✅ All with simulated market data

**Requirements:**
- None! Just run it.

### Option 2: Full AI Trading with Mock Broker

Run the complete AI trading agent but with simulated trades:

```bash
npm run trading:dev
```

**What it does:**
- ✅ AI analyzes market data (simulated)
- ✅ AI makes trading decisions
- ✅ Orders are executed via MockBroker (no real trades)
- ✅ You can see the AI's reasoning process

**Requirements:**
- `DEEPSEEK_API_KEY` or `OPENROUTER_API_KEY` (for AI decision-making)
- No Binance API keys needed

## Mock Broker Features

The MockBroker simulates a complete trading environment:

### Simulated Market Data
- Starting prices:
  - BTC/USDT: ~$100,000
  - ETH/USDT: ~$3,800
  - BNB/USDT: ~$650
  - SOL/USDT: ~$225
  - DOGE/USDT: ~$0.35

- Price updates with realistic volatility (0.1% per update)
- Prices drift randomly to simulate market movement

### Account Simulation
- Initial balance: $10,000 USDT
- Track used and available margin
- Calculate unrealized PnL in real-time
- Support for multiple concurrent positions

### Order Execution
- Market orders execute instantly at current mock price
- Stop-loss and take-profit orders are tracked
- Leverage support (1-20x)
- Position tracking (long and short)

### Risk Management
- All RiskGuard rules apply
- Position limits enforced
- Leverage limits respected
- Cost per trade limits checked

## Example Test Output

```bash
$ npm run test:broker

🧪 Broker Testing Script
============================================================
Testing MockBroker functionality without AI

📊 Test 1: Getting account information...
✓ Balance: $10000.00
✓ Available Margin: $10000.00
✓ Used Margin: $0.00

📝 Test 2: Opening long position...
[MOCK] Current price: $99878.42
[MOCK] Notional value: $500.00
✓ Order placed successfully

📋 Test 3: Checking positions...
✓ Found 1 position(s)
✓ BTC/USDT LONG 5x
✓ Entry: $99878.42
✓ Mark: $99328.16
✓ PnL: $-2.75

✅ All broker tests completed successfully!
```

## Architecture

### How Mock Mode Works

1. **Broker Factory** (`lib/broker/broker-factory.ts`)
   - Detects `--dev` flag
   - Creates MockBroker instead of BinanceBroker
   - Initializes shared instances

2. **MockBroker** (`lib/broker/mock-broker.ts`)
   - Implements TradingBroker interface
   - Maintains in-memory position state
   - Simulates price movements
   - Logs all operations with `[MOCK]` prefix

3. **Position Manager** (`lib/position/position-manager.ts`)
   - Works identically with MockBroker
   - Caches position data
   - Provides risk management checks

## Benefits of Mock Mode

### For Development
- **No API Setup**: Start coding immediately
- **Fast Iteration**: No network calls, instant execution
- **Deterministic Testing**: Predictable price movements
- **Safe Experimentation**: Try anything without risk

### For Learning
- **Understand Flow**: See how the system works
- **Test Strategies**: Experiment with trading logic
- **Debug Issues**: Isolate problems without real trades

### For CI/CD
- **Automated Testing**: Run tests in CI without secrets
- **Integration Tests**: Test full workflow end-to-end
- **Performance Testing**: Benchmark without API limits

## Transitioning to Real Trading

When you're ready to move from mock to real trading:

### 1. Test with Paper Trading First

Set up Binance testnet API keys:

```bash
# In .env file
BINANCE_API_KEY=your_testnet_key
BINANCE_API_SECRET=your_testnet_secret
```

Run without `--dev` flag but keep `mode: 'paper'` in config:

```bash
npm run trading:start
```

### 2. Move to Live Trading

**⚠️ WARNING: This uses real money!**

1. Update `lib/risk/config.ts`:
```typescript
export function getRiskConfig(): RiskConfig {
  return {
    mode: 'live',  // Change from 'paper' to 'live'
    // ... rest of config
  };
}
```

2. Set production API keys in `.env`

3. Start with small limits:
```typescript
maxCostPerTrade: 10,  // Start with $10 only
maxLeverage: 2,       // Low leverage
```

4. Run:
```bash
npm run trading:start
```

## Tips and Best Practices

### During Development

1. **Use test:broker for quick checks**
   ```bash
   npm run test:broker
   ```

2. **Watch the logs** - All mock operations are clearly marked:
   ```
   [MOCK] Placing BUY order for BTC/USDT
   [MOCK] Current price: $99878.42
   ✓ [MOCK] Order placed successfully!
   ```

3. **Check position state** - Use the PositionManager summary:
   ```typescript
   console.log(positionManager.getPositionSummary());
   ```

### Before Going Live

1. Run broker tests: `npm run test:broker`
2. Run with AI in mock mode: `npm run trading:dev`
3. Test on Binance testnet
4. Start with very small amounts
5. Monitor closely for the first few days

## Troubleshooting

### "AI calls will fail but broker operations will work"

This is normal if you run `npm run trading:dev` without AI API keys. The broker tests will work, but the AI agent needs an API key to make decisions.

**Solution**: Either:
- Use `npm run test:broker` (no AI needed)
- Or set `DEEPSEEK_API_KEY` / `OPENROUTER_API_KEY`

### Mock prices seem random

This is intentional. Mock prices drift with 0.1% volatility to simulate market movement. This helps test how your strategies handle price changes.

### Positions show PnL

The MockBroker simulates price updates, so positions will show unrealized PnL based on the new mock prices. This is realistic behavior.

## Code Examples

### Manually Create Mock Broker

```typescript
import { createBroker } from '@/lib/broker/broker-factory';
import { PositionManager } from '@/lib/position/position-manager';

// Create mock broker
const broker = createBroker('mock');
const positionManager = new PositionManager(broker);

// Check balance
const account = await broker.getAccountInfo();
console.log(`Balance: $${account.balance}`);

// Place order
const result = await broker.placeOrder({
  symbol: 'BTC/USDT',
  side: 'buy',
  type: 'market',
  cost: 100,
  leverage: 5,
  stopLoss: 95000,
  takeProfit: 105000,
});

console.log(`Order ${result.orderId} placed!`);
```

### Reset Mock State

```typescript
// MockBroker has a reset method for testing
if (broker instanceof MockBroker) {
  broker.reset(5000); // Reset with $5000 balance
}
```

## Further Reading

- [Broker Architecture](./ARCHITECTURE.md)
- [Risk Management](./RISK_MANAGEMENT.md)
- [Trading Strategies](./STRATEGIES.md)
