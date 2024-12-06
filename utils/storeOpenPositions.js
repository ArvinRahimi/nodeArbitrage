export function storeOpenPosition({
  symbol,
  buyExchange,
  sellExchange,
  amount,
  entryBuyPrice,
  entrySellPrice,
}) {
  openPositions.push({
    symbol,
    buyExchange,
    sellExchange,
    amount,
    entryBuyPrice,
    entrySellPrice,
    timestamp: Date.now(),
  });
  console.log('Open position stored.');
}
