import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Map tickers/aliases to your Symbol enum strings
function mapSymbol(input?: string): 'BTC'|'ETH'|'BNB'|'SOL'|'DOGE' {
  if (!input) return 'BTC';
  const t = input.toUpperCase();
  if (t.startsWith('BTC')) return 'BTC';
  if (t.startsWith('ETH')) return 'ETH';
  if (t.startsWith('BNB')) return 'BNB';
  if (t.startsWith('SOL')) return 'SOL';
  if (t.startsWith('DOGE')) return 'DOGE';
  return 'BTC';
}

/** Minimal row for Metrics (required: name, model) */
export async function debugWriteMetrics(name: string) {
  try {
    await prisma.metrics.create({
      data: {
        name,
        // ModelType enum values (from /api/debug/schema): Deepseek | DeepseekThinking | Qwen | Doubao
        model: 'Deepseek' as any,
      },
    });
    return { ok: true };
  } catch (e) {
    console.error('[DEBUG WRITE] Metrics failed:', e);
    return { ok: false, error: String(e) };
  }
}

/** Minimal row for Trading (required: symbol, opeartion) */
export async function debugWriteTrading(symbol: string = 'BTCUSDT') {
  try {
    await prisma.trading.create({
      data: {
        // Symbol enum values: BTC | ETH | BNB | SOL | DOGE
        symbol: mapSymbol(symbol) as any,
        // Opeartion enum values: Buy | Sell | Hold
        opeartion: 'Buy' as any,
      },
    });
    return { ok: true };
  } catch (e) {
    console.error('[DEBUG WRITE] Trading failed:', e);
    return { ok: false, error: String(e) };
  }
}

/** Minimal row for Chat (required: reasoning, userPrompt) */
export async function debugWriteChat(reasoning: string) {
  try {
    await prisma.chat.create({
      data: {
        reasoning,
        userPrompt: 'cron ping',
        // model has a default; if you want to be explicit:
        // model: 'Deepseek' as any,
      },
    });
    return { ok: true };
  } catch (e) {
    console.error('[DEBUG WRITE] Chat failed:', e);
    return { ok: false, error: String(e) };
  }
}
