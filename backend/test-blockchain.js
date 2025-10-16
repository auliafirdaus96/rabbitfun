const dotenv = require('dotenv');
dotenv.config();

// Test Alchemy API
async function testAlchemy() {
  try {
    console.log('🧪 Testing Alchemy API...');

    const response = await fetch(`https://bnb-testnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.log('❌ Alchemy Error:', data.error.message);
      return false;
    }

    const blockNumber = parseInt(data.result, 16);
    console.log(`✅ Alchemy Success! Current block: ${blockNumber}`);
    return true;
  } catch (error) {
    console.log('❌ Alchemy Error:', error.message);
    return false;
  }
}

// Test Moralis API
async function testMoralis() {
  try {
    console.log('🧪 Testing Moralis API...');

    // Test with a simple endpoint - getting wallet info
    const testAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b3Db21';

    const response = await fetch(`https://api.moralis.io/api/v2/${testAddress}?chain=bsc_testnet`, {
      method: 'GET',
      headers: {
        'X-API-Key': process.env.MORALIS_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log('❌ Moralis Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error details:', errorText);
      return false;
    }

    const data = await response.json();
    console.log('✅ Moralis Success! API is working');
    console.log('   Response type:', Array.isArray(data) ? 'array' : typeof data);
    return true;
  } catch (error) {
    console.log('❌ Moralis Error:', error.message);
    return false;
  }
}

// Test environment variables
function testEnvironmentVariables() {
  console.log('🧪 Testing Environment Variables...');

  const requiredVars = ['ALCHEMY_API_KEY', 'MORALIS_API_KEY'];
  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.log('❌ Missing environment variables:', missing);
    return false;
  }

  console.log('✅ All required environment variables found!');
  return true;
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Blockchain Integration Tests\n');

  const envTest = testEnvironmentVariables();
  const alchemyTest = await testAlchemy();
  const moralisTest = await testMoralis();

  console.log('\n📊 Test Results:');
  console.log(`Environment Variables: ${envTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Alchemy API: ${alchemyTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Moralis API: ${moralisTest ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = envTest && alchemyTest && moralisTest;
  console.log(`\n🎯 Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  if (allPassed) {
    console.log('\n🎉 Blockchain integration is ready for production!');
  } else {
    console.log('\n⚠️  Please fix the failing tests before proceeding.');
  }
}

// Run tests
runTests().catch(console.error);