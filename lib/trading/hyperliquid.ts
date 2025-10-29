import ccxt from "ccxt";

export const hyperliquid = new ccxt.hyperliquid({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY,
  walletAddress: process.env.HYPERLIQUID_WALLET_ADDRESS,
  enableRateLimit: true,
  options: {
    // Hyperliquid-specific options
    defaultType: "swap", // For perpetual contracts
  }
});

// IMPORTANT: Use setSandboxMode() method to properly configure testnet
// This ensures both the API endpoint AND signature scheme match the network
hyperliquid.setSandboxMode(true);