import readline from 'readline';
import { setTimeout, clearTimeout } from 'timers';

// Function to retry order placement
export async function retryOrderCreation(
  exchanges,
  exchangeId,
  symbol,
  side,
  amount,
  price,
  maxRetries = 10,
  interval = 500,
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(
        `Attempt ${
          i + 1
        }/${maxRetries} to place ${side} order on ${exchangeId}`,
      );
      const order = await exchanges[exchangeId].createOrder(
        symbol,
        'market',
        side,
        amount,
        price,
      );
      console.log(`${side} order on ${exchangeId} successful.`);
      return order; // Success
    } catch (error) {
      console.error(
        `Failed to place ${side} order on ${exchangeId}: ${error.message}`,
      );
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, interval)); // Wait before retrying
      }
    }
  }
  return null; // Failure after retries
}

// Function to prompt the user
export function promptUser(question, defaultResponse = 'no', timeout = 5000) {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const timeoutId = setTimeout(() => {
      rl.close();
      resolve(defaultResponse.toLowerCase() === 'yes');
    }, timeout);

    rl.question(
      `${question} (yes/no) [default: ${defaultResponse}] `,
      answer => {
        clearTimeout(timeoutId);
        rl.close();
        resolve(answer.toLowerCase().trim() === 'yes');
      },
    );
  });
}

export async function handleFailedOrders({
  buyOrder,
  sellOrder,
  buyExchange,
  sellExchange,
  symbol,
  amountToTrade,
}) {
  if (!buyOrder || !sellOrder) {
    const failedSide = !buyOrder ? 'buy' : 'sell';
    const failedExchange = !buyOrder ? buyExchange : sellExchange;
    const successSide = buyOrder ? 'buy' : 'sell';
    const successOrder = buyOrder || sellOrder;
    const successExchange = buyOrder ? buyExchange : sellExchange;

    console.log(`Retrying failed ${failedSide} order on ${failedExchange}...`);
    const retryOrder = await retryOrderCreation(
      failedExchange,
      symbol,
      failedSide,
      amountToTrade,
      null, // Assuming price is null for market orders
    );

    if (!retryOrder) {
      const shouldContinue = await promptUser(
        `Failed to place ${failedSide} order on ${failedExchange} after retries. Continue trying?`,
        'no',
      );

      if (!shouldContinue) {
        console.log(`Closing ${successSide} position on ${successExchange}...`);
        await closePosition(successOrder); // Close successful order
        console.log(`${successSide} position closed.`);
      }
    }
  }
}
