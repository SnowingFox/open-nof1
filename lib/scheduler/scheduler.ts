import { TradingAgent } from '@/lib/agent/trading-agent';
import { getRiskConfig } from '@/lib/risk/config';

export class Scheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private runCount = 0;

  constructor(
    private agent: TradingAgent,
    private symbols: string[],
    private intervalMs: number = getRiskConfig().intervalMs
  ) {}

  /**
   * 启动调度器
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️  Scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Trading Scheduler Started`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Symbols: ${this.symbols.join(', ')}`);
    console.log(`Interval: ${this.intervalMs / 1000}s`);
    console.log(`${'='.repeat(60)}\n`);

    // 立即执行一次
    this.executeCycle();

    // 设置定时器
    this.intervalId = setInterval(() => {
      this.executeCycle();
    }, this.intervalMs);

    // 注册优雅停止
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🛑 Stopping Trading Scheduler...`);
    console.log(`Total runs: ${this.runCount}`);
    console.log(`${'='.repeat(60)}\n`);

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    process.exit(0);
  }

  /**
   * 执行一次交易周期
   */
  private async executeCycle(): Promise<void> {
    this.runCount++;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`⏰ Cycle #${this.runCount} - ${new Date().toISOString()}`);
    console.log(`${'='.repeat(60)}`);

    try {
      await this.agent.run(this.symbols);
    } catch (error) {
      console.error('❌ Trading cycle failed:', error);
    }

    console.log(`\n⏰ Next cycle in ${this.intervalMs / 1000}s...\n`);
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      runCount: this.runCount,
      symbols: this.symbols,
      intervalMs: this.intervalMs,
    };
  }
}
