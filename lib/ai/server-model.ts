// lib/ai/server-model.ts
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  // Fail fast with a clear error during build/runtime
  throw new Error("Missing OPENAI_API_KEY env var for server-model");
}

const client = new OpenAI({
  apiKey,
  // Optional: point to a compatible gateway if you use one
  // baseURL: process.env.OPENAI_BASE_URL,
});

const DEFAULT_MODEL =
  process.env.OPENAI_MODEL || "gpt-4o-mini"; // keep it cheap+fast for cron

/**
 * Server-side text generation (no cookies, no request context).
 * Returns a short, single-line string for logs/status.
 */
export async function generateServerText(prompt: string): Promise<string> {
  const completion = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    temperature: 0.2,
    max_tokens: 120,
    messages: [
      {
        role: "system",
        content:
          "You are a concise assistant. Reply with a single short line suitable for logs.",
      },
      { role: "user", content: prompt },
    ],
  });

  const msg = completion.choices?.[0]?.message?.content?.trim();
  return msg || "";
}
