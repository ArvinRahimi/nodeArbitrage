import { CONFIG } from '../config.js';
import { getVWAPs } from '../VWAP/VWAP.js';
import { closePosition } from '../close/closePosition.js';
import { addTMNSymbols } from '../utils/addTMNSymbols.js';
import { getOpenPositions } from '../utils/database.js';

export async function monitorOpenPositions(exchanges, USDTPrice) {
  const {
    orderTypeOnClose,
    tradeVolumeUSDT,
    returnTypeOnClose,
    closeMinMarginPercent,
  } = CONFIG;

  // Fetch open positions from the database
  let openPositions = [];
  try {
    openPositions = await getOpenPositions();
  } catch (error) {
    console.error('Failed to fetch open positions from the database:', error);
    return; // Exit early if we can't get positions
  }

  if (!openPositions?.length) {
    console.log('No open positions to monitor.');
    return;
  }

  console.log('Monitoring open positions...');

  const exchangeMap = {};

  // Loop through each position
  for (const position of openPositions) {
    const { symbol, buyExchange, sellExchange } = position;

    // Add symbol to buyExchange
    if (!exchangeMap[buyExchange]) {
      exchangeMap[buyExchange] = new Set(); // Use a Set to ensure uniqueness
    }
    exchangeMap[buyExchange].add(symbol);

    // Add symbol to sellExchange
    if (!exchangeMap[sellExchange]) {
      exchangeMap[sellExchange] = new Set(); // Use a Set to ensure uniqueness
    }
    exchangeMap[sellExchange].add(symbol);
  }

  // Convert Sets back to arrays
  for (const exchange in exchangeMap) {
    exchangeMap[exchange] = Array.from(exchangeMap[exchange]);
  }
  const vwapResultsByExchange = {};
  await Promise.all(
    Object.entries(exchangeMap).map(async ([exchangeId, symbols]) => {
      const vwapResults = await getVWAPs(
        exchanges,
        exchangeId,
        symbols,
        tradeVolumeUSDT,
        USDTPrice,
      );
      vwapResultsByExchange[exchangeId] = vwapResults;
    }),
  );

  addTMNSymbols(vwapResultsByExchange, USDTPrice);

  const finalReturns = calculateFinalReturnsFromOpenPositions(
    openPositions,
    vwapResultsByExchange,
    returnTypeOnClose,
    USDTPrice,
  );

  await processPositionsConcurrently(
    finalReturns,
    exchanges,
    closeMinMarginPercent,
    orderTypeOnClose,
  );

  console.log('Finished monitoring open positions.');
}

export function calculateFinalReturnsFromOpenPositions(
  openPositions,
  vwapResultsByExchange,
  returnTypeOnClose,
  USDTPrice,
) {
  const { fees, slippage } = CONFIG;
  const finalReturns = [];
  for (const openPosition of openPositions) {
    const {
      id,
      symbol,
      buyExchange,
      sellExchange,
      entryBuyPrice,
      entrySellPrice,
    } = openPosition;

    const buyVWAP = vwapResultsByExchange[sellExchange][symbol]?.asks;
    const sellVWAP = vwapResultsByExchange[buyExchange][symbol]?.bids;

    if (!buyVWAP || !sellVWAP) continue;

    const buyFee = fees[sellExchange].taker;
    const sellFee = fees[buyExchange].taker;

    const netBuyPrice = buyVWAP * (1 + buyFee);
    const netSellPrice = sellVWAP * (1 - sellFee);

    const profitSellExhange = entrySellPrice - netBuyPrice;
    const profitBuyExhange = netSellPrice - entryBuyPrice;
    const profit = profitBuyExhange + profitSellExhange;

    const returnPercentage = (profit / entrySellPrice + entryBuyPrice) * 100;

    // Calculate slippage-adjusted prices
    const netSellPriceWithSlippage = netSellPrice * (1 - slippage);
    const netBuyPriceWithSlippage = netBuyPrice * (1 + slippage);

    // Profit with slippage
    const profitSellExchangeWithSlippage =
      entrySellPrice - netBuyPriceWithSlippage;
    const profitBuyExchangeWithSlippage =
      netSellPriceWithSlippage - entryBuyPrice;
    const profitWithSlippage =
      profitSellExchangeWithSlippage + profitBuyExchangeWithSlippage;

    const returnPercentageWithSlippage =
      profitWithSlippage / (entrySellPrice + entryBuyPrice);

    let selectedBuyPrice;
    let selectedSellPrice;
    switch (returnTypeOnClose) {
      case 'slip':
        selectedBuyPrice = netBuyPriceWithSlippage;
        selectedSellPrice = netSellPriceWithSlippage;
        break;

      default:
        selectedBuyPrice = netBuyPrice;
        selectedSellPrice = netSellPrice;
        break;
    }

    const selectedReturnPercentage =
      ((selectedSellPrice - selectedBuyPrice) /
        (selectedSellPrice + selectedBuyPrice)) *
      100;

    finalReturns.push({
      openPosition,
      id: openPosition?.id,
      symbol,
      buyExchange,
      sellExchange,
      selectedBuyPrice,
      selectedSellPrice,
      selectedReturnPercentage,
      netBuyPrice,
      netSellPrice,
      returnPercentage,
      netBuyPriceWithSlippage,
      netSellPriceWithSlippage,
      returnPercentageWithSlippage,
      tradeVolumeUSDT,
      USDTPrice,
    });
  }
  return finalReturns;
}

const processPositionsConcurrently = async (
  finalReturns,
  exchanges,
  closeMinMarginPercent,
  orderTypeOnClose,
) => {
  // Map finalReturns to an array of promises
  const promises = finalReturns.map(async finalReturn => {
    const {
      id,
      symbol,
      buyExchange,
      sellExchange,
      amount,
      entryBuyPrice,
      entrySellPrice,
      selectedReturnPercentage, // Added for margin check
    } = finalReturn;

    const position = {
      id,
      symbol,
      buyExchange,
      sellExchange,
      amount,
      entryBuyPrice,
      entrySellPrice,
    };

    try {
      console.log(
        `Position ${symbol} on ${buyExchange}/${sellExchange}: Current Return: ${selectedReturnPercentage.toFixed(
          2,
        )}%`,
      );

      // Skip if exit condition is not met
      if (selectedReturnPercentage < closeMinMarginPercent) {
        console.log(`Exit condition not met for ${symbol}. Skipping...`);
        return; // Skip further processing for this position
      }

      console.log(
        `Exit condition met for ${symbol} on ${buyExchange}/${sellExchange}. Closing position...`,
      );

      // Close the position
      await closePosition(exchanges, position, orderTypeOnClose);
    } catch (error) {
      console.error(
        `Error monitoring position ${symbol} on ${buyExchange}/${sellExchange}:`,
        error.message,
      );
    }
  });

  // Execute all promises concurrently and wait for completion
  const results = await Promise.allSettled(promises);

  // Log the results
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(
        `Successfully processed position ${finalReturns[index].symbol}`,
      );
    } else {
      console.error(
        `Failed to process position ${finalReturns[index].symbol}:`,
        result.reason,
      );
    }
  });
};
