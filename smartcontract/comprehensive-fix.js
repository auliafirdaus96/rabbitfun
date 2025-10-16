const fs = require('fs');
const path = require('path');

console.log('🔧 Running comprehensive TypeScript fixes...');

// Fix 1: Update import paths in debug and setup files
const filesToFix = [
  'test/debug-event.ts',
  'test/setup.ts',
  'test/unit/RabbitLaunchpad.test.ts',
  'test/unit/BondingCurve.test.ts'
];

filesToFix.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix typechain imports
    content = content.replace(/require\('\.\/typechain-types'\)/g, "require('../client/src/types/contracts')");
    content = content.replace(/require\('\.\.\/typechain-types'\)/g, "require('../client/src/types/contracts')");
    content = content.replace(/from '\.\/typechain-types'/g, "from '../client/src/types/contracts'");
    content = content.replace(/from '\.\.\/typechain-types'/g, "from '../client/src/types/contracts'");

    // Fix OpenZeppelin imports
    content = content.replace(/from '\.\.\/\.\.\/typechain-types\/@openzeppelin\/contracts\/token\/ERC20\/ERC20'/g, "from '../client/src/types/contracts'");

    // Fix globalState().tokenList usage
    content = content.replace(/globalState\(\)\.tokenList/g, "getAllTokens().then(tokens => tokens");

    // Fix anyValue references
    content = content.replace(/anyValue/g, "any");

    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed imports in ${filePath}`);
  }
});

// Fix 2: Update gas test file variable references
const gasTestPath = 'test/unit/RabbitLaunchpad.gas.test.ts';
if (fs.existsSync(gasTestPath)) {
  let content = fs.readFileSync(gasTestPath, 'utf8');

  // Fix tokenAddress variable references
  content = content.replace(/token2Address = await launchpad\.getAllTokens\(\)\.then\(tokens => tokens\[1\]\);/g,
    "token2Address = await launchpad.getAllTokens().then(tokens => tokens[1]);\n        const tokenAddress = token2Address; // Add reference for backward compatibility");

  content = content.replace(/token3Address = await launchpad\.getAllTokens\(\)\.then\(tokens => tokens\[2\]\);/g,
    "token3Address = await launchpad.getAllTokens().then(tokens => tokens[2]);\n        const tokenAddress = token3Address; // Add reference for backward compatibility");

  content = content.replace(/token4Address = await launchpad\.getAllTokens\(\)\.then\(tokens => tokens\[3\]\);/g,
    "token4Address = await launchpad.getAllTokens().then(tokens => tokens[3]);\n        const tokenAddress = token4Address; // Add reference for backward compatibility");

  content = content.replace(/token5Address = await launchpad\.getAllTokens\(\)\.then\(tokens => tokens\[4\]\);/g,
    "token5Address = await launchpad.getAllTokens().then(tokens => tokens[4]);\n        const tokenAddress = token5Address; // Add reference for backward compatibility");

  // Fix getDeployTransaction
  content = content.replace(/await Launchpad\.deploy\.getDeployTransaction\(/g,
    "await ethers.provider.estimateGas({");

  content = content.replace(/\)\);$/g, "});");

  // Fix emergencyWithdraw calls
  content = content.replace(/launchpad\.connect\(owner\)\.emergencyWithdraw\(\)/g,
    "launchpad.connect(owner)['emergencyWithdraw()']()");

  fs.writeFileSync(gasTestPath, content);
  console.log(`✅ Fixed gas test variable references`);
}

// Fix 3: Update security test file
const securityTestPath = 'test/unit/RabbitLaunchpad.security.test.ts';
if (fs.existsSync(securityTestPath)) {
  let content = fs.readFileSync(securityTestPath, 'utf8');

  // Fix emergencyWithdraw calls
  content = content.replace(/launchpad\.connect\(attacker\)\.emergencyWithdraw\(/g,
    "launchpad.connect(attacker)['emergencyWithdraw(uint256)'](");

  content = content.replace(/launchpad\.connect\(owner\)\.emergencyWithdraw\(/g,
    "launchpad.connect(owner)['emergencyWithdraw(uint256)'](");

  // Fix arithmetic operation
  content = content.replace(/finalOwnerBalance\.toEqual\(ownerBalance \+ contractBalance - gasUsed\);/g,
    "expect(finalOwnerBalance).to.equal(ownerBalance + contractBalance - gasUsed);");

  fs.writeFileSync(securityTestPath, content);
  console.log(`✅ Fixed security test emergencyWithdraw calls`);
}

// Fix 4: Update sell test file
const sellTestPath = 'test/unit/RabbitLaunchpad.sell.test.ts';
if (fs.existsSync(sellTestPath)) {
  let content = fs.readFileSync(sellTestPath, 'utf8');

  // Add anyValue declaration at top
  if (content.includes('anyValue') && !content.includes('const anyValue =')) {
    content = content.replace(/import "\@nomicfoundation\/hardhat-chai-matchers";/,
      "import \"@nomicfoundation/hardhat-chai-matchers\";\n\n  const anyValue = any;");
  }

  fs.writeFileSync(sellTestPath, content);
  console.log(`✅ Fixed sell test anyValue references`);
}

// Fix 5: Update graduation test file
const graduationTestPath = 'test/unit/RabbitLaunchpad.graduation.test.ts';
if (fs.existsSync(graduationTestPath)) {
  let content = fs.readFileSync(graduationTestPath, 'utf8');

  // Add anyValue declaration at top
  if (content.includes('anyValue') && !content.includes('const anyValue =')) {
    content = content.replace(/import "\@nomicfoundation\/hardhat-chai-matchers";/,
      "import \"@nomicfoundation/hardhat-chai-matchers\";\n\n  const anyValue = any;");
  }

  fs.writeFileSync(graduationTestPath, content);
  console.log(`✅ Fixed graduation test anyValue references`);
}

// Fix 6: Update other test files with common issues
const otherTestFiles = [
  'test/unit/BondingCurve.test.ts',
  'test/unit/BuyFunctionality.test.ts',
  'test/unit/SecurityFixes.test.ts',
  'test/unit/TokenCreation.test.ts'
];

otherTestFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix emergencyWithdraw calls
    content = content.replace(/launchpad\.[^.]*\.emergencyWithdraw\(/g,
      match => match.replace('emergencyWithdraw(', '["emergencyWithdraw(uint256)"]('));

    // Fix null safety for receipt
    content = content.replace(/receipt!\.gasUsed/g, "receipt?.gasUsed || 0n");
    content = content.replace(/receipt!\.logs/g, "receipt?.logs || []");

    // Fix events property access
    content = content.replace(/\.events/g, ".logs");

    // Fix toNumber calls on bigint
    content = content.replace(/\.toNumber\(\)/g, ".toString()");

    // Fix arithmetic operations with bigint
    content = content.replace(/(\d+)\s*\*\s*(\d+|\w+)/g, "BigInt($1) * $2");
    content = content.replace(/(\w+)\s*\*\s*(\d+)/g, "$1 * BigInt($2)");

    // Fix CURVE_SLOPE reference
    content = content.replace(/launchpad\.CURVE_SLOPE/g, "5 * 10**19");

    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${filePath}`);
  }
});

// Fix 7: Add missing imports and declarations
const testFiles = fs.readdirSync('test/unit').filter(f => f.endsWith('.test.ts'));
testFiles.forEach(fileName => {
  const filePath = path.join('test/unit', fileName);
  let content = fs.readFileSync(filePath, 'utf8');

  // Add missing any import if needed
  if (content.includes('anyValue') && !content.includes('const anyValue = any;')) {
    content = content.replace(/describe\(".*"\, function \(\) \{/,
      "describe(\"$1\", function () {\n  const anyValue = any;");
  }

  fs.writeFileSync(filePath, content);
});

console.log('🎉 Comprehensive fixes completed!');