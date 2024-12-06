import { CONFIG } from '../config.js';
import { splitSymbolsIntoQuoteAndBase } from './splitSymbols.js';

export function calculateTMNPrice(allPrices, USDTPrice) {
  const { customExchanges = [] } = CONFIG;
  for (const exchange in allPrices) {
    if (customExchanges.includes(exchange)) continue;

    const symbols = allPrices[exchange];

    const quotesMap = splitSymbolsIntoQuoteAndBase(symbols, exchange);
    if (quotesMap.USDT?.length) {
      for (const symbol of quotesMap['USDT']) {
        let TMNSymbol = symbol.replace('/USDT', '/TMN');
        symbols[TMNSymbol] = {};
        symbols[TMNSymbol].ask = symbols[symbol].ask * USDTPrice;
        symbols[TMNSymbol].bid = symbols[symbol].bid * USDTPrice;
      }
      if (!quotesMap.hasOwnProperty('TMN')) {
        splitSymbolsIntoQuoteAndBase(symbols, exchange, true);
      }
    }
  }
}
