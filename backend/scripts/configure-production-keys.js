#!/usr/bin/env node

/**
 * Production API Keys Configuration Script
 *
 * This script helps configure real API keys for production deployment
 * Usage: node scripts/configure-production-keys.js
 */

require('dotenv').config({ path: '.env.production' });
const fs = require('fs');
const crypto = require('crypto');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Real API key formats (examples)
const apiKeyFormats = {
  alchemy: {
    name: 'Alchemy API Key',
    format: '0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    example: '0x1234567890abcdef1234567890abcdef12345678',
    getUrl: 'https://dashboard.alchemy.com/',
    instructions: [
      '1. Go to https://dashboard.alchemy.com/',
      '2. Sign up or login',
      '3. Create a new app',
      '4. Select "Blockchain" → "BSC" (Binance Smart Chain)',
      '5. Choose network: "Mainnet"',
      '6. Copy the API key (starts with 0x...)'
    ]
  },
  moralis: {
    name: 'Moralis API Key',
    format: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    getUrl: 'https://admin.moralis.io/',
    instructions: [
      '1. Go to https://admin.moralis.io/',
      '2. Sign up or login',
      '3. Go to "Account" → "API Keys"',
      '4. Create a new API key',
      '5. Copy the API key (JWT format)'
    ]
  },
  bscscan: {
    name: 'BSCScan API Key',
    format: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    example: 'ABCD1234EFGH5678IJKL9012MNOP3456QRST7890',
    getUrl: 'https://bscscan.com/apis',
    instructions: [
      '1. Go to https://bscscan.com/apis',
      '2. Sign up or login',
      '3. Create a free API key',
      '4. Copy the API key'
    ]
  },
  infura: {
    name: 'Infura Project ID',
    format: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    example: '1234567890abcdef1234567890abcdef',
    getUrl: 'https://infura.io/',
    instructions: [
      '1. Go to https://infura.io/',
      '2. Sign up or login',
      '3. Create a new project',
      '4. Select "Web3 API" → "BSC"',
      '5. Copy the Project ID'
    ]
  }
};

function validateApiKeyFormat(key, type) {
  const format = apiKeyFormats[type];

  if (!key || key.includes('your-') && key.includes('-here')) {
    return { valid: false, error: 'Placeholder value detected' };
  }

  if (type === 'alchemy' && !key.startsWith('0x')) {
    return { valid: false, error: 'Alchemy key should start with 0x' };
  }

  if (type === 'moralis' && !key.startsWith('eyJ')) {
    return { valid: false, error: 'Moralis key should be a JWT token' };
  }

  if (key.length < 20) {
    return { valid: false, error: 'API key too short' };
  }

  return { valid: true };
}

function showInstructions(type) {
  const config = apiKeyFormats[type];

  log(`\n🔑 ${config.name} Configuration:`, 'cyan');
  log('='.repeat(50), 'cyan');
  log(`📝 Expected Format: ${config.format}`, 'blue');
  log(`🌐 Get it from: ${config.getUrl}`, 'blue');
  log('\n📋 Step-by-step instructions:', 'yellow');

  config.instructions.forEach((instruction, index) => {
    log(`   ${instruction}`, 'white');
  });

  log(`\n💡 Example: ${config.example}`, 'blue');
  log('');
}

function createInteractiveConfiguration() {
  log('🔧 Production API Keys Configuration', 'blue');
  log('=========================================', 'blue');
  log('');
  log('This script will help you configure real API keys for production deployment.', 'white');
  log('You will need API keys from Alchemy, Moralis, and optionally other services.', 'white');
  log('');

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const config = {};

  return new Promise((resolve) => {
    let currentIndex = 0;
    const types = Object.keys(apiKeyFormats);

    function askForNextKey() {
      if (currentIndex >= types.length) {
        rl.close();
        resolve(config);
        return;
      }

      const type = types[currentIndex];
      const keyConfig = apiKeyFormats[type];

      showInstructions(type);

      rl.question(`Enter your ${keyConfig.name} (or press Enter to skip): `, (answer) => {
        if (answer && answer.trim()) {
          const validation = validateApiKeyFormat(answer.trim(), type);
          if (validation.valid) {
            config[`${type.toUpperCase()}_API_KEY`] = answer.trim();
            log(`✅ ${keyConfig.name} configured successfully`, 'green');
          } else {
            log(`❌ Invalid ${keyConfig.name}: ${validation.error}`, 'red');
            log('💡 Please try again or skip for now', 'yellow');
          }
        } else {
          log(`⚠️  ${keyConfig.name} skipped`, 'yellow');
        }

        currentIndex++;
        askForNextKey();
      });
    }

    askForNextKey();
  });
}

function updateEnvironmentFile(config) {
  log('\n📝 Updating environment files...', 'cyan');

  // Update .env.production
  const prodEnvPath = '.env.production';
  let prodContent = '';

  if (fs.existsSync(prodEnvPath)) {
    prodContent = fs.readFileSync(prodEnvPath, 'utf8');
  } else {
    prodContent = fs.readFileSync('.env.production.example', 'utf8');
  }

  // Update each API key
  Object.entries(config).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(prodContent)) {
      prodContent = prodContent.replace(regex, `${key}=${value}`);
      log(`✅ Updated ${key} in production environment`, 'green');
    } else {
      prodContent += `\n${key}=${value}`;
      log(`✅ Added ${key} to production environment`, 'green');
    }
  });

  fs.writeFileSync(prodEnvPath, prodContent);

  // Also update .env.development for testing
  const devEnvPath = '.env.development';
  let devContent = fs.readFileSync(devEnvPath, 'utf8');

  Object.entries(config).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(devContent)) {
      devContent = devContent.replace(regex, `${key}=${value}`);
      log(`✅ Updated ${key} in development environment`, 'green');
    }
  });

  fs.writeFileSync(devEnvPath, devContent);
}

function showConfigurationSummary(config) {
  log('\n📊 Configuration Summary:', 'cyan');
  log('==========================', 'cyan');

  const types = Object.keys(apiKeyFormats);
  let configuredCount = 0;

  types.forEach(type => {
    const key = `${type.toUpperCase()}_API_KEY`;
    const keyConfig = apiKeyFormats[type];

    if (config[key]) {
      const masked = config[key].substring(0, 8) + '...' + config[key].substring(config[key].length - 4);
      log(`✅ ${keyConfig.name}: ${masked}`, 'green');
      configuredCount++;
    } else {
      log(`❌ ${keyConfig.name}: Not configured`, 'red');
    }
  });

  log(`\n📈 Progress: ${configuredCount}/${types.length} API keys configured`,
    configuredCount === types.length ? 'green' : 'yellow');

  if (configuredCount === types.length) {
    log('\n🎉 All API keys configured successfully!', 'green');
    log('🚀 Your application is ready for production deployment!', 'green');
  } else {
    log('\n⚠️  Some API keys are still missing.', 'yellow');
    log('📝 You can configure them later by following the guides in API_KEYS_PRODUCTION.md', 'yellow');
  }

  log('\n🔍 Test your configuration:', 'blue');
  log('   node scripts/test-api-keys.js', 'blue');
}

function generateSecureSecrets() {
  log('\n🔒 Generating secure secrets...', 'cyan');

  const secrets = {
    JWT_SECRET: crypto.randomBytes(64).toString('hex'),
    POSTGRES_PASSWORD: crypto.randomBytes(16).toString('hex'),
    REDIS_PASSWORD: crypto.randomBytes(16).toString('hex'),
    GRAFANA_PASSWORD: crypto.randomBytes(12).toString('hex')
  };

  return secrets;
}

function main() {
  log('🐰 Rabbit Launchpad - Production Setup', 'blue');
  log('=====================================', 'blue');

  (async () => {
    try {
      // Interactive API key configuration
      const apiKeys = await createInteractiveConfiguration();

      // Generate secure secrets
      const secrets = generateSecureSecrets();

      // Update environment files
      updateEnvironmentFile({ ...apiKeys, ...secrets });

      // Show summary
      showConfigurationSummary(apiKeys);

      // Show next steps
      log('\n📋 Next Steps:', 'cyan');
      log('================', 'cyan');
      log('1. Test API keys: node scripts/test-api-keys.js', 'white');
      log('2. Setup PostgreSQL: node scripts/setup-postgresql-simple.js', 'white');
      log('3. Deploy: docker-compose -f docker-compose.prod.yml up -d', 'white');
      log('4. Monitor: curl http://localhost:3001/health', 'white');

    } catch (error) {
      log(`❌ Configuration failed: ${error.message}`, 'red');
      process.exit(1);
    }
  })();
}

// Handle errors gracefully
process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Unhandled Error: ${reason}`, 'red');
  process.exit(1);
});

// Run the configuration
if (require.main === module) {
  main();
}

module.exports = { main, validateApiKeyFormat, apiKeyFormats };