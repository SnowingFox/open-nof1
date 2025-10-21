import { marketDataTool } from './market-data.tool';
import { accountInfoTool } from './account-info.tool';
import { placeOrderTool } from './place-order.tool';
import { webSearchTool } from './web-search.tool';

export const tradingTools = {
  getMarketData: marketDataTool,
  getAccountInfo: accountInfoTool,
  placeOrder: placeOrderTool,
  search: webSearchTool,
};
