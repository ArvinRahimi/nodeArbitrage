import axios from 'axios';
import { standardizeSpecialCoinPrecisions } from '../transforms/standardizations.js';

// precisions example: 0.0000001
async function getNobitexPrecisions() {
  try {
    const response = await axios.get(
      'https://testnetapi.nobitex.ir/v2/options',
    );
    const { amountPrecisions, pricePrecisions } = response.data.nobitex;
    const nobitexPricePrecisions = {};
    const nobitexAmountPrecisions = {};

    for (const originalSymbol in pricePrecisions) {
      let base = originalSymbol.replace(/(IRT|USDT)$/, '');
      let quote = originalSymbol.replace(new RegExp(`^${base}`), '');
      quote = quote === 'IRT' ? 'TMN' : quote;
      const standardizedSymbol = base + '/' + quote;
      nobitexPricePrecisions[standardizedSymbol] = parseFloat(
        pricePrecisions[originalSymbol],
      );
    }
    for (const originalSymbol in amountPrecisions) {
      const base = originalSymbol.replace(/(IRT|USDT)$/, '');
      const quote = originalSymbol.replace(new RegExp(`^${base}`), '');
      const standardizedSymbol = base + '/' + quote;
      nobitexAmountPrecisions[standardizedSymbol] = parseFloat(
        amountPrecisions[originalSymbol],
      );
    }
    const nobitexPrecisions = {
      amountPrecisions: nobitexAmountPrecisions,
      pricePrecisions: nobitexPricePrecisions,
    };
    standardizeSpecialCoinPrecisions('nobitex', nobitexPrecisions);
    return nobitexPrecisions;
  } catch (error) {
    console.error('Error fetching nobitex precisions:', error);
  }
}

async function getWallexPrecisions() {
  try {
    const response = await axios.get('https://api.wallex.ir/v1/markets');
    const precisions = response.data.result.symbols;

    const wallexAmountPrecisions = {};
    const wallexPricePrecisions = {};
    for (const originalSymbol in precisions) {
      const precision = precisions[originalSymbol];
      const base = precision.baseAsset;
      const quote = precision.quoteAsset;

      const standardizedSymbol = base + '/' + quote;
      wallexAmountPrecisions[standardizedSymbol] = precision.minQty;
      wallexPricePrecisions[standardizedSymbol] = precision?.quotePrecision
        ? 10 ** -precision.quotePrecision
        : 10 ** -precision?.quoteAssetPrecision;
    }
    const wallexPrecisions = {
      amountPrecisions: wallexAmountPrecisions,
      pricePrecisions: wallexPricePrecisions,
    };
    standardizeSpecialCoinPrecisions('wallex', wallexPrecisions);
    return wallexPrecisions;
  } catch (error) {}
}

const nobitexPrecisions = await getNobitexPrecisions();
const wallexPrecisions = await getWallexPrecisions();

export function findLargestPriceAndAmounPrecisions(symbol) {
  const pricePrecisions = [
    nobitexPrecisions.pricePrecisions[symbol],
    wallexPrecisions.pricePrecisions[symbol],
  ];
  const amountPrecisions = [
    nobitexPrecisions.amountPrecisions[symbol],
    wallexPrecisions.amountPrecisions[symbol],
  ];

  const amountPrecision = Math.max(...amountPrecisions);
  const pricePrecision = Math.max(...pricePrecisions);
  const precision = { amountPrecision, pricePrecision };

  return precision;
}
