-- CreateEnum
CREATE TYPE "Opeartion" AS ENUM ('Buy', 'Sell', 'Hold');

-- CreateEnum
CREATE TYPE "Symbol" AS ENUM ('BTC', 'ETH', 'BNB', 'SOL', 'DOGE');

-- CreateEnum
CREATE TYPE "ModelType" AS ENUM ('Deepseek', 'DeepseekThinking', 'Qwen', 'Doubao');

-- CreateTable
CREATE TABLE "Metrics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" "ModelType" NOT NULL,
    "metrics" JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL,
    "model" "ModelType" NOT NULL DEFAULT 'Deepseek',
    "chat" TEXT NOT NULL DEFAULT '<no chat>',
    "reasoning" TEXT NOT NULL,
    "userPrompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trading" (
    "id" TEXT NOT NULL,
    "symbol" "Symbol" NOT NULL,
    "opeartion" "Opeartion" NOT NULL,
    "leverage" INTEGER,
    "amount" INTEGER,
    "pricing" INTEGER,
    "stopLoss" INTEGER,
    "takeProfit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "chatId" TEXT,

    CONSTRAINT "Trading_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Trading" ADD CONSTRAINT "Trading_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

