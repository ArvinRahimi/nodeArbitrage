import { CONFIG } from '../config.js';

export function originalizeSpecialCoinOrder(exchangeId, base, amount, price) {
  const { specialCoinStandardizations } = CONFIG;

  const standardizations = specialCoinStandardizations[exchangeId];
  const standardization = standardizations.find(s => s.standardBase === base);

  if (!standardization) {
    // If no special standardization is found, return original values
    return {
      transformedBase: base,
      transformedAmount: amount,
      transformedPrice: price,
    };
  }

  const { originalBase, correctionFactor } = standardization;

  const transformedBase = originalBase;
  const transformedAmount = amount * correctionFactor;
  const transformedPrice = price / correctionFactor;

  const transformedValues = {
    transformedBase,
    transformedAmount,
    transformedPrice,
  };

  return transformedValues;
}
