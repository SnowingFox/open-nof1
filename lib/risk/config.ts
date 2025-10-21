export interface RiskConfig {
  mode: 'paper' | 'live';
  maxLeverage: number;
  maxCostPerTrade: number;
  symbolWhitelist: string[];
  slippageTolerance: number;
  defaultStopLossPercent: number;
  defaultTakeProfitPercent: number;
  cooldownMs: number;
  intervalMs: number;
  jitterMs: number;
  symbols: string[];
}

export function getRiskConfig(): RiskConfig {
  return {
    mode: (process.env.TRADING_MODE as 'paper' | 'live') || 'paper',
    maxLeverage: parseInt(process.env.MAX_LEVERAGE || '10'),
    maxCostPerTrade: parseFloat(process.env.MAX_COST_PER_TRADE || '100'),
    symbolWhitelist: (process.env.SYMBOL_WHITELIST || 'BTC/USDT,ETH/USDT,SOL/USDT').split(','),
    slippageTolerance: parseFloat(process.env.SLIPPAGE_TOLERANCE || '0.01'),
    defaultStopLossPercent: parseFloat(process.env.DEFAULT_STOP_LOSS_PERCENT || '0.05'),
    defaultTakeProfitPercent: parseFloat(process.env.DEFAULT_TAKE_PROFIT_PERCENT || '0.10'),
    cooldownMs: parseInt(process.env.COOLDOWN_MS || '300000'),
    intervalMs: parseInt(process.env.INTERVAL_MS || '300000'),
    jitterMs: parseInt(process.env.JITTER_MS || '15000'),
    symbols: (process.env.SYMBOLS || 'BTC/USDT,ETH/USDT').split(','),
  };
}
