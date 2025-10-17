import { RabbitClient } from '../src/client/RabbitClient';

async function exampleUsage() {
  // Initialize client
  const client = new RabbitClient();

  try {
    // Connect to wallet
    console.log('Connecting to wallet...');
    const connected = await client.connect();
    console.log('Connected:', connected);

    // Example 1: Create a new token
    console.log('\n=== Creating Token ===');
    const tokenResult = await client.createToken({
      name: "Example Token",
      symbol: "EX",
      metadata: "https://gateway.pinata.cloud/ipfs/QmExample123"
    });
    console.log('Token created:', tokenResult);

    // Extract token address from event
    const tokenAddress = tokenResult.events?.find(e => e.name === 'TokenCreated')?.args.tokenAddress;
    console.log('Token address:', tokenAddress);

    if (tokenAddress) {
      // Example 2: Get token info
      console.log('\n=== Token Info ===');
      const tokenInfo = await client.getTokenInfo(tokenAddress);
      console.log('Token info:', tokenInfo);

      // Example 3: Calculate buy preview
      console.log('\n=== Buy Preview ===');
      const buyPreview = await client.calculateBuyPreview(tokenAddress, "1.0");
      console.log('Buy preview:', buyPreview);

      // Example 4: Buy tokens
      console.log('\n=== Buying Tokens ===');
      const buyResult = await client.buy({
        tokenAddress: tokenAddress,
        bnbAmount: "1.0"
      });
      console.log('Buy result:', buyResult);

      // Example 5: Calculate sell preview
      console.log('\n=== Sell Preview ===');
      const sellPreview = await client.calculateSellPreview(tokenAddress, "1000");
      console.log('Sell preview:', sellPreview);

      // Example 6: Sell tokens
      console.log('\n=== Selling Tokens ===');
      const sellResult = await client.sell({
        tokenAddress: tokenAddress,
        tokenAmount: "1000"
      });
      console.log('Sell result:', sellResult);

      // Example 7: Get all tokens with pagination
      console.log('\n=== All Tokens ===');
      const allTokens = await client.getAllTokens(1, 5);
      console.log('All tokens:', allTokens);

      // Example 8: Monitor transaction status
      console.log('\n=== Transaction Status ===');
      const txStatus = await client.getTransactionStatus(buyResult.transactionHash);
      console.log('Transaction status:', txStatus);
    }

    // Example 9: Set up event listeners
    console.log('\n=== Setting Up Event Listeners ===');
    client.onTokenCreated((event) => {
      console.log('New token created:', event);
    });

    client.onTokenBought((event) => {
      console.log('Token purchased:', event);
    });

    client.onTokenSold((event) => {
      console.log('Token sold:', event);
    });

    client.onTokenGraduated((event) => {
      console.log('Token graduated:', event);
    });

    console.log('Event listeners set up!');

  } catch (error) {
    console.error('Example usage error:', error);
  }
}

// Error handling example
async function errorHandlingExample() {
  const client = new RabbitClient();

  try {
    await client.connect();

    // Try to buy from non-existent token
    await client.buy({
      tokenAddress: "0x0000000000000000000000000000000000000000",
      bnbAmount: "1.0"
    });
  } catch (error) {
    console.log('Handled error:', error);

    // Error object contains user-friendly message
    if (error.code) {
      console.log('Error code:', error.code);
      console.log('User message:', error.userFriendlyMessage);
    }
  }
}

// Pagination example
async function paginationExample() {
  const client = new RabbitClient();

  try {
    await client.connect();

    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`Loading page ${page}...`);

      const result = await client.getAllTokens(page, 10);
      console.log(`Page ${page}: ${result.tokens.length} tokens`);

      result.tokens.forEach(token => {
        console.log(`- ${token.name} (${token.symbol}): ${token.currentPrice} BNB`);
      });

      hasMore = result.hasNext;
      page++;
    }
  } catch (error) {
    console.error('Pagination error:', error);
  }
}

// Real-time updates example
async function realTimeUpdatesExample() {
  const client = new RabbitClient();

  try {
    await client.connect();

    // Set up real-time monitoring
    client.onTokenBought((event) => {
      console.log(`🟢 Purchase: ${ethers.formatEther(event.tokenAmount)} tokens for ${ethers.formatEther(event.bnbAmount)} BNB`);
    });

    client.onTokenSold((event) => {
      console.log(`🔴 Sale: ${ethers.formatEther(event.tokenAmount)} tokens for ${ethers.formatEther(event.bnbAmount)} BNB`);
    });

    client.onTokenCreated((event) => {
      console.log(`🆕 New token: ${event.name} (${event.symbol}) by ${event.creator}`);
    });

    client.onTokenGraduated((event) => {
      console.log(`🎓 Token graduated: ${event.tokenAddress} - LP: ${event.lpBNB} BNB + ${event.lpTokens} tokens`);
    });

    console.log('Real-time monitoring started!');

    // Keep monitoring...
    // In a real app, this would run continuously

  } catch (error) {
    console.error('Real-time monitoring error:', error);
  }
}

// Export examples for use in frontend
export {
  exampleUsage,
  errorHandlingExample,
  paginationExample,
  realTimeUpdatesExample
};

// Run examples if this file is executed directly
if (require.main === module) {
  console.log('Running RabbitClient examples...');

  exampleUsage()
    .then(() => errorHandlingExample())
    .then(() => paginationExample())
    .then(() => realTimeUpdatesExample())
    .catch(console.error);
}