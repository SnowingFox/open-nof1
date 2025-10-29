import { hyperliquid } from "../lib/trading/hyperliquid";

async function checkBalance() {
  try {
    console.log("Fetching account balance from Hyperliquid...");
    console.log("Wallet Address (from .env):", process.env.HYPERLIQUID_WALLET_ADDRESS);
    console.log("Private Key (from .env):", process.env.HYPERLIQUID_PRIVATE_KEY ? "Set (hidden)" : "NOT SET");
    console.log("Sandbox Mode:", hyperliquid.options.sandboxMode ? "ENABLED (testnet)" : "DISABLED (mainnet)");

    // Check the actual URLs being used
    console.log("\n=== Network Configuration ===");
    console.log("API URLs:", JSON.stringify(hyperliquid.urls, null, 2));
    console.log("");

    // Fetch balance
    const balance = await hyperliquid.fetchBalance({
      user: process.env.HYPERLIQUID_WALLET_ADDRESS,
    });

    console.log("=== Account Balance ===");
    console.log(JSON.stringify(balance, null, 2));
    console.log("");

    // Check USDC specifically
    if (balance.USDC) {
      console.log("USDC Balance:");
      console.log("  Total:", balance.USDC.total || 0);
      console.log("  Free:", balance.USDC.free || 0);
      console.log("  Used:", balance.USDC.used || 0);
    } else {
      console.log("No USDC balance found");
    }

    // Check for other currencies
    console.log("\nAll currencies:");
    Object.keys(balance).forEach((currency) => {
      if (currency !== "info" && currency !== "free" && currency !== "used" && currency !== "total") {
        const curr = balance[currency];
        if (curr && curr.total !== undefined) {
          console.log(`  ${currency}: ${curr.total}`);
        }
      }
    });
  } catch (error) {
    console.error("Error fetching balance:", error);
  }
}

checkBalance();
