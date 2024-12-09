import NodeCache from 'node-cache';

const baseCache = new NodeCache({
  stdTTL: 600, // cache expires after 10 minute
});
const quoteCache = new NodeCache({
  stdTTL: 600, // cache expires after 10 minute
});

export function splitSymbolsIntoBaseAndQuote(symbols, exchangeId, skipCaching) {
  const key = exchangeId;
  const cachedValue = baseCache.get(key);
  if (cachedValue) {
    return cachedValue;
  }

  const basesMap = {};
  for (const symbol of symbols) {
    const [base, quote] = symbol.split('/');
    if (!basesMap[base]) {
      basesMap[base] = [];
    }
    basesMap[base].push(symbol);
  }
  if (!skipCaching) baseCache.set(key, basesMap);
  return basesMap;
}

export function splitSymbolsIntoQuoteAndBase(
  symbols,
  exchangeId,
  recalculate = false,
) {
  const key = exchangeId;
  const cachedValue = quoteCache.get(key);
  if (cachedValue && !recalculate) {
    return cachedValue;
  }

  const quotesMap = {};
  for (const symbol in symbols) {
    const [base, quote] = symbol.split('/');
    if (!quotesMap[quote]) {
      quotesMap[quote] = [];
    }
    quotesMap[quote].push(symbol);
  }

  quoteCache.set(key, quotesMap);
  return quotesMap;
}
