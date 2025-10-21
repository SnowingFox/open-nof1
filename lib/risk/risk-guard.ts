import { RiskConfig, getRiskConfig } from './config';

export interface OrderParams {
  symbol: string;
  cost: number;
  leverage: number;
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
}

export class RiskGuard {
  private config: RiskConfig;

  constructor(config?: RiskConfig) {
    this.config = config || getRiskConfig();
  }

  /**
   * 验证订单是否符合风控规则
   */
  validate(params: OrderParams): ValidationResult {
    // 1. 检查币种白名单
    const normalizedSymbol = params.symbol.includes('/') ? params.symbol : `${params.symbol}/USDT`;
    if (!this.config.symbolWhitelist.includes(normalizedSymbol)) {
      return {
        allowed: false,
        reason: `Symbol ${params.symbol} is not in whitelist. Allowed: ${this.config.symbolWhitelist.join(', ')}`,
      };
    }

    // 2. 检查杠杆限制
    if (params.leverage < 1 || params.leverage > this.config.maxLeverage) {
      return {
        allowed: false,
        reason: `Leverage ${params.leverage}x exceeds limit (1-${this.config.maxLeverage}x)`,
      };
    }

    // 3. 检查单笔成本限制
    if (params.cost <= 0 || params.cost > this.config.maxCostPerTrade) {
      return {
        allowed: false,
        reason: `Cost $${params.cost} exceeds limit ($${this.config.maxCostPerTrade} per trade)`,
      };
    }

    return { allowed: true };
  }

  /**
   * 获取配置参数（供 Prompt 使用）
   */
  getMaxLeverage(): number {
    return this.config.maxLeverage;
  }

  getMaxCost(): number {
    return this.config.maxCostPerTrade;
  }

  getWhitelist(): string[] {
    return this.config.symbolWhitelist;
  }

  getMode(): 'paper' | 'live' {
    return this.config.mode;
  }
}

// 导出单例
export const riskGuard = new RiskGuard();
