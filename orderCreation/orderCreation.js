import { storeOpenPosition } from '../utils/storeOpenPositions.js';
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
    TMN: (tradeVolumeUSDT * USDTPrice) / ((netBuyPrice + netSellPrice) / 2),
  };

  console.log(
    `Placing orders: Buy ${amountToTrade[symbol.split('/')[0]].toFixed(
      6,
    )} ${symbol} on ${buyExchange}, Sell on ${sellExchange}`,
  );

  let buyOrder, sellOrder;

  const [buyResult, sellResult] = await Promise.allSettled([
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
      type,
      'sell',
      amountToTrade,
      selectedSellPrice,
      exchanges,
      USDTPrice,
    ),
  ]);

  if (buyResult.status === 'fulfilled') {
    buyOrder = buyResult.value;
  } else {
    console.error('Buy order failed:', buyResult.reason);
  }

  if (sellResult.status === 'fulfilled') {
    sellOrder = sellResult.value;
  } else {
    console.error('Sell order failed:', sellResult.reason);
  }
  // Store Open Position if successful
  if (buyOrder && sellOrder && !isClose) {
    storeOpenPosition({
      symbol,
      buyExchange,
      sellExchange,
      amount: amountToTrade[symbol.split('/')[1]],
      entryBuyPrice: buyOrder.average,
      entrySellPrice: sellOrder.average,
    });
  }
}
