#!/usr/bin/env tsx

/**
 * AI Trading System Launcher
 *
 * Usage:
 * - Production mode (scheduler): npx tsx scripts/start-trading.ts
 * - Development mode (run once): npx tsx scripts/start-trading.ts --dev
 */

import { TradingAgent } from '@/lib/agent/trading-agent';
import { RiskGuard } from '@/lib/risk/risk-guard';
import { AuditLogger } from '@/lib/storage/audit-logger';
import { Scheduler } from '@/lib/scheduler/scheduler';
import { getRiskConfig } from '@/lib/risk/config';
import { createBroker } from '@/lib/broker/broker-factory';
import { initializeSharedBroker, initializeSharedPositionManager } from '@/lib/agent/shared-instances';

async function main() {
  // Load configuration
  const config = getRiskConfig();

  // Determine broker mode from config or environment
  const brokerMode = process.argv.includes('--dev')
    ? 'mock'
    : config.mode === 'paper'
    ? 'paper'
    : 'live';

  console.log('\n🤖 AI Trading Agent');
  console.log(`${'='.repeat(60)}`);
  console.log(`Mode: ${config.mode.toUpperCase()}`);
  console.log(`Broker: ${brokerMode.toUpperCase()}`);
  console.log(`Symbols: ${config.symbols.join(', ')}`);
  console.log(`Interval: ${config.intervalMs / 1000}s`);
  console.log(`Max Leverage: ${config.maxLeverage}x`);
  console.log(`Max Cost: $${config.maxCostPerTrade} per trade`);
  console.log(`${'='.repeat(60)}\n`);

  // Check required environment variables (skip for mock mode)
  if (brokerMode !== 'mock') {
    // Check Binance API keys for non-mock modes
    if (!process.env.BINANCE_API_KEY || !process.env.BINANCE_API_SECRET) {
      console.error('❌ Missing required environment variables:');
      console.error('   BINANCE_API_KEY');
      console.error('   BINANCE_API_SECRET');
      console.error('');
      console.error('Please set these in your .env file');
      process.exit(1);
    }

    // Check AI API keys for non-mock modes
    if (!process.env.DEEPSEEK_API_KEY && !process.env.OPENROUTER_API_KEY) {
      console.error('❌ Missing required environment variables:');
      console.error('   DEEPSEEK_API_KEY or OPENROUTER_API_KEY');
      console.error('');
      console.error('Please set these in your .env file');
      process.exit(1);
    }
  } else {
    // Mock mode - no API keys required
    console.log('ℹ️  Mock mode: No API keys required');
    console.log('⚠️  Note: AI calls will fail but broker operations will work\n');
  }

  // Warning for live trading
  if (config.mode === 'live' && brokerMode === 'live') {
    console.log('⚠️  LIVE TRADING MODE!');
    console.log('Please ensure:');
    console.log('- API keys have correct permissions');
    console.log('- Sufficient balance in account');
    console.log('- Risk parameters are properly configured');
    console.log('');
    console.log('Press Ctrl+C to stop\n');
  } else if (brokerMode === 'mock') {
    console.log('🧪 MOCK MODE: No real trades will be executed');
    console.log('All trades are simulated for testing\n');
  }

  // Initialize broker and shared instances
  const broker = createBroker(brokerMode as 'mock' | 'paper' | 'live');
  initializeSharedBroker(broker);
  initializeSharedPositionManager(broker);

  // Initialize components
  const riskGuard = new RiskGuard(config);
  const logger = new AuditLogger();
  const agent = new TradingAgent(broker, riskGuard, logger);

  // Check command line arguments
  const args = process.argv.slice(2);

  if (args.includes('--dev') || args.includes('--once')) {
    // Development mode: run once
    console.log('🔧 Dev Mode: Running once\n');
    await agent.run(config.symbols);
    console.log('\n✅ Dev mode completed');
    process.exit(0);
  } else {
    // Production mode: start scheduler
    const scheduler = new Scheduler(agent, config.symbols, config.intervalMs);
    scheduler.start();
  }
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
