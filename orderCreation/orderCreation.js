import { storeOpenPosition } from '../utils/storeOpenPositions.js';
import { handleFailedOrders } from './orderCreationHelpers.js';
import { createExchangeOrder } from './orderExchangeCreation.js';

// Main function
export async function createOrder(
  exchanges,
  order,
  type = 'limit',
  isClose = false,
) {
  const {
    symbol,
    buyExchange,
    sellExchange,
    selectedBuyPrice,
    selectedSellPrice,
    tradeVolumeUSDT,
    netBuyPrice,
    netSellPrice,
    USDTPrice,
  } = order;

  const amountToTrade = {
    USDT: tradeVolumeUSDT / ((netBuyPrice + netSellPrice) / 2),
    TMN: tradeVolumeUSDT / ((netBuyPrice + netSellPrice) / 2),
  };

  console.log(
    `Placing orders: Buy ${amountToTrade.toFixed(
      6,
    )} ${symbol} on ${buyExchange}, Sell on ${sellExchange}`,
  );

  let buyOrder, sellOrder;

  try {
    const [buyResult, sellResult] = await Promise.all([
      createExchangeOrder(
        buyExchange,
        symbol,
        type,
        'buy',
        amountToTrade,
        selectedBuyPrice,
        exchanges,
        USDTPrice,
      ),
      createExchangeOrder(
        sellExchange,
        symbol,
        'sell',
        amountToTrade,
        selectedSellPrice,
        exchanges,
        USDTPrice,
      ),
    ]);

    buyOrder = buyResult;
    sellOrder = sellResult;

    console.log(`Buy order on ${buyExchange} successful.`);
    console.log(`Sell order on ${sellExchange} successful.`);
  } catch (error) {
    console.error(`Error placing orders: ${error.message}`);
  }

  // Handle failed orders
  await handleFailedOrders({
    buyOrder,
    sellOrder,
    buyExchange,
    sellExchange,
    symbol,
    amountToTrade,
  });

  // Store Open Position if successful
  if (buyOrder && sellOrder && !isClose) {
    storeOpenPosition({
      symbol,
      buyExchange,
      sellExchange,
      amount: amountToTrade,
      entryBuyPrice: buyOrder.average,
      entrySellPrice: sellOrder.average,
    });
  }
}
