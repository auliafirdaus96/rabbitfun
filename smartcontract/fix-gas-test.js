const fs = require('fs');

console.log('🔧 Fixing gas test file...');

let content = fs.readFileSync('test/unit/RabbitLaunchpad.gas.test.ts', 'utf8');

// Fix the broken estimateGas section
content = content.replace(
  /const tx = await ethers\.provider\.estimateGas\(\{\s*await treasury\.getAddress\(\),\s*await dexRouter\.getAddress\(\)\s*\}\);\s*const estimatedGas = await ethers\.provider\.estimateGas\(tx\);/g,
  `const deployTx = await Launchpad.getDeployTransaction(
        await treasury.getAddress(),
        await dexRouter.getAddress()
      );

      const estimatedGas = await ethers.provider.estimateGas(deployTx);`
);

// Fix emergencyWithdraw calls
content = content.replace(
  /launchpad\.connect\(owner\)\.emergencyWithdraw\(\)/g,
  "launchpad.connect(owner)['emergencyWithdraw()']()"
);

fs.writeFileSync('test/unit/RabbitLaunchpad.gas.test.ts', content);
console.log('✅ Fixed gas test file');