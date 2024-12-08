import { storePosition } from './database.js'; // ensure correct path

export async function storeOpenPosition({
  symbol,
  buyExchange,
  sellExchange,
  amount,
  entryBuyPrice,
  entrySellPrice,
}) {
  await storePosition({
    symbol,
    buyExchange,
    sellExchange,
    amount,
    entryBuyPrice,
    entrySellPrice,
  });
  console.log('Open position stored in DB.');
}
