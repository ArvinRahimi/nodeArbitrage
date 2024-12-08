import axios from 'axios';
import {
  standardizeNobitexOrderBooks,
  standardizeWallexOrderBooks,
} from '../transforms/standardizations.js';
import { splitSymbolsIntoQuoteAndBase } from '../utils/splitSymbols.js';

// Fetch Nobitex L2 Order Books
export async function fetchNobitexOrderBooks(symbols) {
  try {
    const response = await axios.get('https://api.nobitex.ir/v3/orderbook/all');
    const data = response.data;

    if (!data) {
      throw new Error('No order book data available from Nobitex');
    }

    delete data.status;

    const nobitexOrderBooks = standardizeNobitexOrderBooks(data, symbols);

    console.log('Nobitex order books fetched');
    return nobitexOrderBooks;
  } catch (error) {
    console.error('Error fetching Nobitex order books:', error);
    return {};
  }
}

// Fetch Wallex L2 Order Books
export async function fetchWallexOrderBooks(symbols) {
  try {
    const response = await axios.get('https://api.wallex.ir/v2/depth/all');
    const data = response.data.result;

    if (!data) {
      throw new Error('No order book data available from Wallex');
    }
    const wallexOrderBooks = standardizeWallexOrderBooks(data, symbols);

    console.log('Wallex order books fetched');
    return wallexOrderBooks;
  } catch (error) {
    console.error('Error fetching Wallex order books:', error.message);
    return {};
  }
}

export async function fetchOrderBooks(exchanges, exchangeId, symbols) {
  try {
    const orderBooks = {};
    const quotesMap = splitSymbolsIntoQuoteAndBase(symbols, exchangeId);
    if (exchangeId === 'nobitex') {
      const nobitexOrderBooks = await fetchNobitexOrderBooks(symbols);
      Object.assign(orderBooks, nobitexOrderBooks);
    } else if (exchangeId === 'wallex') {
      const wallexOrderBooks = await fetchWallexOrderBooks(symbols);
      Object.assign(orderBooks, wallexOrderBooks);
    } else {
      // For CCXT exchanges
      if (exchanges[exchangeId].has.fetchOrderBooks) {
        const exchangeOrderBooks = await exchanges[exchangeId].fetchOrderBooks(
          symbols,
        );
        Object.assign(orderBooks, exchangeOrderBooks);
      } else {
        const orderBooksPromises = symbols
          .filter(symbol => !quotesMap.TMN.includes(symbol))
          .map(async symbol => {
            try {
              const orderBook = await exchanges[exchangeId].fetchOrderBook(
                symbol,
              );
              orderBooks[symbol] = orderBook;
            } catch (err) {
              console.error(`Error fetching order book for ${symbol}:`, err);
            }
          });
        await Promise.allSettled(orderBooksPromises);
      }

      console.log(
        `${exchangeId.charAt(0).toUpperCase()}${exchangeId.slice(
          1,
        )} order books fetched`,
      );
    }

    return orderBooks;
  } catch (error) {
    console.error(`Error fetching VWAPs for ${exchangeId}:`, error.message);
    return {};
  }
}
