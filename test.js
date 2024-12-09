import ccxt from 'ccxt';

for (const ex of ccxt.exchanges) {
  let e = new ccxt[ex]();
  if (e.features) console.log(`${ex}:  ${e.features.future.inverse.sandbox}`);
}
