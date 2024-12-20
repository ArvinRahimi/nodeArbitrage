import axios from 'axios';
import { CONFIG } from '../config.js';
import { originalizeSpecialCoinOrder } from '../transforms/originalizations.js';

export async function createExchangeOrder(
  exchangeId,
  symbol,
  type,
  side,
  amount,
  price,
  exchanges,
  USDTPrice,
  pricePrecision,
) {
  switch (exchangeId) {
    case 'nobitex':
      return createNobitexOrder(
        symbol,
        type,
        side,
        amount,
        price,
        pricePrecision,
      );

    case 'wallex':
      return createWallexOrder(
        symbol,
        type,
        side,
        amount,
        price,
        pricePrecision,
      );

    default:
      let convertedValues;
      if (symbol.endsWith('/TMN')) {
        convertedValues = convertTMNOrderToUSDT(symbol, price, USDTPrice);
      }
      let convertedSymbol = convertedValues?.convertedSymbol || symbol;
      const convertedPrice = convertedValues?.convertedPrice || price;
      if (
        !symbol.endsWith('/TMN') &&
        CONFIG.exchangeParams[exchangeId]?.options?.defaultType === 'future'
      ) {
        const [base, quote] = convertedSymbol.split('/');
        convertedSymbol = `${base}/${quote}:${quote}`;
      }
      return exchanges[exchangeId].createOrder(
        convertedSymbol,
        type,
        side,
        amount,
        convertedPrice,
      );
  }
}

async function createNobitexOrder(
  symbol,
  type,
  side,
  amount,
  price,
  priceDecimals,
) {
  const { exchangeParams } = CONFIG;
  const apiKey = exchangeParams.nobitex.apiKey;

  // Nobitex expects the symbol in a specific format (e.g., 'BTCIRT')
  const [base, quote] = symbol.split('/');

  let {
    transformedBase: nobitexBase,
    transformedAmount: nobitexAmount,
    transformedPrice: nobitexPrice,
  } = originalizeSpecialCoinOrder('nobitex', base, amount, price);

  const url = 'https://testnetapi.nobitex.ir/market/orders/add';
  console.log(apiKey);
  const headers = {
    Authorization: `Token ${apiKey}`,
    'Content-Type': 'application/json',
    UserAgent: `TraderBot/19977`,
  };
  const dstCurrency = quote === 'TMN' ? 'rls' : 'usdt';
  let srcCurrency = nobitexBase.toLowerCase();
  nobitexPrice = quote === 'TMN' ? nobitexPrice * 10 : nobitexPrice;

  let body = {
    type: side,
    execution: type,
    srcCurrency,
    dstCurrency,
    amount: nobitexAmount.toString(),
    price: nobitexPrice.toFixed(priceDecimals),
  };

  try {
    const response = await axios.post(url, body, { headers });
    if (response.data.status === 'failed') {
      throw new Error(
        `Nobitex order creation failed: ${JSON.stringify(response.data)}`,
      );
    }
    console.log(
      `Nobitex order created successfully: ${JSON.stringify(response.data)}`,
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error creating Nobitex order: ${
        error.response ? JSON.stringify(error.response.data) : error.message
      }`,
    );
    throw error;
  }
}

async function createWallexOrder(
  symbol,
  type,
  side,
  amount,
  price,
  priceDecimals,
) {
  const { exchangeParams } = CONFIG;
  const apiKey = exchangeParams.wallex.apiKey;

  const [base, quote] = symbol.split('/');

  let {
    transformedBase: wallexBase,
    transformedAmount: wallexAmount,
    transformedPrice: wallexPrice,
  } = originalizeSpecialCoinOrder('wallex', base, amount, price);

  // Wallex expects the symbol in a specific format (e.g., 'BTCUSDT')
  const wallexSymbol = wallexBase + quote;

  const url = 'https://api.wallex.ir/v1/order/create';
  const timestamp = Date.now();

  const body = {
    symbol: wallexSymbol,
    type,
    side,
    quantity: wallexAmount.toString(),
    price: wallexPrice.toFixed(priceDecimals),
    timestamp,
  };

  const headers = {
    'x-api-key': apiKey,
    'Content-Type': 'application/json',
  };

  try {
    const response = await axios.post(url, body, { headers });

    if (response.data.code !== 201 && response.data.code !== 200) {
      throw new Error(
        `Wallex order creation failed: ${JSON.stringify(response.data)}`,
      );
    }

    console.log(
      `Wallex order created successfully: ${JSON.stringify(response.data)}`,
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error creating Wallex order: ${
        error.response ? JSON.stringify(error.response.data) : error.message
      }`,
    );
    throw error;
  }
}

function convertTMNOrderToUSDT(symbol, price, USDTPrice) {
  const convertedSymbol = symbol.replace('/TMN', '/USDT');
  const convertedPrice = price / USDTPrice;

  return { convertedSymbol, convertedPrice };
}
