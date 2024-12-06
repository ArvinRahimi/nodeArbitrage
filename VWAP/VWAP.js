import { fetchOrderBooks } from '../fetch/fetchOrderBooks.js';

export async function getVWAPs(
  exchanges,
  exchangeId,
  symbolsAndSides,
  tradeVolumeUSD,
  USDTPrice,
) {
  try {
    const symbols = Object.keys(symbolsAndSides);
    const orderBooks = await fetchOrderBooks(exchanges, exchangeId, symbols);

    const VWAPs = calculateVWAPs(orderBooks, tradeVolumeUSD, USDTPrice);

    return VWAPs;
  } catch (error) {
    console.error(`Error fetching VWAPs for ${exchangeId}:`, error.message);
    return {};
  }
}

// Calculate Volume Weighted Average Price (VWAP)
export function calculateVWAPs(orderBooks, tradeVolumeUSD, USDTPrice) {
  let VWAPs = {};
  let tradeVolume = {
    USDT: tradeVolumeUSD,
    TMN: tradeVolumeUSD * USDTPrice,
  };
  for (let symbol in orderBooks) {
    VWAPs[symbol] = {};
    let [_, quote] = symbol.split('/');
    let orderBook = orderBooks[symbol];

    for (let side of ['asks', 'bids']) {
      let accumulatedVolume = 0;
      let accumulatedCost = 0;
      let orders = orderBook[side];
      for (const [price, amount] of orders) {
        const orderCost = price * amount;
        if (accumulatedCost + orderCost >= tradeVolume[quote]) {
          const remainingCost = tradeVolume[quote] - accumulatedCost;
          const partialAmount = remainingCost / price;
          accumulatedVolume += partialAmount;
          accumulatedCost += remainingCost;
          VWAPs[symbol][side] = accumulatedCost / accumulatedVolume;
          break;
        } else {
          accumulatedVolume += amount;
          accumulatedCost += orderCost;
        }
      }
    }
    VWAPs[symbol].spread = VWAPs[symbol]?.asks - VWAPs[symbol]?.bids;
  }

  return VWAPs;
}
