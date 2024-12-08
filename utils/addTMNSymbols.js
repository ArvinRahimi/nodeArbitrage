import { CONFIG } from '../config.js';
import { splitSymbolsIntoQuoteAndBase } from './splitSymbols.js';

export function addTMNSymbols(VWAPsByExchange, USDTPrice) {
  const { customExchanges } = CONFIG;
  for (const exchangeId in VWAPsByExchange) {
    if (customExchanges.includes(exchangeId)) continue;

    const quotesMap = splitSymbolsIntoQuoteAndBase(null, exchangeId);

    if (quotesMap.USDT?.length) {
      for (const symbol in VWAPsByExchange[exchangeId]) {
        let TMNSymbol = symbol.replace('/USDT', '/TMN');
        VWAPsByExchange[exchangeId][TMNSymbol] = {};
        VWAPsByExchange[exchangeId][TMNSymbol].asks =
          VWAPsByExchange[exchangeId][symbol].asks * USDTPrice;
        VWAPsByExchange[exchangeId][TMNSymbol].bids =
          VWAPsByExchange[exchangeId][symbol].bids * USDTPrice;
        VWAPsByExchange[exchangeId][TMNSymbol].spread =
          VWAPsByExchange[exchangeId][symbol].spread * USDTPrice;
      }
    }
  }
  return;
}
