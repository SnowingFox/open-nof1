export interface RiskConfig {
  // 交易模式：纸盘或实盘
  mode: 'paper' | 'live';

  // 最大杠杆倍数
  maxLeverage: number;

  // 单笔交易最大成本（USDT）
  maxCostPerTrade: number;

  // 允许交易的币种白名单
  symbolWhitelist: string[];

  // 滑点容忍度（百分比）
  slippageTolerance: number;

  // 默认止损百分比（相对于入场价格）
  defaultStopLossPercent: number;

  // 默认止盈百分比（相对于入场价格）
  defaultTakeProfitPercent: number;

  // 操作冷却期（毫秒）- 防止频繁反向操作
  cooldownMs: number;

  // 调度间隔（毫秒）
  intervalMs: number;

  // 时间抖动范围（毫秒）- 防止同时触发
  jitterMs: number;

  // 支持的币种列表（用于多币种轮询）
  symbols: string[];
}

// 默认配置
const DEFAULT_RISK_CONFIG: RiskConfig = {
  mode: (process.env.TRADING_MODE as 'paper' | 'live') || 'paper',
  maxLeverage: parseInt(process.env.MAX_LEVERAGE || '10'),
  maxCostPerTrade: parseFloat(process.env.MAX_COST_PER_TRADE || '100'),
  symbolWhitelist: (process.env.SYMBOL_WHITELIST || 'BTC/USDT,ETH/USDT,SOL/USDT,ADA/USDT,DOGE/USDT').split(','),
  slippageTolerance: parseFloat(process.env.SLIPPAGE_TOLERANCE || '0.01'), // 1%
  defaultStopLossPercent: parseFloat(process.env.DEFAULT_STOP_LOSS_PERCENT || '0.05'), // 5%
  defaultTakeProfitPercent: parseFloat(process.env.DEFAULT_TAKE_PROFIT_PERCENT || '0.10'), // 10%
  cooldownMs: parseInt(process.env.COOLDOWN_MS || '300000'), // 5分钟
  intervalMs: parseInt(process.env.INTERVAL_MS || '300000'), // 5分钟
  jitterMs: parseInt(process.env.JITTER_MS || '15000'), // ±15秒
  symbols: (process.env.SYMBOLS || 'BTC/USDT,ETH/USDT').split(','),
};

// 从环境变量合并配置
export function getRiskConfig(): RiskConfig {
  return {
    ...DEFAULT_RISK_CONFIG,
    mode: (process.env.TRADING_MODE as 'paper' | 'live') || DEFAULT_RISK_CONFIG.mode,
    maxLeverage: parseInt(process.env.MAX_LEVERAGE || DEFAULT_RISK_CONFIG.maxLeverage.toString()),
    maxCostPerTrade: parseFloat(process.env.MAX_COST_PER_TRADE || DEFAULT_RISK_CONFIG.maxCostPerTrade.toString()),
    symbolWhitelist: (process.env.SYMBOL_WHITELIST || DEFAULT_RISK_CONFIG.symbolWhitelist.join(',')).split(','),
    slippageTolerance: parseFloat(process.env.SLIPPAGE_TOLERANCE || DEFAULT_RISK_CONFIG.slippageTolerance.toString()),
    defaultStopLossPercent: parseFloat(process.env.DEFAULT_STOP_LOSS_PERCENT || DEFAULT_RISK_CONFIG.defaultStopLossPercent.toString()),
    defaultTakeProfitPercent: parseFloat(process.env.DEFAULT_TAKE_PROFIT_PERCENT || DEFAULT_RISK_CONFIG.defaultTakeProfitPercent.toString()),
    cooldownMs: parseInt(process.env.COOLDOWN_MS || DEFAULT_RISK_CONFIG.cooldownMs.toString()),
    intervalMs: parseInt(process.env.INTERVAL_MS || DEFAULT_RISK_CONFIG.intervalMs.toString()),
    jitterMs: parseInt(process.env.JITTER_MS || DEFAULT_RISK_CONFIG.jitterMs.toString()),
    symbols: (process.env.SYMBOLS || DEFAULT_RISK_CONFIG.symbols.join(',')).split(','),
  };
}

// 导出默认配置实例
export const riskConfig = getRiskConfig();
