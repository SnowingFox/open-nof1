import { getRiskConfig } from '../../lib/config/risk';

// Mock environment variables
const originalEnv = process.env;

describe('RiskConfig', () => {
  beforeEach(() => {
    // Reset environment variables before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getRiskConfig', () => {
    it('should return default configuration when no env vars are set', () => {
      const config = getRiskConfig();

      expect(config.mode).toBe('paper');
      expect(config.maxLeverage).toBe(10);
      expect(config.maxCostPerTrade).toBe(100);
      expect(config.symbolWhitelist).toEqual(['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT', 'DOGE/USDT']);
      expect(config.slippageTolerance).toBe(0.01);
      expect(config.defaultStopLossPercent).toBe(0.05);
      expect(config.defaultTakeProfitPercent).toBe(0.10);
      expect(config.cooldownMs).toBe(300000);
      expect(config.intervalMs).toBe(300000);
      expect(config.jitterMs).toBe(15000);
      expect(config.symbols).toEqual(['BTC/USDT', 'ETH/USDT']);
    });

    it('should override configuration with environment variables', () => {
      process.env.TRADING_MODE = 'live';
      process.env.MAX_LEVERAGE = '15';
      process.env.MAX_COST_PER_TRADE = '500';
      process.env.SYMBOL_WHITELIST = 'BTC/USDT,ETH/USDT,DOGE/USDT';
      process.env.SLIPPAGE_TOLERANCE = '0.02';
      process.env.DEFAULT_STOP_LOSS_PERCENT = '0.03';
      process.env.DEFAULT_TAKE_PROFIT_PERCENT = '0.08';
      process.env.COOLDOWN_MS = '600000';
      process.env.INTERVAL_MS = '600000';
      process.env.JITTER_MS = '30000';
      process.env.SYMBOLS = 'BTC/USDT,ETH/USDT,SOL/USDT';

      const config = getRiskConfig();

      expect(config.mode).toBe('live');
      expect(config.maxLeverage).toBe(15);
      expect(config.maxCostPerTrade).toBe(500);
      expect(config.symbolWhitelist).toEqual(['BTC/USDT', 'ETH/USDT', 'DOGE/USDT']);
      expect(config.slippageTolerance).toBe(0.02);
      expect(config.defaultStopLossPercent).toBe(0.03);
      expect(config.defaultTakeProfitPercent).toBe(0.08);
      expect(config.cooldownMs).toBe(600000);
      expect(config.intervalMs).toBe(600000);
      expect(config.jitterMs).toBe(30000);
      expect(config.symbols).toEqual(['BTC/USDT', 'ETH/USDT', 'SOL/USDT']);
    });

    it('should handle partial environment variable overrides', () => {
      process.env.MAX_LEVERAGE = '20';

      const config = getRiskConfig();

      // Only maxLeverage should be overridden
      expect(config.maxLeverage).toBe(20);
      // Others should keep defaults
      expect(config.mode).toBe('paper');
      expect(config.maxCostPerTrade).toBe(100);
    });

    it('should parse numeric environment variables correctly', () => {
      process.env.MAX_LEVERAGE = '5';
      process.env.MAX_COST_PER_TRADE = '200.5';
      process.env.SLIPPAGE_TOLERANCE = '0.005';

      const config = getRiskConfig();

      expect(config.maxLeverage).toBe(5);
      expect(config.maxCostPerTrade).toBe(200.5);
      expect(config.slippageTolerance).toBe(0.005);
    });

    it('should handle invalid numeric values gracefully', () => {
      process.env.MAX_LEVERAGE = 'invalid';
      process.env.MAX_COST_PER_TRADE = 'NaN';

      // Should not throw, but may have unexpected values
      expect(() => getRiskConfig()).not.toThrow();

      const config = getRiskConfig();
      expect(typeof config.maxLeverage).toBe('number');
      expect(typeof config.maxCostPerTrade).toBe('number');
    });
  });
});
