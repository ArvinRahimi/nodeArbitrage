// Import required libraries

import ccxt from 'ccxt';
import dotenv from 'dotenv';
import { standardizeSpecialCoinPrices } from './transforms/standardizations.js';
import { fetchAllPrices } from './fetch/fetchPrices.js';
import {
  calculateFinalReturns,
  findArbitrageOpportunities,
} from './opportunitiesAndFinalReturns/opportunitiesAndFinalReturns.js';
import { calculateTMNPrice } from './utils/calculateTMNPrice.js';
import { CONFIG } from './config.js';
import { createOrder } from './orderCreation/orderCreation.js';
import { monitorOpenPositions } from './monitoring/monitoring.js';

dotenv.config();
const { exchangesToUse, exchangeParams, customExchanges, minMarginPercent } =
  CONFIG;
// Initialize exchanges
const exchanges = {};

// Initialize ccxt exchanges
for (const id of exchangesToUse) {
  if (ccxt.exchanges.includes(id) && !customExchanges.includes(id)) {
    exchanges[id] = new ccxt[id]({
      apiKey: exchangeParams[id]?.apiKey,
      secret: exchangeParams[id]?.secret,
      options: exchangeParams[id]?.options,
      enableRateLimit: true,
    });
  } else if (!CONFIG.customExchanges.includes(id)) {
    throw new Error(`Unsupported exchange: ${id}`);
  }
}

// Main Execution Function
let openPositions = [];

async function main() {
  while (true) {
    try {
      const allPrices = await fetchAllPrices(exchanges);

      console.log('COMPLETE: Price fetching!');

      const nobitexUSDTPrice =
        (allPrices.nobitex['USDT/TMN'].ask +
          allPrices.nobitex['USDT/TMN'].bid) /
        2;
      const wallexUSDTPrice =
        (allPrices.wallex['USDT/TMN'].ask + allPrices.wallex['USDT/TMN'].bid) /
        2;
      const USDTPrice = (nobitexUSDTPrice + wallexUSDTPrice) / 2;

      standardizeSpecialCoinPrices(allPrices);
      calculateTMNPrice(allPrices, USDTPrice);

      const opportunities = findArbitrageOpportunities(allPrices);

      const finalReturns = await calculateFinalReturns(
        opportunities,
        exchanges,
        USDTPrice,
      );

      finalReturns
        .filter(
          finalReturns =>
            finalReturns.returnPercentageWithSlippageAndSpread >
            minMarginPercent,
        )
        .sort(
          (a, b) =>
            b.returnPercentageWithSlippageAndSpread -
            a.returnPercentageWithSlippageAndSpread,
        );

      if (finalReturns?.length) {
        let order = finalReturns[0];

        await createOrder(exchanges, order);
      }

      /* for (const finalReturn of finalReturns) {
        console.log(
          `Position: Long ${finalReturn.symbol} on ${
            finalReturn.buyExchange
          } at ${finalReturn.netBuyPriceWithSlippageAndSpread.toFixed(
            6,
          )}, Short on ${
            finalReturn.sellExchange
          } at ${finalReturn.netSellPriceWithSlippageAndSpread.toFixed(
            6,
          )}, Expected Return: ${finalReturn.returnPercentageWithSlippageAndSpread.toFixed(
            2,
          )}%`,
        );
      } */

      // Monitor open positions
      //await monitorOpenPositions();

      // Wait before next iteration
      await new Promise(resolve =>
        setTimeout(resolve, CONFIG.refreshIntervalMs),
      );
    } catch (error) {
      console.error('An error occurred:', error.message);
      // Wait before next iteration in case of error
      await new Promise(resolve =>
        setTimeout(resolve, CONFIG.refreshIntervalMs),
      );
    }
  }
}

// Start the script
main();
