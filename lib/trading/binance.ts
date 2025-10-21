import ccxt from "ccxt";
import { getRiskConfig } from "../risk/config";

// 根据配置决定使用测试网还是正式环境
const riskConfig = getRiskConfig();

export const binance = new ccxt.binance({
  apiKey: process.env.BINANCE_API_KEY,
  secret: process.env.BINANCE_API_SECRET,
  sandbox: riskConfig.mode === 'paper', // 纸盘模式使用沙盒
  options: {
    'defaultType': 'future', // 默认期货交易
    ...(riskConfig.mode === 'paper' && {
      // 纸盘模式额外配置
      'recvWindow': 10000,
    }),
  },
});

// 导出原始配置，便于其他地方使用
export const binanceConfig = {
  apiKey: process.env.BINANCE_API_KEY,
  secret: process.env.BINANCE_API_SECRET,
  sandbox: riskConfig.mode === 'paper',
};
