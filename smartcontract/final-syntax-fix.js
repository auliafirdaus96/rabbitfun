const fs = require('fs');

console.log('🔧 Fixing final syntax errors...');

// Fix gas test file - the estimateGas syntax issue
let gasContent = fs.readFileSync('test/unit/RabbitLaunchpad.gas.test.ts', 'utf8');
gasContent = gasContent.replace(
  /const tx = await ethers\.provider\.estimateGas\(\{\s*await treasury\.getAddress\(\),\s*await dexRouter\.getAddress\(\)\s*\}\);/g,
  `const deployTx = await Launchpad.getDeployTransaction(
        await treasury.getAddress(),
        await dexRouter.getAddress()
      );`
);
gasContent = gasContent.replace(
  /const estimatedGas = await ethers\.provider\.estimateGas\(tx\);/g,
  'const estimatedGas = await ethers.provider.estimateGas(deployTx);'
);
fs.writeFileSync('test/unit/RabbitLaunchpad.gas.test.ts', gasContent);

// Fix security test file - emergencyWithdraw method calls
const securityFiles = [
  'test/unit/SecurityFixes.test.ts'
];

securityFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix emergencyWithdraw calls to use proper bracket notation
  content = content.replace(
    /\.emergencyWithdraw\(([^)]+)\)/g,
    '["emergencyWithdraw(uint256)"]($1)'
  );

  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed ${filePath}`);
});

// Fix other test files with similar syntax issues
const otherFiles = [
  'test/unit/BuyFunctionality.test.ts',
  'test/unit/TokenCreation.test.ts'
];

otherFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix any remaining syntax issues with method calls
  content = content.replace(/\.emergencyWithdraw\(\)/g, '["emergencyWithdraw()"]()');

  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed ${filePath}`);
});

console.log('✅ Fixed final syntax errors');