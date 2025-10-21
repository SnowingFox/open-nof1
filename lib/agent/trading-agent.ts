import { generateText, stepCountIs } from 'ai';
import { deepseekR1 } from './model';
import { getSystemPrompt } from './prompt';
import { tradingTools } from './tools';
import { RiskGuard } from '@/lib/risk/risk-guard';
import { AuditLogger, TradingSession } from '@/lib/storage/audit-logger';

export class TradingAgent {
  constructor(
    private riskGuard: RiskGuard,
    private logger: AuditLogger
  ) {}

  /**
   * 执行交易任务（多个币种）
   */
  async run(symbols: string[]): Promise<void> {
    console.log(`\n🤖 Trading Agent starting for: ${symbols.join(', ')}`);

    for (const symbol of symbols) {
      await this.processSymbol(symbol);

      // 币种间延迟
      if (symbols.length > 1) {
        await this.sleep(1000);
      }
    }

    console.log(`✅ Trading Agent completed\n`);
  }

  /**
   * 处理单个币种的交易
   */
  private async processSymbol(symbol: string): Promise<void> {
    const startTime = Date.now();
    console.log(`\n📊 Processing ${symbol}...`);

    try {
      // 调用 AI，让它自主执行整个流程
      const result = await generateText({
        model: deepseekR1,
        system: getSystemPrompt(this.riskGuard),
        prompt: this.buildPrompt(symbol),
        tools: tradingTools,
        stopWhen: stepCountIs(15),  // 允许 AI 多步推理和工具调用 (最多15步)
      });

      // 提取推理过程
      const reasoning = result.text;
      const toolCalls = result.toolCalls || [];

      console.log(`\n💭 AI Reasoning:\n${reasoning.substring(0, 200)}...\n`);
      console.log(`🔧 Tool Calls: ${toolCalls.length}`);

      // 记录会话
      const session: TradingSession = {
        symbol,
        startTime,
        endTime: Date.now(),
        reasoning,
        toolCalls,
        success: true,
      };

      await this.logger.logSession(session);

    } catch (error) {
      console.error(`❌ Error processing ${symbol}:`, error);

      const session: TradingSession = {
        symbol,
        startTime,
        endTime: Date.now(),
        reasoning: 'Error occurred',
        toolCalls: [],
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };

      await this.logger.logSession(session);
    }
  }

  /**
   * 构建给 AI 的 Prompt
   */
  private buildPrompt(symbol: string): string {
    return `Your task: Analyze ${symbol} and execute an appropriate trading decision.

Process:
1. Call getMarketData('${symbol}') to fetch current market state
2. Call getAccountInfo(['${symbol}']) to check your account balance and positions
3. Analyze the data using technical analysis
4. Decide: BUY, SELL, or HOLD
5. If trading, call placeOrder() with proper parameters
6. Explain your reasoning step by step

Remember:
- Always check market data before deciding
- Always check your account balance before placing orders
- Use proper risk management (stop-loss, take-profit)
- Explain your analysis clearly

Begin your analysis now.`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
