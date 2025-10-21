import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// Use dummy key for mock mode to prevent initialization errors
const deepseekApiKey = process.env.DEEPSEEK_API_KEY || 'mock-key';
const openrouterApiKey = process.env.OPENROUTER_API_KEY || 'mock-key';

const deepseekModel = createDeepSeek({
  apiKey: deepseekApiKey,
});

const openrouter = createOpenRouter({
  apiKey: openrouterApiKey,
});

export const deepseekv31 = openrouter("deepseek/deepseek-v3.2-exp");

export const deepseekR1 = openrouter("deepseek/deepseek-r1-0528");

export const deepseek = deepseekModel("deepseek-chat");

export const deepseekThinking = deepseekModel("deepseek-reasoner");
