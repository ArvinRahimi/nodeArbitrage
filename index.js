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

const {
  exchangesToUse,
  exchangeParams,
  customExchanges,
  minMarginPercent,
  returnTypeOnOpen,
  orderTypeOnOpen,
  refreshIntervalMs,
  testMode = true,
} = CONFIG;
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
    if (testMode) {
      exchanges[id].setSandboxMode(true);
    }
  } else if (!customExchanges.includes(id)) {
    throw new Error(`Unsupported exchange: ${id}`);
  }
}

// Main Execution Function
async function main() {
  while (true) {
    try {
      const allPrices = await fetchAllPrices(exchanges);

      console.log('COMPLETE: Price fetching\n');

      const nobitexUSDTPrice =
        (allPrices.nobitex['USDT/TMN'].ask +
          allPrices.nobitex['USDT/TMN'].bid) /
        2;
      /* const wallexUSDTPrice =
        (allPrices.wallex['USDT/TMN'].ask + allPrices.wallex['USDT/TMN'].bid) /
        2; 
      const USDTPrice = Math.floor((nobitexUSDTPrice + wallexUSDTPrice) / 2);*/
      const USDTPrice = Math.floor(nobitexUSDTPrice);

      standardizeSpecialCoinPrices(allPrices);
      calculateTMNPrice(allPrices, USDTPrice);

      const opportunities = findArbitrageOpportunities(allPrices);

      let finalReturns = await calculateFinalReturns(
        opportunities,
        exchanges,
        USDTPrice,
        returnTypeOnOpen,
      );

      finalReturns = finalReturns
        .filter(
          fr =>
            fr.selectedReturnPercentage > minMarginPercent - 1 &&
            fr.selectedReturnPercentage < 4,
        )
        .sort(
          (a, b) => b.selectedReturnPercentage - a.selectedReturnPercentage,
        );

      if (finalReturns?.length) {
        const order = finalReturns[0];

        await createOrder(exchanges, order, orderTypeOnOpen);
      }

      if (!finalReturns?.length) {
        console.log('No profitable position available!');
      }

      for (const finalReturn of finalReturns?.slice(0, 3)) {
        console.log(
          `Position: Long ${finalReturn.symbol} on ${
            finalReturn.buyExchange
          } at ${finalReturn.selectedBuyPrice.toFixed(6)}, Short on ${
            finalReturn.sellExchange
          } at ${finalReturn.selectedSellPrice.toFixed(
            6,
          )}, Expected Return: ${finalReturn.selectedReturnPercentage.toFixed(
            2,
          )}%`,
        );
      }

      // Monitor open positions
      await monitorOpenPositions(exchanges, USDTPrice);
      console.log('-----------------------------\n\n');

      // Wait before next iteration
      await new Promise(resolve => setTimeout(resolve, refreshIntervalMs));
    } catch (error) {
      console.error('An error occurred:', error.message);
      // Wait before next iteration in case of error
      await new Promise(resolve => setTimeout(resolve, refreshIntervalMs));
    }
  }
}

// Start the script
main();
