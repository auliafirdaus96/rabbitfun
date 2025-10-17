#!/usr/bin/env node

/**
 * API Keys Testing Script
 *
 * This script tests if the configured API keys are working correctly
 * Usage: node scripts/test-api-keys.js
 */

const axios = require('axios');
require('dotenv').config({ path: '.env.development' });

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// API Key tests
const tests = [
  {
    name: 'Alchemy API Key',
    envVar: 'ALCHEMY_API_KEY',
    test: async (apiKey) => {
      if (!apiKey || apiKey === 'your-alchemy-api-key-here') {
        throw new Error('API key not configured');
      }

      const response = await axios.get(`https://mainnet.bsc.alchemyapi.io/v2/${apiKey}`, {
        data: {
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        }
      });

      if (response.data.result) {
        return `✅ Connected - Latest block: ${parseInt(response.data.result, 16)}`;
      }
      throw new Error('Invalid response');
    }
  },
  {
    name: 'Moralis API Key',
    envVar: 'MORALIS_API_KEY',
    test: async (apiKey) => {
      if (!apiKey || apiKey === 'your-moralis-api-key-here') {
        throw new Error('API key not configured');
      }

      const response = await axios.get('https://deep-index.moralis.io/api/v2.2/erc20/0x2170Ed0880ac9A755fd29B2688956BD959F933F8/price', {
        headers: {
          'X-API-Key': apiKey
        }
      });

      if (response.data.usdPrice) {
        return `✅ Connected - BNB Price: $${response.data.usdPrice}`;
      }
      throw new Error('Invalid response');
    }
  },
  {
    name: 'BSCScan API Key',
    envVar: 'BSCSCAN_API_KEY',
    test: async (apiKey) => {
      if (!apiKey || apiKey === 'your-bscscan-api-key-here') {
        throw new Error('API key not configured');
      }

      const response = await axios.get('https://api.bscscan.com/api', {
        params: {
          module: 'proxy',
          action: 'eth_blockNumber',
          apikey: apiKey
        }
      });

      if (response.data.status === '1') {
        return `✅ Connected - Latest block: ${parseInt(response.data.result, 16)}`;
      }
      throw new Error('Invalid API key');
    }
  },
  {
    name: 'Infura Project ID',
    envVar: 'INFURA_PROJECT_ID',
    test: async (projectId) => {
      if (!projectId || projectId === 'your-infura-project-id-here') {
        throw new Error('Project ID not configured');
      }

      const response = await axios.post(`https://bsc-mainnet.infura.io/v3/${projectId}`, {
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      });

      if (response.data.result) {
        return `✅ Connected - Latest block: ${parseInt(response.data.result, 16)}`;
      }
      throw new Error('Invalid project ID');
    }
  },
  {
    name: 'CoinGecko API Key',
    envVar: 'COINGECKO_API_KEY',
    test: async (apiKey) => {
      if (!apiKey || apiKey === 'demo-key-for-testing' || apiKey === 'your-coingecko-api-key-here') {
        // CoinGecko allows some requests without API key
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd');
        if (response.data.binancecoin && response.data.binancecoin.usd) {
          return `✅ Connected (Public API) - BNB Price: $${response.data.binancecoin.usd}`;
        }
        throw new Error('API not responding');
      }

      // With API key
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd', {
        headers: {
          'x-cg-demo-api-key': apiKey
        }
      });

      if (response.data.binancecoin && response.data.binancecoin.usd) {
        return `✅ Connected (Pro API) - BNB Price: $${response.data.binancecoin.usd}`;
      }
      throw new Error('Invalid API key');
    }
  }
];

async function runTests() {
  log('🔑 API Keys Testing Script', 'blue');
  log('================================', 'blue');
  log('');

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    const apiKey = process.env[test.envVar];

    log(`📊 Testing: ${test.name}`, 'yellow');
    log(`   Environment Variable: ${test.envVar}`);

    if (!apiKey) {
      log(`   ❌ Not configured - missing environment variable`, 'red');
      log('');
      continue;
    }

    if (apiKey.includes('your-') && apiKey.includes('-here')) {
      log(`   ⚠️  Placeholder value detected - needs real API key`, 'yellow');
      log('');
      continue;
    }

    try {
      const result = await test.test(apiKey);
      log(`   ${result}`, 'green');
      passedTests++;
    } catch (error) {
      log(`   ❌ Failed: ${error.message}`, 'red');

      // Provide specific help for common errors
      if (error.message.includes('Must be authenticated')) {
        log(`   💡 Tip: Check if the API key is correct and active`, 'yellow');
      } else if (error.message.includes('rate limit')) {
        log(`   💡 Tip: Rate limit exceeded - wait and try again`, 'yellow');
      } else if (error.message.includes('ENOTFOUND')) {
        log(`   💡 Tip: Network connection issue - check internet`, 'yellow');
      }
    }

    log('');
  }

  // Summary
  log('📈 Test Summary', 'blue');
  log('================', 'blue');
  log(`✅ Passed: ${passedTests}/${totalTests} tests`, passedTests === totalTests ? 'green' : 'yellow');
  log(`❌ Failed: ${totalTests - passedTests}/${totalTests} tests`, totalTests - passedTests > 0 ? 'red' : 'green');
  log('');

  if (passedTests === totalTests) {
    log('🎉 All API keys are working correctly!', 'green');
    log('🚀 Your Rabbit Launchpad is ready for production!', 'green');
  } else {
    log('⚠️  Some API keys need attention:', 'yellow');
    log('');
    log('📝 Next Steps:', 'yellow');
    log('1. Replace placeholder API keys with real ones', 'yellow');
    log('2. Follow the guide in API_KEYS_PRODUCTION.md', 'yellow');
    log('3. Test again after configuration', 'yellow');
    log('');
    log('🔗 Get API Keys:', 'yellow');
    log('• Alchemy: https://dashboard.alchemy.com/', 'blue');
    log('• Moralis: https://admin.moralis.io/', 'blue');
    log('• BSCScan: https://bscscan.com/apis', 'blue');
    log('• Infura: https://infura.io/', 'blue');
    log('• CoinGecko: https://www.coingecko.com/en/api', 'blue');
  }

  log('');
}

// Handle errors gracefully
process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Unhandled Error: ${reason}`, 'red');
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runTests().catch((error) => {
    log(`❌ Test script failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runTests, tests };