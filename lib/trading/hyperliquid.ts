import ccxt from "ccxt";

export const hyperliquid = new ccxt.hyperliquid({
  privateKey: process.env.HYPERLIQUID_PRIVATE_KEY,
  walletAddress: process.env.HYPERLIQUID_WALLET_ADDRESS,
  enableRateLimit: true,
  options: {
    sandboxMode: true,
    // Hyperliquid-specific options
    defaultType: "swap", // For perpetual contracts
  }
});