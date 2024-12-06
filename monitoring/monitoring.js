import NodeCache from 'node-cache';
import { getVWAPs } from '../VWAP/VWAP.js';
const cache = new NodeCache({ stdTTL: 600 });
// Monitor Open Positions
export async function monitorOpenPositions(exchanges) {
  const key = 'openPositions';
  const openPositions = [];
  const cachedOpenPositions = cache.get(key);
  if (cachedOpenPositions) {
    openPositions = cachedOpenPositions;
  } else {
    openPositions = fetchOpenPositions(exchanges);
    cache.set('openPositions', openPositions);
  }

  for (const position of openPositions.slice()) {
    const {
      symbol,
      buyExchange,
      sellExchange,
      amount,
      entryBuyPrice,
      entrySellPrice,
    } = position;

    const tradeVolumeUSD = amount * entryBuyPrice;

    const [currentBuyVWAP, currentSellVWAP] = await Promise.all([
      getVWAPs(buyExchange, symbol, tradeVolumeUSD, 'sell'),
      getVWAPs(sellExchange, symbol, tradeVolumeUSD, 'buy'),
    ]);

    if (!currentBuyVWAP || !currentSellVWAP) {
      continue;
    }

    const buyFee = CONFIG.fees[buyExchange].taker;
    const sellFee = CONFIG.fees[sellExchange].taker;

    const netCurrentBuyPrice = currentBuyVWAP * (1 - buyFee);
    const netCurrentSellPrice = currentSellVWAP * (1 + sellFee);

    const profit = (netCurrentSellPrice - netCurrentBuyPrice) * amount;
    const returnPercentage = (profit / (entryBuyPrice * amount)) * 100;

    console.log(
      `Position ${coin}/${quote} on ${buyExchange}/${sellExchange}: Return ${returnPercentage.toFixed(
        2,
      )}%`,
    );

    // Exit conditions
    if (
      returnPercentage >= CONFIG.minMarginPercent * 2 ||
      returnPercentage <= -CONFIG.minMarginPercent
    ) {
      await closePosition(position);
      openPositions.splice(openPositions.indexOf(position), 1);
    }
  }
}
