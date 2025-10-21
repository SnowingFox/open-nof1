import { TradingBroker } from '../exchange/types';
import { BinanceBroker, createBinanceBroker } from './binance-broker';
import { MockBroker, createMockBroker } from './mock-broker';
import { getRiskConfig } from '../risk/config';

export type BrokerMode = 'mock' | 'paper' | 'live';

/**
 * Factory to create the appropriate broker based on configuration
 */
export function createBroker(mode?: BrokerMode): TradingBroker {
  const config = getRiskConfig();
  const brokerMode = mode || (process.env.BROKER_MODE as BrokerMode) || config.mode;

  console.log(`\n🏭 Creating broker in ${brokerMode.toUpperCase()} mode...`);

  switch (brokerMode) {
    case 'mock':
      // Mock mode: full simulation, no API calls
      console.log(`✅ Using MockBroker (simulation mode)`);
      return createMockBroker();

    case 'paper':
      // Paper trading: use Binance testnet
      console.log(`✅ Using BinanceBroker (testnet/paper trading)`);
      return createBinanceBroker();

    case 'live':
      // Live trading: real Binance futures
      console.log(`⚠️  Using BinanceBroker (LIVE TRADING - REAL MONEY)`);
      console.log(`⚠️  Please ensure you have verified all settings!`);
      return createBinanceBroker();

    default:
      console.warn(`Unknown broker mode: ${brokerMode}, falling back to mock`);
      return createMockBroker();
  }
}

/**
 * Get the broker mode from environment
 */
export function getBrokerMode(): BrokerMode {
  const envMode = process.env.BROKER_MODE as BrokerMode;
  const config = getRiskConfig();

  // If BROKER_MODE is explicitly set, use it
  if (envMode === 'mock' || envMode === 'paper' || envMode === 'live') {
    return envMode;
  }

  // Otherwise fall back to TRADING_MODE
  return config.mode === 'live' ? 'live' : 'paper';
}
