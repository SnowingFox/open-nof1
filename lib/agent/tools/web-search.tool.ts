import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';

// Initialize Exa only if API key is available
const exa = process.env.EXA_API_KEY ? new Exa(process.env.EXA_API_KEY) : null;

export const webSearchTool = tool({
  description: `Search the web for cryptocurrency news, market sentiment, or analysis.
Use this to get recent news about a cryptocurrency before making trading decisions.`,

  parameters: z.object({
    query: z.string().describe("Search query (e.g., 'Bitcoin news today', 'Ethereum price prediction')"),
  }),

  execute: async ({ query }: { query: string }) => {
    if (!exa) {
      return {
        success: false,
        error: 'Web search is not configured. Set EXA_API_KEY environment variable to enable.',
      };
    }

    try {
      const result = await exa.searchAndContents(query, {
        text: true,
        type: 'auto',
        numResults: 3,
      });

      return {
        success: true,
        results: result.results.map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.text?.substring(0, 200),
        })),
      };
    } catch {
      return {
        success: false,
        error: 'Web search failed',
      };
    }
  },
} as any);
