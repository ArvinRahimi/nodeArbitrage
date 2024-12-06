import NodeCache from 'node-cache';
import { CONFIG } from '../config.js';
import { getVWAPs } from '../VWAP/VWAP.js';
import { addTMNSymbols } from '../utils/addTMNSymbols.js';

const cache = new NodeCache({ stdTTL: 600 });

export function findArbitrageOpportunities(allPrices) {
  const { minMarginPercent, fees } = CONFIG;

  const opportunities = new Array(1000); // Preallocate space for opportunities
  let opportunityCount = 0;

  const exchanges = Object.keys(allPrices);
  const exchangeCount = exchanges.length;

  const feeMultipliers = new Map(
    exchanges.map(exchange => [
      exchange,
      {
        buy: 1 + fees[exchange].taker,
        sell: 1 - fees[exchange].taker,
      },
    ]),
  );

  for (let i = 0; i < exchangeCount - 1; i++) {
    const exchangeA = exchanges[i];
    const dataA = allPrices[exchangeA];

    for (let j = i + 1; j < exchangeCount; j++) {
      const exchangeB = exchanges[j];
      const dataB = allPrices[exchangeB];

      // Generate a unique cache key
      const cacheKey = `${exchangeA}-${exchangeB}`;

      // Retrieve or compute common bases
      let commonSymbols = cache.get(cacheKey);
      if (!commonSymbols) {
        const symbolA = new Set(Object.keys(dataA));
        const symbolB = new Set(Object.keys(dataB));
        commonSymbols = [...symbolA].filter(symbol => symbolB.has(symbol)); // Intersection
        cache.set(cacheKey, commonSymbols); // Cache the result
      }

      for (const symbol of commonSymbols) {
        const priceA = dataA[symbol];
        const priceB = dataB[symbol];

        // Get fee multipliers
        const feesA = feeMultipliers.get(exchangeA);
        const feesB = feeMultipliers.get(exchangeB);

        // Calculate prices with fees
        const buyPriceA = priceA.ask * feesA.buy;
        const sellPriceA = priceA.bid * feesA.sell;
        const buyPriceB = priceB.ask * feesB.buy;
        const sellPriceB = priceB.bid * feesB.sell;

        // Calculate margins and check arbitrage opportunities
        if (buyPriceA < sellPriceB) {
          const marginAB = ((sellPriceB - buyPriceA) / sellPriceB) * 100;
          if (marginAB >= minMarginPercent) {
            opportunities[opportunityCount++] = {
              symbol,
              buyExchange: exchangeA,
              sellExchange: exchangeB,
              buyPrice: buyPriceA,
              sellPrice: sellPriceB,
              margin: marginAB,
            };
          }
        } else if (buyPriceB < sellPriceA) {
          const marginBA = ((sellPriceA - buyPriceB) / sellPriceA) * 100;
          if (marginBA >= minMarginPercent) {
            opportunities[opportunityCount++] = {
              symbol,
              buyExchange: exchangeB,
              sellExchange: exchangeA,
              buyPrice: buyPriceB,
              sellPrice: sellPriceA,
              margin: marginBA,
            };
          }
        }
      }
    }
  }

  return opportunities
    .slice(0, opportunityCount)
    .sort((a, b) => b.margin - a.margin);
}

export async function calculateFinalReturns(
  opportunities,
  exchanges,
  USDTPrice,
) {
  const { fees, leverage, minVolumeUSD, slippage, minMarginPercent } = CONFIG;

  const tradeVolumeUSD = minVolumeUSD * leverage;

  const symbolsAndSidesByExchange = {};

  for (const opportunity of opportunities) {
    const { symbol, buyExchange, sellExchange } = opportunity;

    // Process buy side
    if (!symbolsAndSidesByExchange[buyExchange]) {
      symbolsAndSidesByExchange[buyExchange] = {};
    }
    if (!symbolsAndSidesByExchange[buyExchange][symbol]) {
      symbolsAndSidesByExchange[buyExchange][symbol] = new Set();
    }
    symbolsAndSidesByExchange[buyExchange][symbol].add('buy');

    // Process sell side
    if (!symbolsAndSidesByExchange[sellExchange]) {
      symbolsAndSidesByExchange[sellExchange] = {};
    }
    if (!symbolsAndSidesByExchange[sellExchange][symbol]) {
      symbolsAndSidesByExchange[sellExchange][symbol] = new Set();
    }
    symbolsAndSidesByExchange[sellExchange][symbol].add('sell');
  }

  // Fetch VWAPs for exchanges
  const vwapResultsByExchange = {};

  await Promise.all(
    Object.entries(symbolsAndSidesByExchange).map(
      async ([exchangeId, symbolsAndSides]) => {
        const vwapResults = await getVWAPs(
          exchanges,
          exchangeId,
          symbolsAndSides,
          tradeVolumeUSD,
          USDTPrice,
        );
        vwapResultsByExchange[exchangeId] = vwapResults;
      },
    ),
  );

  addTMNSymbols(vwapResultsByExchange, USDTPrice);

  const finalReturns = [];

  for (const opportunity of opportunities) {
    const { symbol, buyExchange, sellExchange } = opportunity;

    const spreadBuyExchange =
      vwapResultsByExchange[buyExchange][symbol]?.spread;
    const spreadSellExchange =
      vwapResultsByExchange[sellExchange][symbol]?.spread;

    const buyVWAP = vwapResultsByExchange[buyExchange][symbol]?.asks;
    const sellVWAP = vwapResultsByExchange[sellExchange][symbol]?.bids;
    if (!buyVWAP || !sellVWAP) continue;
    const buyFee = fees[buyExchange].taker;
    const sellFee = fees[sellExchange].taker;

    const netBuyPrice = buyVWAP * (1 + buyFee);
    const netSellPrice = sellVWAP * (1 - sellFee);

    const profit = netSellPrice - netBuyPrice;

    const returnPercentage = (profit / netSellPrice) * 100;

    const netSellPriceWithSlippage = netSellPrice * (1 - slippage);
    const netBuyPriceWithSlippage = netBuyPrice * (1 + slippage);
    const profitWithSlippage =
      netSellPriceWithSlippage - netBuyPriceWithSlippage;
    const returnPercentageWithSlippage =
      (profitWithSlippage / netSellPriceWithSlippage) * 100;

    const netSellPriceWithSlippageAndSpread = netSellPrice * (1 - slippage);
    const netBuyPriceWithSlippageAndSpread = netBuyPrice * (1 + slippage);
    const profitWithSlippageAndSpread =
      netSellPriceWithSlippageAndSpread -
      netBuyPriceWithSlippageAndSpread -
      (spreadBuyExchange + spreadSellExchange);
    const returnPercentageWithSlippageAndSpread =
      (profitWithSlippageAndSpread / netSellPriceWithSlippageAndSpread) * 100;

    finalReturns.push({
      opportunity,
      symbol,
      buyExchange,
      sellExchange,
      selectedBuyPrice: netBuyPriceWithSlippageAndSpread,
      selectedSellPrice: netSellPriceWithSlippageAndSpread,
      netBuyPrice,
      netSellPrice,
      returnPercentage,
      netBuyPriceWithSlippage,
      netSellPriceWithSlippage,
      returnPercentageWithSlippage,
      netBuyPriceWithSlippageAndSpread,
      netSellPriceWithSlippageAndSpread,
      returnPercentageWithSlippageAndSpread,
      tradeVolumeUSD,
      USDTPrice,
    });
  }

  return finalReturns;
}
