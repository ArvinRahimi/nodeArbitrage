import { CONFIG } from '../config.js';
import { splitSymbolsIntoBaseAndQuote } from '../utils/splitSymbols.js';

export function standardizeNobitexOrderBooks(nobitexOrderBooks, symbols) {
  const orderBooks = {};
  for (let symbol in nobitexOrderBooks) {
    const base = symbol.replace(/(IRT|USDT)$/, '');
    let quote = symbol.replace(new RegExp(`^${base}`), '');

    const factor = quote === 'IRT' ? 10 : 1;
    if (quote === 'IRT') {
      quote = 'TMN';
    }

    const standardizedSymbol = base + '/' + quote;

    if (!symbols.includes(standardizedSymbol)) continue;

    const asks = nobitexOrderBooks[symbol].asks.map(([price, amount]) => [
      parseFloat(price) / factor,
      parseFloat(amount),
    ]);
    const bids = nobitexOrderBooks[symbol].bids.map(([price, amount]) => [
      parseFloat(price) / factor,
      parseFloat(amount),
    ]);

    orderBooks[standardizedSymbol] = {
      asks,
      bids,
    };
  }

  standardizeSpecialCoinOrderBooks('nobitex', orderBooks);
  return orderBooks;
}
export function standardizeWallexOrderBooks(wallexOrderBooks, symbols) {
  const orderBooks = {};

  for (const symbol in wallexOrderBooks) {
    const orderBook = wallexOrderBooks[symbol];

    const base = symbol.replace(/(TMN|USDT)$/, '');
    let quote = symbol.replace(new RegExp(`^${base}`), '');

    const standardizedSymbol = base + '/' + quote;

    if (!symbols.includes(standardizedSymbol)) continue;

    const asks = orderBook.ask
      .slice(0, 24)
      .map(order => [parseFloat(order.price), parseFloat(order.quantity)]);
    const bids = orderBook.bid
      .slice(0, 24)
      .map(order => [parseFloat(order.price), parseFloat(order.quantity)]);

    orderBooks[standardizedSymbol] = {
      asks,
      bids,
    };
  }

  standardizeSpecialCoinOrderBooks('wallex', orderBooks);
  return orderBooks;
}

export function standardizeSpecialCoinOrderBooks(exchangeId, orderBooks) {
  const { specialCoinStandardizations } = CONFIG;

  const standardizations = specialCoinStandardizations[exchangeId];
  const symbols = Object.keys(orderBooks);
  const basesMap = splitSymbolsIntoBaseAndQuote(symbols, exchangeId);

  for (let i = 0; i < standardizations.length; i++) {
    const { originalBase, standardBase, correctionFactor } =
      standardizations[i];

    for (const originalSymbol of basesMap[originalBase]) {
      if (!orderBooks[originalSymbol]) continue;
      const { bids, asks } = orderBooks[originalSymbol];
      const standardSymbol = originalSymbol.replace(originalBase, standardBase);

      orderBooks[standardSymbol] = {
        bids: bids.map(bid => bid * correctionFactor),
        asks: asks.map(ask => ask * correctionFactor),
      };

      delete orderBooks[originalSymbol];
    }
  }
}

export function standardizeSpecialCoinPrices(allPrices) {
  const { specialCoinStandardizations } = CONFIG;
  for (const exchangeId in specialCoinStandardizations) {
    const standardizations = specialCoinStandardizations[exchangeId];

    const symbols = Object.keys(allPrices[exchangeId]);
    const basesMap = splitSymbolsIntoBaseAndQuote(symbols, exchangeId);

    for (let i = 0; i < standardizations.length; i++) {
      const { originalBase, standardBase, correctionFactor } =
        standardizations[i];
      if (allPrices[exchangeId] && basesMap[originalBase]) {
        const priceData = allPrices[exchangeId];

        for (const originalSymbol of basesMap[originalBase]) {
          const { bid, ask } = priceData[originalSymbol];
          const standardSymbol = originalSymbol.replace(
            originalBase,
            standardBase,
          );
          allPrices[exchangeId][standardSymbol] = {
            bid: bid * correctionFactor,
            ask: ask * correctionFactor,
          };
          delete allPrices[exchangeId][originalSymbol];
        }
      }
    }
  }
}

export function standardizeSpecialCoinPrecisions(exchangeId, precisions) {
  const { specialCoinStandardizations } = CONFIG;
  const standardizations = specialCoinStandardizations[exchangeId];

  const symbols = Object.keys(precisions.pricePrecisions);
  const skipCaching = true;
  const basesMap = splitSymbolsIntoBaseAndQuote(
    symbols,
    exchangeId,
    skipCaching,
  );

  for (let i = 0; i < standardizations.length; i++) {
    const { originalBase, standardBase, correctionFactor } =
      standardizations[i];

    for (const originalSymbol of basesMap[originalBase]) {
      const pricePrecision = precisions.pricePrecisions[originalSymbol];
      const standardSymbol = originalSymbol.replace(originalBase, standardBase);
      precisions.pricePrecisions[standardSymbol] = pricePrecision;

      delete precisions.pricePrecisions[originalSymbol];
    }

    for (const originalSymbol of basesMap[originalBase]) {
      const amountPrecision = precisions.amountPrecisions[originalSymbol];
      const standardSymbol = originalSymbol.replace(originalBase, standardBase);
      precisions.amountPrecisions[standardSymbol] =
        amountPrecision * correctionFactor;

      delete precisions.amountPrecisions[originalSymbol];
    }
  }
}
