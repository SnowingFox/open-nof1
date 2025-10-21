# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenNof1 is an AI-powered cryptocurrency trading system inspired by Alpha Arena (nof1.ai). It uses large language models (DeepSeek R1) to autonomously analyze market data and execute trades on Binance futures markets.

## Core Architecture

### AI Trading Agent System

The system follows a multi-layered architecture:

1. **TradingAgent** (`lib/agent/trading-agent.ts`): Orchestrates the trading process
   - Uses `generateText` from the `ai` SDK with tool calling (up to 15 steps)
   - Processes multiple symbols sequentially
   - Delegates market analysis and decision-making to the AI model

2. **AI Tools** (`lib/agent/tools/`): Four core tools available to the AI agent
   - `getMarketData`: Fetches real-time price, technical indicators (RSI, MACD, EMA, ATR), volume, funding rates
   - `getAccountInfo`: Retrieves balance, positions, and P&L
   - `placeOrder`: Executes buy/sell orders with leverage
   - `search`: Web search for news and sentiment (via Exa)

3. **RiskGuard** (`lib/risk/risk-guard.ts`): Enforces trading constraints
   - Symbol whitelist validation
   - Leverage limits (default: 1-10x)
   - Per-trade cost limits (default: $100)
   - All constraints are injected into the AI system prompt

4. **Scheduler** (`lib/scheduler/scheduler.ts`): Manages periodic execution
   - Runs trading cycles at configurable intervals (default: 5 minutes)
   - Graceful shutdown on SIGINT/SIGTERM
   - Executes immediately on startup, then on interval

5. **AuditLogger** (`lib/storage/audit-logger.ts`): Records all trading sessions
   - Logs AI reasoning, tool calls, and outcomes to `logs/` directory

### Key Design Pattern: AI-First Architecture

The system prompt (`lib/agent/prompt.ts`) defines the entire trading strategy. The AI model:
- Receives market context through tools
- Makes autonomous decisions (BUY/SELL/HOLD)
- Calculates position sizing, stop-loss, and take-profit levels
- Executes trades through tool calls

Risk constraints are embedded in the system prompt, making them part of the AI's decision-making process.

## Development Commands

### Running the Trading System

**⚠️ IMPORTANT: Mock Mode (No API Keys Required)**

Test broker functionality without any API keys:
```bash
npm run test:broker
# This runs completely offline using MockBroker
# - No Binance API keys needed
# - No AI API keys needed
# - Tests all broker operations with simulated data
```

**Development mode** (run once with mock trading, requires AI API key):
```bash
npm run trading:dev
# or
npx tsx scripts/start-trading.ts --dev
# - Uses MockBroker (no real trades)
# - Requires DEEPSEEK_API_KEY or OPENROUTER_API_KEY
# - AI makes real decisions but executes mock trades
```

**Production mode** (continuous scheduler):
```bash
npm run trading:start
# or
npx tsx scripts/start-trading.ts
# - Uses real Binance API
# - Requires all API keys (Binance + AI)
# - Executes real trades (USE WITH CAUTION)
```

### Next.js Development

```bash
npm run dev        # Start dev server with Turbopack
npm run build      # Build for production with Turbopack
npm run start      # Start production server
```

### Testing

```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Generate coverage report
```

### Code Quality

```bash
npm run lint            # Run ESLint
npx tsc --noEmit        # Type check without emitting files
```

### Database

```bash
npx prisma generate     # Generate Prisma client
npx prisma migrate dev  # Run migrations in development
npx prisma studio       # Open Prisma Studio GUI
```

## Environment Configuration

Required environment variables (create `.env` file):

```bash
# Trading Mode
TRADING_MODE=paper                    # 'paper' (testnet) or 'live'

# Binance API
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret

# AI Model (choose one)
DEEPSEEK_API_KEY=your_key             # DeepSeek direct API
OPENROUTER_API_KEY=your_key           # OpenRouter (recommended)

# Risk Parameters (optional, have defaults)
MAX_LEVERAGE=10                        # Max 1-20x
MAX_COST_PER_TRADE=100                # USDT per trade
SYMBOL_WHITELIST=BTC/USDT,ETH/USDT,SOL/USDT
DEFAULT_STOP_LOSS_PERCENT=0.05        # 5%
DEFAULT_TAKE_PROFIT_PERCENT=0.10      # 10%

# Scheduler Settings
INTERVAL_MS=300000                     # 5 minutes
SYMBOLS=BTC/USDT,ETH/USDT             # Symbols to trade

# Database
DATABASE_URL=postgresql://...
```

## Important Implementation Notes

### Path Aliases

The project uses `@/*` to reference the project root:
```typescript
import { TradingAgent } from '@/lib/agent/trading-agent';
```

### AI SDK Integration

The system uses Vercel's AI SDK (`ai` package) with:
- `generateText` for agentic workflows with tool calling
- `generateObject` for structured output (legacy trading-flow.ts)
- DeepSeek R1 model for reasoning capabilities

Models are configured in `lib/agent/model.ts`:
- `deepseekR1`: Via OpenRouter (recommended for production)
- `deepseek`: Direct DeepSeek API
- `deepseekThinking`: DeepSeek Reasoner mode

### Exchange Integration

Uses CCXT library for Binance futures trading:
- Automatically switches between testnet (paper mode) and mainnet (live mode)
- Configured in `lib/trading/binance.ts`
- Default type: `future` (futures contracts, not spot)

### Testing Strategy

- Unit tests in `tests/unit/`
- Integration tests in `tests/integration/`
- Jest configured with `ts-jest` for TypeScript support
- Path alias `@/*` mapped in `jest.config.js`

## Database Schema

Prisma models track trading history:

- **Chat**: AI reasoning sessions
  - Stores `reasoning` (AI's thinking process)
  - Links to multiple `Trading` records

- **Trading**: Individual trade records
  - Symbol, operation (Buy/Sell/Hold), leverage, amount
  - Stop-loss and take-profit levels
  - Linked to parent Chat session

## Common Development Patterns

### Adding a New Tool

1. Create tool file in `lib/agent/tools/your-tool.tool.ts`
2. Define using `ai` SDK's `tool()` function with Zod schema
3. Export and add to `tradingTools` object in `lib/agent/tools/index.ts`
4. Update system prompt in `lib/agent/prompt.ts` to document the tool

### Modifying Risk Rules

Risk configuration is centralized in `lib/risk/config.ts`:
- All parameters load from environment variables with defaults
- `RiskGuard` class enforces rules in `validate()` method
- Risk constraints are automatically injected into AI system prompt

### Running Single Test

```bash
npx jest tests/unit/risk-config.test.ts
npx jest --testNamePattern="should validate leverage limits"
```

## Type Checking

The project uses TypeScript in strict mode. Run type checking before committing:

```bash
npx tsc --noEmit
```

For checking specific files:
```bash
npx tsc --noEmit lib/agent/tools/market-data.tool.ts
```


# TODO

⏺ 好的,让我深入分析当前架构,提出系统性的优化方案。让我先检查一些关键的交互模式和数据流:

⏺ Read(lib/agent/prompt.ts)
  ⎿  Read 73 lines

⏺ Search(pattern: "class|interface|type", path: "lib", output_mode: "content")
  ⎿  Found 42 lines (ctrl+o to expand)

⏺ Read(lib/marketdata/binance-provider.ts)
  ⎿  Read 78 lines

⏺ Read(lib/exchange/types.ts)
  ⎿  Read 120 lines

⏺ 完美! 现在我对整个架构有了全面的理解。让我为你提供系统性的架构优化方案:

  ---
  🏗️ 架构优化方案 (基于当前基础)

  核心发现

  你已经有一个良好的抽象层(lib/exchange/types.ts),定义了:
  - MarketDataProvider - 行情数据接口
  - TradingBroker - 交易执行接口
  - ExchangeAdapter - 适配器模式

  但问题是: 这些接口定义了却没有被充分使用! 现在的实现直接依赖 CCXT,没有走这层抽象。

  ---
  📊 架构优化建议 (分层)

  Tier 1: 紧急修复 (P0 - 交易安全)

  1.1 统一风控配置 ⚠️

  问题: 两个 risk.ts 文件导致配置不一致

  方案:
  删除: lib/config/risk.ts (旧版)
  保留: lib/risk/config.ts (新版)
  修改: lib/trading/binance.ts 和 lib/marketdata/binance-provider.ts 的导入路径

  影响面:
  - binance.ts - 改为从 lib/risk/config.ts 导入
  - binance-provider.ts - 同上

  ---
  1.2 修复 placeOrder 做空逻辑 ⚠️

  问题: AI 无法做空,只能平仓

  当前逻辑:
  if (side === 'sell') {
    await sell({ symbol, closePosition: true });  // ❌ 强制平仓
  }

  优化方案:
  if (side === 'sell') {
    // 先检查是否有仓位
    const position = await getCurrentPosition(symbol);

    if (position > 0) {
      // 有多头仓位 → 平仓
      await sell({ symbol, closePosition: true });
    } else {
      // 无仓位或有空头 → 开空仓
      await sell({
        symbol, cost, leverage, stopLoss, takeProfit,
        closePosition: false  // 明确标记不是平仓
      });
    }
  }

  额外优化: 增加 action 参数让 AI 明确指定意图:
  - open_long - 开多
  - close_long - 平多
  - open_short - 开空
  - close_short - 平空

  ---
  1.3 增强 Stop-Loss/Take-Profit 保护机制 ⚠️

  问题: 主订单成功但 SL/TP 失败,仓位无保护

  优化方案:
  1. 原子性保证: 使用 Binance 的 OCO (One-Cancels-the-Other) 订单
  2. 验证机制: 确认 SL/TP 创建成功
  3. 重试逻辑: 如果 SL/TP 失败,重试 3 次
  4. 回滚机制: 如果 SL/TP 始终失败,立即平仓主订单

  async function buyWithProtection(options: BuyOptions) {
    let mainOrderId: string | undefined;

    try {
      // 1. 下主订单
      const mainOrder = await placeMainOrder(options);
      mainOrderId = mainOrder.id;

      // 2. 必须设置 SL/TP (如果提供)
      if (options.stopLoss || options.takeProfit) {
        const protection = await placeProtectionOrdersWithRetry({
          mainOrderId,
          amount: mainOrder.amount,
          stopLoss: options.stopLoss,
          takeProfit: options.takeProfit,
          maxRetries: 3
        });

        if (!protection.success) {
          // SL/TP 失败 → 立即平仓
          await emergencyClose(symbol, mainOrder.amount);
          throw new Error('Protection orders failed, position closed');
        }
      }

      return { success: true, orderId: mainOrderId };
    } catch (error) {
      // 如果有主订单但保护失败,已经在上面平仓了
      throw error;
    }
  }

  ---
  Tier 2: 架构重构 (P1 - 提升可维护性)

  2.1 实现 Adapter Pattern (已定义但未使用)

  当前问题:
  - 代码直接依赖 CCXT 的 binance 实例
  - 难以切换到其他交易所或模拟环境
  - 无法 mock 测试

  优化方案: 完整实现抽象层

  架构分层:
  ┌─────────────────────────────────────┐
  │  TradingAgent (AI 决策层)            │
  └──────────────┬──────────────────────┘
                 │
          ┌──────▼──────┐
          │   Tools     │ (AI 工具层)
          └──────┬──────┘
                 │
     ┌───────────▼───────────────┐
     │  TradingBroker Interface  │ (抽象层)
     │  MarketDataProvider       │
     └───────────┬───────────────┘
                 │
         ┌───────▼────────┐
         │ BinanceBroker  │ (实现层)
         │ BinanceMarket  │
         └───────┬────────┘
                 │
           ┌─────▼─────┐
           │   CCXT    │ (第三方库)
           └───────────┘

  具体实现:

  // lib/broker/binance-broker.ts (新文件)
  export class BinanceBroker implements TradingBroker {
    constructor(private exchange: ccxt.binance) {}

    async placeOrder(params: OrderParams): Promise<OrderResult> {
      // 统一的订单逻辑
      // 集成 SL/TP 保护
      // 风控验证
    }

    async getPositions(symbols?: string[]) {
      // 标准化的仓位查询
    }

    // ... 其他方法
  }

  好处:
  - ✅ 可以轻松切换到其他交易所(OKX, Bybit)
  - ✅ 测试时可以 mock BinanceBroker
  - ✅ Paper trading 和 Live trading 使用相同代码路径
  - ✅ 集中管理交易逻辑,避免 buy.ts 和 sell.ts 重复代码

  ---
  2.2 Position Manager (仓位管理层)

  当前问题:
  - 仓位状态分散在多处查询
  - 没有统一的仓位追踪
  - AI 每次都要调用 getAccountInfo 获取仓位

  优化方案: 增加 PositionManager

  // lib/position/position-manager.ts (新文件)
  export class PositionManager {
    private positions: Map<string, Position> = new Map();

    constructor(private broker: TradingBroker) {}

    async syncPositions(symbols: string[]): Promise<void> {
      // 同步最新仓位
      const positions = await this.broker.getPositions(symbols);
      positions.forEach(p => this.positions.set(p.symbol, p));
    }

    getPosition(symbol: string): Position | null {
      return this.positions.get(symbol) || null;
    }

    hasPosition(symbol: string): boolean {
      return this.positions.has(symbol);
    }

    canOpenPosition(symbol: string, riskGuard: RiskGuard): boolean {
      // 检查是否超过最大持仓数
      // 检查是否超过单个币种最大仓位
    }
  }

  集成到 TradingAgent:
  export class TradingAgent {
    constructor(
      private riskGuard: RiskGuard,
      private logger: AuditLogger,
      private positionManager: PositionManager  // 新增
    ) {}

    private async processSymbol(symbol: string) {
      // 在每个周期开始时同步仓位
      await this.positionManager.syncPositions([symbol]);

      // AI 可以通过新的 tool 查询仓位
      // 减少重复的 API 调用
    }
  }

  好处:
  - ✅ 减少 API 调用次数
  - ✅ 提供缓存的仓位信息
  - ✅ 统一仓位逻辑管理
  - ✅ 未来可扩展为多币种组合管理

  ---
  2.3 集成 Prisma Database

  当前问题:
  - Schema 定义了但未使用
  - 只有文件日志,无法查询历史
  - Sharpe Ratio 等指标基于快照,不准确

  优化方案: 完整的数据持久化

  // lib/storage/trading-repository.ts (新文件)
  export class TradingRepository {
    constructor(private prisma: PrismaClient) {}

    async saveTradingSession(session: TradingSession) {
      // 保存 AI 决策会话
      return await this.prisma.chat.create({
        data: {
          reasoning: session.reasoning,
          userPrompt: session.toolCalls.toString(),
          tradings: {
            create: session.trades?.map(t => ({
              symbol: t.symbol,
              operation: t.operation,
              leverage: t.leverage,
              amount: t.amount,
              pricing: t.pricing,
              stopLoss: t.stopLoss,
              takeProfit: t.takeProfit
            }))
          }
        }
      });
    }

    async getHistoricalReturns(days: number): Promise<number[]> {
      // 查询历史收益率,用于准确计算 Sharpe Ratio
    }

    async getTradeHistory(symbol: string, limit: number) {
      // 查询该币种的历史交易
    }
  }

  集成到 AuditLogger:
  export class AuditLogger {
    constructor(
      private fileLogger: FileLogger,      // 保留文件日志
      private dbRepo: TradingRepository    // 新增数据库
    ) {}

    async logSession(session: TradingSession) {
      // 同时写文件和数据库
      await Promise.all([
        this.fileLogger.write(session),
        this.dbRepo.saveTradingSession(session)
      ]);
    }
  }

  好处:
  - ✅ 可查询的历史记录
  - ✅ 准确的性能指标计算
  - ✅ 支持回测和策略分析
  - ✅ 未来可以做 BI 分析

  ---
  Tier 3: 高级优化 (P2 - 提升性能和智能)

  3.1 Context Window 优化

  问题: AI 每次分析都要处理大量市场数据,浪费 tokens

  方案: Market State Summarizer

  // lib/agent/context-optimizer.ts (新文件)
  export class ContextOptimizer {
    summarizeMarketData(state: MarketState): string {
      // 智能摘要:只保留关键信号
      return `
      Price: $${state.current_price}
      Trend: ${this.analyzeTrend(state)} (EMA20: ${state.current_ema20})
      Momentum: ${this.analyzeMomentum(state)} (MACD: ${state.current_macd})
      Strength: ${this.analyzeStrength(state)} (RSI: ${state.current_rsi})
      
      Signal: ${this.getTradeSignal(state)}  // BULLISH/BEARISH/NEUTRAL
      Confidence: ${this.getConfidence(state)}  // 0-100
      `;
    }

    private getTradeSignal(state: MarketState): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
      // 预处理技术指标,生成明确信号
      let bullishCount = 0;
      let bearishCount = 0;

      if (state.current_rsi < 30) bullishCount++;
      if (state.current_rsi > 70) bearishCount++;
      // ... 更多指标分析

      if (bullishCount > bearishCount + 1) return 'BULLISH';
      if (bearishCount > bullishCount + 1) return 'BEARISH';
      return 'NEUTRAL';
    }
  }

  好处:
  - ✅ 减少 50-70% 的 prompt tokens
  - ✅ AI 决策更快
  - ✅ 保留关键信息,提升决策质量

  ---
  3.2 Multi-Agent 架构

  当前问题: 单个 AI agent 需要同时做分析、决策、执行

  优化方案: 专业化分工

  ┌─────────────────────────────────────────┐
  │  Orchestrator Agent (协调者)             │
  └────┬─────────────┬──────────────┬────────┘
       │             │              │
  ┌────▼──────┐ ┌───▼────────┐ ┌──▼────────┐
  │ Analyst   │ │ Risk       │ │ Executor  │
  │ Agent     │ │ Manager    │ │ Agent     │
  │           │ │ Agent      │ │           │
  │ (分析师)  │ │ (风控)     │ │ (执行)    │
  └───────────┘ └────────────┘ └───────────┘

  实现:
  // lib/agent/multi-agent-system.ts
  export class MultiAgentTradingSystem {
    private analyst: AnalystAgent;      // 专注技术分析
    private riskManager: RiskAgent;     // 专注风险评估
    private executor: ExecutorAgent;    // 专注订单执行

    async trade(symbol: string) {
      // 1. Analyst 分析市场
      const analysis = await this.analyst.analyze(symbol);

      // 2. Risk Manager 评估风险
      const riskAssessment = await this.riskManager.assess({
        symbol,
        analysis,
        currentPosition: this.positionManager.getPosition(symbol)
      });

      // 3. 如果通过风控,Executor 执行
      if (riskAssessment.approved) {
        return await this.executor.execute(riskAssessment.plan);
      }

      return { action: 'HOLD', reason: riskAssessment.reason };
    }
  }

  好处:
  - ✅ 每个 agent 的 prompt 更专注,效果更好
  - ✅ 可以使用不同的模型(分析用 R1,执行用便宜的 GPT-4o mini)
  - ✅ 更好的可解释性
  - ✅ 独立升级各模块

  ---
  3.3 策略可插拔化

  当前问题: 策略硬编码在 system prompt 中

  优化方案: Strategy Pattern

  // lib/strategy/base-strategy.ts
  export interface TradingStrategy {
    name: string;
    getSystemPrompt(riskGuard: RiskGuard): string;
    getDecisionCriteria(): string;
    validateSignal(signal: TradeSignal): boolean;
  }

  // lib/strategy/momentum-strategy.ts
  export class MomentumStrategy implements TradingStrategy {
    name = 'Momentum Trading';

    getSystemPrompt(riskGuard: RiskGuard): string {
      return `You are a momentum trader focusing on:
      - Strong trending markets
      - High volume confirmation
      - Quick entries and exits
      ...`;
    }
  }

  // lib/strategy/mean-reversion-strategy.ts
  export class MeanReversionStrategy implements TradingStrategy {
    name = 'Mean Reversion';

    getSystemPrompt(riskGuard: RiskGuard): string {
      return `You are a mean reversion trader focusing on:
      - Oversold/overbought conditions
      - Support/resistance levels
      - Counter-trend entries
      ...`;
    }
  }

  使用:
  const agent = new TradingAgent({
    strategy: new MomentumStrategy(),  // 可切换策略
    riskGuard,
    logger
  });

  好处:
  - ✅ 支持多种交易策略
  - ✅ A/B 测试不同策略
  - ✅ 根据市场条件动态切换策略
  - ✅ 用户可自定义策略

  ---
  3.4 实时监控和告警

  新增: Monitoring & Alerting 层

  // lib/monitoring/trade-monitor.ts
  export class TradeMonitor {
    async monitorPosition(position: Position) {
      // 监控仓位状态
      if (position.unrealized_pnl < position.risk_usd * -2) {
        await this.sendAlert({
          level: 'CRITICAL',
          message: `Position ${position.symbol} loss exceeds 2x risk!`
        });
      }
    }

    async trackPerformance() {
      // 性能追踪
      const metrics = {
        winRate: this.calculateWinRate(),
        profitFactor: this.calculateProfitFactor(),
        maxDrawdown: this.calculateMaxDrawdown()
      };

      // 如果性能下降,暂停交易
      if (metrics.winRate < 0.4) {
        await this.pauseTrading('Low win rate detected');
      }
    }
  }

  ---
  Tier 4: 代码质量优化 (P3)

  4.1 移除 as any 类型断言

  方案: 正确定义 AI SDK 的 tool 类型

  // lib/agent/tools/market-data.tool.ts
  import { tool } from 'ai';
  import { z } from 'zod';

  const marketDataSchema = z.object({
    symbol: z.string().describe("Trading pair symbol"),
  });

  type MarketDataParams = z.infer<typeof marketDataSchema>;

  export const marketDataTool = tool({
    description: `Get real-time market data...`,
    parameters: marketDataSchema,
    execute: async (params: MarketDataParams) => {  // ✅ 正确类型
      // ...
    },
  });

  ---
  4.2 清理遗留代码

  删除:
  - lib/ai/trading-flow.ts - 旧的 generateObject 实现
  - lib/ai/prompt.ts - 如果有独立的 prompt 文件

  统一:
  - 所有 prompt 管理在 lib/agent/prompt.ts

  ---
  📋 优化实施优先级总结

  | 优先级     | 项目                 | 工作量 | 影响  | 风险  |
  |---------|--------------------|-----|-----|-----|
  | 🔴 P0-1 | 统一风控配置             | 1h  | 高   | 高   |
  | 🔴 P0-2 | 修复做空逻辑             | 2h  | 高   | 高   |
  | 🔴 P0-3 | SL/TP 保护机制         | 4h  | 高   | 高   |
  | 🟡 P1-1 | Adapter Pattern 实现 | 8h  | 中   | 中   |
  | 🟡 P1-2 | Position Manager   | 4h  | 中   | 低   |
  | 🟡 P1-3 | Prisma 集成          | 6h  | 中   | 低   |
  | 🟢 P2-1 | Context 优化         | 4h  | 低   | 低   |
  | 🟢 P2-2 | Multi-Agent        | 16h | 中   | 中   |
  | 🟢 P2-3 | 策略可插拔              | 8h  | 低   | 低   |
  | 🟢 P2-4 | 监控告警               | 6h  | 低   | 低   |
  | ⚪ P3-1  | 类型安全               | 4h  | 低   | 低   |
  | ⚪ P3-2  | 代码清理               | 2h  | 低   | 低   |

  ---
  🎯 建议实施路径

  阶段 1: 安全第一 (Week 1)

  1. 统一风控配置
  2. 修复做空逻辑
  3. 增强 SL/TP 保护

  目标: 确保系统安全可用

  ---
  阶段 2: 架构升级 (Week 2-3)

  4. 实现 Adapter Pattern
  5. 增加 Position Manager
  6. 集成 Prisma Database

  目标: 提升可维护性和扩展性

  ---
  阶段 3: 性能优化 (Week 4-5)

  7. Context Window 优化
  8. (可选) Multi-Agent 架构
  9. 策略可插拔化

  目标: 提升 AI 决策质量和效率

  ---
  阶段 4: 生产就绪 (Week 6)

  10. 监控告警系统
  11. 代码质量优化
  12. 完整测试覆盖

  目标: 达到生产级别

  ---
  💬 你的选择?

  我可以帮你:

  1. 立即开始 P0 修复 - 修复最严重的 3 个问题
  2. 完整重构计划 - 分阶段实施所有优化
  3. 聚焦某个具体优化 - 比如深入讨论 Multi-Agent 设计
  4. 先做风险评估 - 评估当前系统在实盘的风险

  你想从哪里开始?



