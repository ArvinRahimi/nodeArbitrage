import 'dotenv/config';
// Configuration
export const CONFIG = {
  testMode: true,
  minMarginPercent: -0.2, // Minimum margin percentage to consider
  minVolumeUSD: 10, // Minimum trade volume in USDT
  returnTypeOnOpen: 'spread', // enum: [null, 'slip', 'spread']
  returnTypeOnClose: null, // enum: [null, 'slip']
  closeMinMarginPercent: 0.4,
  orderTypeOnOpen: 'limit',
  orderTypeOnClose: 'limit',
  leverage: 1, // Leverage for positions
  refreshIntervalMs: 10000, // Interval to refresh data in milliseconds
  fees: {
    coinex: { maker: 0.0015, taker: 0.0015 },
    nobitex: { maker: 0.0015, taker: 0.0015 },
    wallex: { maker: 0.001, taker: 0.001 },
  },
  slippage: 0.0005,
  exchangesToUse: ['nobitex', 'wallex'],
  customExchanges: ['nobitex', 'wallex'],
  coinsToConsider: null, // null means all coins
  coinsToIgnore: ['OMG', 'X', 'BCH'],
  specialCoinStandardizations: {
    nobitex: [
      {
        originalBase: '100K_FLOKI',
        standardBase: 'FLOKI',
        correctionFactor: 1e-5,
      },
      {
        originalBase: '1B_BABYDOGE',
        standardBase: 'BABYDOGE',
        correctionFactor: 1e-9,
      },
      {
        originalBase: '1M_BTT',
        standardBase: 'BTT',
        correctionFactor: 1e-6,
      },
      {
        originalBase: '1M_NFT',
        standardBase: 'NFT',
        correctionFactor: 1e-6,
      },
      {
        originalBase: '1M_PEPE',
        standardBase: 'PEPE',
        correctionFactor: 1e-6,
      },
      {
        originalBase: 'SHIB',
        standardBase: 'SHIB',
        correctionFactor: 1e-3,
      },
    ],
    wallex: [
      {
        originalBase: '1BBABYDOGE',
        standardBase: 'BABYDOGE',
        correctionFactor: 1e-9,
      },
    ],
  },
  exchangeParams: {
    coinex: {
      apiKey: process.env.COINEX_API_KEY,
      secret: process.env.COINEX_SECRET_KEY,
      options: {
        defaultType: 'future',
      },
    },
    nobitex: {
      apiKey: process.env.NOBITEX_API_KEY,
      secret: process.env.NOBITEX_SECRET_KEY,
    },
    wallex: {
      apiKey: process.env.WALLEX_API_KEY,
      secret: process.env.WALLEX_SECRET_KEY,
    },
  },
  databaseName: './open_positions.db',
};
