import { createOrder } from '../orderCreation/orderCreation.js';
import {
  moveToClosedPositions,
  updateOpenPosition,
} from '../utils/database.js';

export async function closePosition(
  exchanges,
  {
    id,
    symbol,
    buyExchange,
    sellExchange,
    amount,
    selectedBuyPrice,
    selectedSellPrice,
    tradeVolumeUSDT,
    USDTPrice,
  },
  type,
) {
  console.log(
    `Initiating position closure for ${symbol} on ${buyExchange}/${sellExchange}`,
  );

  try {
    await updateOpenPosition(id, { status: 'closing' });

    const closingOrderResult = await createOrder(
      exchanges,
      {
        symbol,
        buyExchange: sellExchange,
        sellExchange: buyExchange,
        selectedBuyPrice: selectedBuyPrice,
        selectedSellPrice: selectedSellPrice,
        tradeVolumeUSDT,
        netBuyPrice,
        netSellPrice,
        USDTPrice,
        amount,
      },
      type,
      true,
    );

    if (!closingOrderResult) {
      throw new Error('Failed to execute closing orders');
    }

    await moveToClosedPositions(id, {
      closeBuyPrice: selectedBuyPrice,
      closeSellPrice: selectedSellPrice,
    });

    const closeTime = new Date().toISOString();
    console.log(
      `Successfully closed position for ${symbol}:`,
      `\n- Buy Exchange: ${buyExchange}`,
      `\n- Sell Exchange: ${sellExchange}`,
      `\n- Amount: ${amount}`,
      `\n- Close Time: ${closeTime}`,
    );

    return {
      success: true,
      closeTime,
      closingOrders: closingOrderResult,
      message: 'Position closed successfully',
    };
  } catch (error) {
    await updateOpenPosition(id, { status: 'open' });

    console.error(
      `Failed to close position for ${symbol} on ${buyExchange}/${sellExchange}:`,
      error.message,
    );

    throw {
      success: false,
      error: error.message,
      details: {
        symbol,
        buyExchange,
        sellExchange,
        amount,
        failureTime: new Date().toISOString(),
      },
    };
  }
}
