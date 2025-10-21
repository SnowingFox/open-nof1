import { TradingBroker } from '@/lib/exchange/types';
import { PositionManager } from '@/lib/position/position-manager';
import { createBroker } from '@/lib/broker/broker-factory';

/**
 * Shared instances for trading agent and tools
 * This allows tools to access the same broker and position manager
 */

let sharedBroker: TradingBroker | null = null;
let sharedPositionManager: PositionManager | null = null;

/**
 * Initialize shared broker instance
 */
export function initializeSharedBroker(broker?: TradingBroker): TradingBroker {
  if (!broker) {
    broker = createBroker();
  }
  sharedBroker = broker;
  return broker;
}

/**
 * Get or create shared broker instance
 */
export function getSharedBroker(): TradingBroker {
  if (!sharedBroker) {
    sharedBroker = createBroker();
  }
  return sharedBroker;
}

/**
 * Initialize shared position manager
 */
export function initializeSharedPositionManager(broker: TradingBroker): PositionManager {
  sharedPositionManager = new PositionManager(broker);
  return sharedPositionManager;
}

/**
 * Get shared position manager (must be initialized first)
 */
export function getSharedPositionManager(): PositionManager {
  if (!sharedPositionManager) {
    const broker = getSharedBroker();
    sharedPositionManager = new PositionManager(broker);
  }
  return sharedPositionManager;
}

/**
 * Reset shared instances (for testing)
 */
export function resetSharedInstances(): void {
  sharedBroker = null;
  sharedPositionManager = null;
}
