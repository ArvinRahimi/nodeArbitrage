export async function createExchangeOrder(
  exchangeId,
  symbol,
  type = 'market',
  side,
  amount,
  price,
  exchanges,
  USDTPrice,
) {
  if (exchangeId === 'nobitex') {
    return createNobitexOrder(symbol, type, side, amount, price);
  } else if (exchangeId === 'wallex') {
    return createWallexOrder(symbol, type, side, amount, price);
  } else {
    let convertedValues;
    if (symbol.endWith('/TMN')) {
      convertedValues = convertTMNOrderToUSDT(symbol, price, USDTPrice);
    }
    convertedSymbol = convertedValues?.convertedSymbol || symbol;
    convertedPrice = convertedValues?.convertedPrice || price;

    return exchanges[exchangeId].createOrder(
      convertedSymbol,
      type,
      side,
      amount,
      convertedPrice,
    );
  }
}

async function createNobitexOrder(symbol, type, side, amount) {
  // COMPLETE this function based on Nobitex (Iranian crypto exchange) API documents
}

async function createWallexOrder(symbol, type, side, amount) {
  // COMPLETE this function based on Nobitex (Iranian crypto exchange) API documents
}

function convertTMNOrderToUSDT(symbol, price, USDTPrice) {
  const convertedSymbol = symbol.replace('/TMN', '/USDT');
  const convertedPrice = price / USDTPrice;
  return { convertedSymbol, convertedPrice };
}
