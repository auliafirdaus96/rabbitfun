#!/usr/bin/env node

/**
 * API Keys Setup Script
 *
 * This script helps developers set up their API keys for the Rabbit Launchpad backend
 * Usage: node scripts/setup-api-keys.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupApiKeys() {
  console.log('🔑 Rabbit Launchpad - API Keys Setup');
  console.log('=====================================\n');

  console.log('📋 This script will help you configure your API keys');
  console.log('You need API keys from Alchemy and Moralis for full functionality\n');

  const envPath = path.join(__dirname, '../.env.development');

  // Check if .env.development exists
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.development file not found!');
    console.log('Please copy .env.example to .env.development first');
    process.exit(1);
  }

  // Read current env file
  let envContent = fs.readFileSync(envPath, 'utf8');

  console.log('🔍 Checking current API key configuration...\n');

  // Check for existing keys
  const hasAlchemyKey = envContent.includes('ALCHEMY_API_KEY=your-alchemy-api-key-here') === false;
  const hasMoralisKey = envContent.includes('MORALIS_API_KEY=your-moralis-api-key-here') === false;

  console.log('Current Status:');
  console.log(`   Alchemy API Key: ${hasAlchemyKey ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Moralis API Key: ${hasMoralisKey ? '✅ Configured' : '❌ Not configured'}\n`);

  // Ask if user wants to configure API keys
  const configure = await question('Do you want to configure API keys now? (y/n): ');

  if (configure.toLowerCase() !== 'y' && configure.toLowerCase() !== 'yes') {
    console.log('⏭️  Skipping API key configuration');
    console.log('📖 See API_KEYS_SETUP.md for manual setup instructions');
    rl.close();
    return;
  }

  console.log('\n📝 API Key Configuration:');
  console.log('========================\n');

  // Alchemy API Key
  if (!hasAlchemyKey) {
    console.log('1️⃣  Alchemy API Key Setup:');
    console.log('   🔗 Get your key: https://dashboard.alchemy.com/');
    console.log('   📋 Select: Blockchain → BSC → Mainnet');

    const alchemyKey = await question('   ✍️  Enter your Alchemy API Key (or press Enter to skip): ');

    if (alchemyKey.trim()) {
      envContent = envContent.replace(
        /ALCHEMY_API_KEY=your-alchemy-api-key-here/,
        `ALCHEMY_API_KEY=${alchemyKey.trim()}`
      );
      console.log('   ✅ Alchemy API Key configured\n');
    } else {
      console.log('   ⏭️  Alchemy API Key skipped\n');
    }
  }

  // Moralis API Key
  if (!hasMoralisKey) {
    console.log('2️⃣  Moralis API Key Setup:');
    console.log('   🔗 Get your key: https://admin.moralis.io/');
    console.log('   📋 Go to Account → API Keys → Create new key');

    const moralisKey = await question('   ✍️  Enter your Moralis API Key (or press Enter to skip): ');

    if (moralisKey.trim()) {
      envContent = envContent.replace(
        /MORALIS_API_KEY=your-moralis-api-key-here/,
        `MORALIS_API_KEY=${moralisKey.trim()}`
      );
      console.log('   ✅ Moralis API Key configured\n');
    } else {
      console.log('   ⏭️  Moralis API Key skipped\n');
    }
  }

  // Optional API Keys
  console.log('3️⃣  Optional API Keys (enhance functionality):');

  const setupOptional = await question('   Do you want to configure optional API keys? (y/n): ');

  if (setupOptional.toLowerCase() === 'y' || setupOptional.toLowerCase() === 'yes') {

    // BSCScan API Key
    const bscscanKey = await question('   BSCScan API Key (optional): ');
    if (bscscanKey.trim()) {
      envContent = envContent.replace(
        /BSCSCAN_API_KEY=your-bscscan-api-key-here/,
        `BSCSCAN_API_KEY=${bscscanKey.trim()}`
      );
    }

    // CoinGecko API Key
    const coingeckoKey = await question('   CoinGecko API Key (optional): ');
    if (coingeckoKey.trim()) {
      envContent = envContent.replace(
        /COINGECKO_API_KEY=your-coingecko-api-key-here/,
        `COINGECKO_API_KEY=${coingeckoKey.trim()}`
      );
    }

    // Infura Project ID
    const infuraKey = await question('   Infura Project ID (optional): ');
    if (infuraKey.trim()) {
      envContent = envContent.replace(
        /INFURA_PROJECT_ID=your-infura-project-id-here/,
        `INFURA_PROJECT_ID=${infuraKey.trim()}`
      );
    }
  }

  // Save the updated env file
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Configuration saved to .env.development');
  console.log('\n🚀 Next Steps:');
  console.log('   1. Restart the development server: npm run dev');
  console.log('   2. Test the health endpoint: curl http://localhost:3001/health');
  console.log('   3. Check blockchain services: curl http://localhost:3001/api/blockchain/health');

  console.log('\n📚 Documentation:');
  console.log('   📖 Full setup guide: API_KEYS_SETUP.md');
  console.log('   🔧 Troubleshooting: Check server logs for detailed error messages');

  rl.close();
}

// Mock mode for testing
function setupMockApiKeys() {
  console.log('🧪 Setting up mock API keys for testing...\n');

  const envPath = path.join(__dirname, '../.env.development');

  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.development file not found!');
    return;
  }

  let envContent = fs.readFileSync(envPath, 'utf8');

  // Replace with mock keys
  const mockKeys = {
    'ALCHEMY_API_KEY=your-alchemy-api-key-here': 'ALCHEMY_API_KEY=demo-key-for-testing',
    'MORALIS_API_KEY=your-moralis-api-key-here': 'MORALIS_API_KEY=demo-key-for-testing',
    'BSCSCAN_API_KEY=your-bscscan-api-key-here': 'BSCSCAN_API_KEY=demo-key-for-testing',
    'COINGECKO_API_KEY=your-coingecko-api-key-here': 'COINGECKO_API_KEY=demo-key-for-testing',
    'INFURA_PROJECT_ID=your-infura-project-id-here': 'INFURA_PROJECT_ID=demo-key-for-testing'
  };

  Object.entries(mockKeys).forEach(([oldValue, newValue]) => {
    envContent = envContent.replace(oldValue, newValue);
  });

  fs.writeFileSync(envPath, envContent);

  console.log('✅ Mock API keys configured');
  console.log('🧪 Note: These are demo keys and will not provide real blockchain data');
  console.log('🔑 Replace with real API keys for production use');
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('API Keys Setup Script');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/setup-api-keys.js          # Interactive setup');
    console.log('  node scripts/setup-api-keys.js --mock    # Setup with mock keys');
    console.log('  node scripts/setup-api-keys.js --help    # Show this help');
    process.exit(0);
  }

  if (args.includes('--mock')) {
    setupMockApiKeys();
    return;
  }

  await setupApiKeys();
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Error:', error.message);
  rl.close();
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = { setupApiKeys, setupMockApiKeys };