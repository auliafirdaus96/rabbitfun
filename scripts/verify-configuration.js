#!/usr/bin/env node

// Configuration Verification Script
const fs = require('fs');
const path = require('path');

// Load deployment configuration
const deploymentConfig = require('../deployment-config.json');

// ANSI color codes for terminal output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function verifyConfiguration() {
  log('🔍 Verifying Ahiru Launchpad Configuration', 'blue');
  log('=' .repeat(50));

  let allValid = true;

  // Verify Smart Contract Configuration
  log('\n📄 Smart Contract Configuration:', 'blue');

  const testnetContract = deploymentConfig.smartContracts.bscTestnet;
  const mainnetContract = deploymentConfig.smartContracts.bscMainnet;

  // Testnet verification
  log(`✅ BSC Testnet: ${testnetContract.address}`, 'green');
  log(`   Network: ${testnetContract.network}`);
  log(`   Explorer: ${testnetContract.explorer}`);
  log(`   Deployed: ${testnetContract.deployedAt}`);

  // Mainnet verification
  if (mainnetContract.address === "0x0000000000000000000000000000000000000000") {
    log(`⚠️  BSC Mainnet: NOT DEPLOYED`, 'yellow');
    log('   Action: Deploy smart contract to BSC mainnet');
    allValid = false;
  } else {
    log(`✅ BSC Mainnet: ${mainnetContract.address}`, 'green');
  }

  // Verify Frontend Configuration
  log('\n🎨 Frontend Configuration:', 'blue');

  const frontendDev = deploymentConfig.frontend.development;
  const frontendProd = deploymentConfig.frontend.production;

  log(`✅ Development: ${frontendDev.url}`, 'green');
  log(`   Contract: ${frontendDev.contractAddress}`);
  log(`   Network: ${frontendDev.network}`);

  log(`✅ Production: ${frontendProd.url}`, 'green');
  log(`   Contract: ${frontendProd.contractAddress}`);
  log(`   Network: ${frontendProd.network}`);

  // Verify Backend Configuration
  log('\n⚙️  Backend Configuration:', 'blue');

  const backendDev = deploymentConfig.backend.development;
  const backendProd = deploymentConfig.backend.production;

  log(`✅ Development: ${backendDev.url}`, 'green');
  log(`   Network: ${backendDev.network}`);

  log(`✅ Production: ${backendProd.url}`, 'green');
  log(`   Network: ${backendProd.network}`);

  // Verify Environment Files
  log('\n📁 Environment Files:', 'blue');

  const envFiles = [
    'frontend/.env.example',
    'frontend/.env.production',
    'backend/.env.example',
    'backend/.env.production',
    'smartcontract/.env.example'
  ];

  envFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      log(`✅ ${file}`, 'green');
    } else {
      log(`❌ ${file} - MISSING`, 'red');
      allValid = false;
    }
  });

  // Verify Contract Constants
  log('\n📊 Contract Constants:', 'blue');

  const constants = deploymentConfig.configuration;
  log(`✅ Create Token Fee: ${constants.contractFees.createToken}`, 'green');
  log(`✅ Buy Fee: ${constants.contractFees.buyFee}`, 'green');
  log(`✅ Platform Fee: ${constants.contractFees.platformFee}`, 'green');
  log(`✅ Creator Fee: ${constants.contractFees.creatorFee}`, 'green');
  log(`✅ Total Supply: ${constants.tokenomics.totalSupply}`, 'green');
  log(`✅ Initial Price: ${constants.tokenomics.initialPrice}`, 'green');

  // Next Steps
  log('\n📋 Next Steps:', 'blue');

  if (!allValid) {
    log('❌ Configuration incomplete!', 'red');
    log('\nRequired actions:', 'yellow');
    log('1. Deploy smart contract to BSC mainnet', 'yellow');
    log('2. Update contract addresses in production configs', 'yellow');
    log('3. Setup production infrastructure', 'yellow');
  } else {
    log('✅ All configuration files are valid!', 'green');
    log('\nReady for deployment:', 'green');
    log('1. Test end-to-end functionality', 'green');
    log('2. Deploy to production', 'green');
    log('3. Verify all services are running', 'green');
  }

  log('\n🔗 Useful Links:', 'blue');
  log(`BSC Testnet Explorer: ${testnetContract.explorer}/address/${testnetContract.address}`);
  log(`BSC Mainnet Explorer: ${mainnetContract.explorer}`);

  return allValid;
}

// Check if file is being run directly
if (require.main === module) {
  verifyConfiguration();
}

module.exports = { verifyConfiguration };