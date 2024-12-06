//! It ,ust be read and reviewd based on create order completely

// Close Open Positions
export async function closePosition(position) {
  const { symbol, buyExchange, sellExchange, amount } = position;

  console.log(
    `Closing position for ${symbol} on ${buyExchange} and ${sellExchange}`,
  );

  // Close Buy Position (Sell)
  try {
    if (exchanges[buyExchange]) {
      await exchanges[buyExchange].createMarketSellOrder(symbol, amount);
    } else {
      console.log(`Custom order closing needed for ${buyExchange}`);
      // Implement custom order closing for Nobitex or Wallex
    }
  } catch (error) {
    console.error(`Error closing position on ${buyExchange}:`, error.message);
  }

  // Close Sell Position (Buy)
  try {
    if (exchanges[sellExchange]) {
      await exchanges[sellExchange].createMarketBuyOrder(symbol, amount);
    } else {
      console.log(`Custom order closing needed for ${sellExchange}`);
      // Implement custom order closing for Nobitex or Wallex
    }
  } catch (error) {
    console.error(`Error closing position on ${sellExchange}:`, error.message);
  }

  console.log(`Position for ${symbol} closed.`);
}
