export function originalizeSpecialCoinOrder(exchangeId, base, amount, price) {
  const { specialCoinStandardizations } = CONFIG;

  const standardizations = specialCoinStandardizations[exchangeId];
  const standardization = standardizations.filter(s => s.standardBase === base);

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
