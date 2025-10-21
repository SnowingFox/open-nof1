#!/usr/bin/env tsx

/**
 * Broker Testing Script
 *
 * Test broker functionality without requiring AI API keys
 * This script demonstrates mock broker operations
 *
 * Usage: npx tsx scripts/test-broker.ts
 */

import { createBroker } from '@/lib/broker/broker-factory';
import { PositionManager } from '@/lib/position/position-manager';
import { RiskGuard } from '@/lib/risk/risk-guard';
import { getRiskConfig } from '@/lib/risk/config';

async function testBroker() {
  console.log('\n🧪 Broker Testing Script');
  console.log('='.repeat(60));
  console.log('Testing MockBroker functionality without AI\n');

  // Create mock broker
  const broker = createBroker('mock');
  const positionManager = new PositionManager(broker);
  const config = getRiskConfig();
  const riskGuard = new RiskGuard(config);

  try {
    // Test 1: Get account info
    console.log('📊 Test 1: Getting account information...');
    const accountInfo = await broker.getAccountInfo();
    console.log(`✓ Balance: $${accountInfo.balance.toFixed(2)}`);
    console.log(`✓ Available Margin: $${accountInfo.availableMargin.toFixed(2)}`);
    console.log(`✓ Used Margin: $${accountInfo.usedMargin.toFixed(2)}\n`);

    // Test 2: Open a long position
    console.log('📝 Test 2: Opening long position...');
    const openLongResult = await broker.placeOrder({
      symbol: 'BTC/USDT',
      side: 'buy',
      type: 'market',
      cost: 100,
      leverage: 5,
      stopLoss: 95000,
      takeProfit: 105000,
    });

    if (openLongResult.success) {
      console.log(`✓ Order placed successfully`);
      console.log(`✓ Order ID: ${openLongResult.orderId}\n`);
    } else {
      console.log(`✗ Order failed: ${openLongResult.error}\n`);
    }

    // Test 3: Check positions
    console.log('📋 Test 3: Checking positions...');
    await positionManager.syncPositions(['BTC/USDT']);
    const positions = positionManager.getAllPositions();
    console.log(`✓ Found ${positions.length} position(s)`);

    if (positions.length > 0) {
      const pos = positions[0];
      console.log(`✓ ${pos.symbol} ${pos.side.toUpperCase()} ${pos.leverage}x`);
      console.log(`✓ Entry: $${pos.entryPrice.toFixed(2)}`);
      console.log(`✓ Mark: $${pos.markPrice.toFixed(2)}`);
      console.log(`✓ PnL: $${pos.pnl.toFixed(2)}\n`);
    }

    // Test 4: Risk guard validation
    console.log('🛡️  Test 4: Testing risk guard...');
    const riskCheck = riskGuard.validate({
      symbol: 'BTC/USDT',
      cost: 100,
      leverage: 5,
    });

    if (riskCheck.allowed) {
      console.log('✓ Risk check passed\n');
    } else {
      console.log(`✗ Risk check failed: ${riskCheck.reason}\n`);
    }

    // Test 5: Close position
    if (positions.length > 0) {
      console.log('📝 Test 5: Closing position...');
      const closeResult = await broker.placeOrder({
        symbol: 'BTC/USDT',
        side: 'sell',
        type: 'market',
        amount: positions[0].amount,
        reduceOnly: true,
      });

      if (closeResult.success) {
        console.log(`✓ Position closed successfully`);
        console.log(`✓ Order ID: ${closeResult.orderId}\n`);
      } else {
        console.log(`✗ Close failed: ${closeResult.error}\n`);
      }
    }

    // Test 6: Try opening short position
    console.log('📝 Test 6: Opening short position on ETH/USDT...');
    const openShortResult = await broker.placeOrder({
      symbol: 'ETH/USDT',
      side: 'sell',
      type: 'market',
      cost: 50,
      leverage: 3,
      stopLoss: 3900,
      takeProfit: 3600,
    });

    if (openShortResult.success) {
      console.log(`✓ Short position opened`);
      console.log(`✓ Order ID: ${openShortResult.orderId}\n`);
    } else {
      console.log(`✗ Short failed: ${openShortResult.error}\n`);
    }

    // Final status
    console.log('📊 Final account status:');
    const finalAccount = await broker.getAccountInfo();
    await positionManager.forceSync();
    const finalPositions = positionManager.getAllPositions();

    console.log(`Balance: $${finalAccount.balance.toFixed(2)}`);
    console.log(`Open positions: ${finalPositions.length}`);
    console.log(`Total PnL: $${positionManager.getTotalUnrealizedPnL().toFixed(2)}`);

    console.log('\n✅ All broker tests completed successfully!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testBroker().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
