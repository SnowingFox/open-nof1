import { generateObject } from "ai";
import { tradingPrompt } from "./prompt";
import {
  formatMarketState,
  getCurrentMarketState,
} from "../trading/market-data";
import { z } from "zod";
import fs from "fs/promises";
import { deepseekR1 } from "./model";

export enum Opeartion {
  Buy = "buy",
  Sell = "sell",
  Hold = "hold",
}

/**
 * 轮询
 */
export async function intervalTrading() {
  const currentMarketState = await getCurrentMarketState("BTC/USDT");
  const userPrompt = `BTC ALL DATA\n${formatMarketState(currentMarketState)}`;

  const { object, reasoning } = await generateObject({
    model: deepseekR1,
    system: tradingPrompt,
    prompt: userPrompt,
    output: "object",
    mode: "json",
    schema: z.object({
      opeartion: z.nativeEnum(Opeartion),
      buy: z
        .object({
          pricing: z.number().describe("The pricing of you want to buy in."),
          amount: z.number(),
          leverage: z.number().min(1).max(20),
        })
        .optional()
        .describe("If opeartion is buy, generate object"),
      sell: z
        .object({
          pricing: z.number().describe("The pricing of you want to sell at."),
          percentage: z
            .number()
            .min(0)
            .max(100)
            .describe("Percentage of position to sell"),
        })
        .optional()
        .describe("If opeartion is sell, generate object"),
      reason: z
        .string()
        .describe(
          "The reason why you do this opeartion, and tell me your anlyaise, for example"
        ),
    }),
  });

  fs.writeFile(
    `opeartion-${new Date().getTime()}.json`,
    JSON.stringify(
      {
        reasoning,
        object,
        userPrompt,
      },
      null,
      2
    )
  );

  if (object.opeartion === Opeartion.Buy) {
  }

  if (object.opeartion === Opeartion.Sell) {
  }

  if (object.opeartion === Opeartion.Hold) {
  }
}

intervalTrading();
