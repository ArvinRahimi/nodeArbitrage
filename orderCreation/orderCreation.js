import { findLargestPriceAndAmounPrecisions } from '../precisions/precisions.js';
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

  const { pricePrecision, amountPrecision } =
    findLargestPriceAndAmounPrecisions(symbol);

  const priceDecimals = Math.floor(Math.log10(pricePrecision));

  const USDTAmount = tradeVolumeUSDT / ((netBuyPrice + netSellPrice) / 2);
  const roundedUSDTAmount =
    Math.floor(USDTAmount / amountPrecision) * minAmount;
  const amountToTrade = {
    USDT: roundedUSDTAmount,
    TMN: roundedUSDTAmount * USDTPrice,
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
      priceDecimals,
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
      priceDecimals,
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
