import ccxt from 'ccxt';
import axios from 'axios';
import { CONFIG } from '../config.js';

// Function to fetch prices from Nobitex (custom implementation)
export async function fetchNobitexPrices() {
  const { coinsToConsider, coinsToIgnore } = CONFIG;
  try {
    const response = await axios.get('https://api.nobitex.ir/v3/orderbook/all');
    const data = response.data;
    delete data.status;
    const prices = {};

    for (const symbol in data) {
      let base = symbol.replace(/(IRT|USDT)$/, '');
      let quote = symbol.replace(new RegExp(`^${base}`), '');

      if (
        (coinsToConsider && !coinsToConsider.includes(base)) ||
        coinsToIgnore.includes(base)
      ) {
        continue;
      }
      // Asks and Bids are opposite to other exchanges
      const bids = data[symbol].bids;
      const asks = data[symbol].asks;

      if (bids?.length > 0 && asks?.length > 0) {
        let bidPrice = parseFloat(bids[0][0]);
        let askPrice = parseFloat(asks[0][0]);

        if (quote === 'IRT') {
          bidPrice /= 10;
          askPrice /= 10;
          quote = 'TMN';
        }

        prices[base + '/' + quote] = {
          bid: bidPrice,
          ask: askPrice,
        };
      }
    }

    console.log('Nobitex prices fetched');
    return prices;
  } catch (error) {
    console.error('Error fetching Nobitex prices:', error);
    return {};
  }
}

// Function to fetch prices from Wallex (custom implementation)
export async function fetchWallexPrices() {
  const { coinsToConsider, coinsToIgnore } = CONFIG;
  try {
    const response = await axios.get('https://api.wallex.ir/v1/markets');
    const symbols = response.data.result.symbols;

    const prices = {};

    for (const symbol in symbols) {
      const ticker = symbols[symbol];
      const base = ticker.baseAsset;
      const quote = ticker.quoteAsset;

      if (
        (coinsToConsider && !coinsToConsider.includes(base)) ||
        coinsToIgnore.includes(base)
      ) {
        continue;
      }

      const bidPrice = parseFloat(ticker.stats.bidPrice);
      const askPrice = parseFloat(ticker.stats.askPrice);

      prices[base + '/' + quote] = {
        bid: bidPrice,
        ask: askPrice,
      };
    }

    console.log('Wallex prices fetched');
    return prices;
  } catch (error) {
    console.error('Error fetching Wallex prices:', error.message);
    return {};
  }
}

// Function to fetch all prices concurrently
export async function fetchAllPrices(exchanges) {
  const { exchangesToUse } = CONFIG;
  const allPrices = {};
  const fetchPromises = exchangesToUse.map(async exchangeId => {
    if (exchangeId === 'nobitex') {
      allPrices[exchangeId] = await fetchNobitexPrices();
    } else if (exchangeId === 'wallex') {
      allPrices[exchangeId] = await fetchWallexPrices();
    } else {
      allPrices[exchangeId] = await fetchPrices(exchanges, exchangeId);
    }
  });

  await Promise.all(fetchPromises);
  return allPrices;
}

// Function to fetch prices from an exchange
export async function fetchPrices(exchanges, exchangeId) {
  const { coinsToConsider, coinsToIgnore } = CONFIG;
  try {
    const exchange = exchanges[exchangeId];
    await exchange.loadMarkets();
    const tickers = await exchange.fetchTickers();
    const prices = {};

    for (const symbol in tickers) {
      const ticker = tickers[symbol];
      const [base, quote] = symbol.split('/');

      if (
        (coinsToConsider && !coinsToConsider.includes(base)) ||
        coinsToIgnore.includes(base)
      ) {
        continue;
      }

      //! make sure to check the ticker of each exchange, because
      //! sometimes bid and ask are not available.
      prices[symbol] = {
        bid: ticker.bid || ticker.close,
        ask: ticker.ask || ticker.close,
      };
    }

    console.log(
      `${exchangeId.charAt(0).toUpperCase()}${exchangeId.slice(
        1,
      )} prices fetched`,
    );
    return prices;
  } catch (error) {
    console.error(`Error fetching prices from ${exchangeId}:`, error.message);
    return {};
  }
}
