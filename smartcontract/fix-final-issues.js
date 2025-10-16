const fs = require('fs');

console.log('🔧 Fixing final TypeScript issues...');

// Fix anyValue issues
const filesToFix = [
  'test/unit/RabbitLaunchpad.graduation.test.ts',
  'test/unit/RabbitLaunchpad.sell.test.ts'
];

filesToFix.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace anyValue with any (type) for Chai matchers
    content = content.replace(
      /const anyValue = any;/g,
      '// anyValue is now using Chai any matcher directly'
    );

    content = content.replace(
      /anyValue/g,
      'any'
    );

    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed anyValue issue in ${filePath}`);
  }
});

// Fix gas test emergencyWithdraw issue
const gasTestPath = 'test/unit/RabbitLaunchpad.gas.test.ts';
if (fs.existsSync(gasTestPath)) {
  let content = fs.readFileSync(gasTestPath, 'utf8');

  // Fix emergencyWithdraw estimateGas call
  content = content.replace(
    /const gasUsed = await launchpad\.connect\(owner\)\.emergencyWithdraw\.estimateGas\(\);/g,
    'const gasUsed = await launchpad.connect(owner)["emergencyWithdraw(uint256)"].estimateGas(ethers.parseEther("1"));'
  );

  fs.writeFileSync(gasTestPath, content);
  console.log(`✅ Fixed gas test emergencyWithdraw issue`);
}

// Fix RabbitLaunchpad.test.ts import issues
const ahiruTestPath = 'test/unit/RabbitLaunchpad.test.ts';
if (fs.existsSync(ahiruTestPath)) {
  let content = fs.readFileSync(ahiruTestPath, 'utf8');

  // Fix imports
  content = content.replace(
    /from "\.\.\/\.\.\/typechain-types\/\@openzeppelin\/contracts\/token\/ERC20\/ERC20";/g,
    'from "../../client/src/types/contracts";'
  );

  content = content.replace(
    /let token: ERC20;/g,
    'let token: RabbitToken;'
  );

  // Add missing import
  if (content.includes('RabbitToken') && !content.includes('import { RabbitToken }')) {
    content = content.replace(
      /import { RabbitLaunchpad } from "\.\.\/\.\.\/client\/src\/types\/contracts";/,
      'import { RabbitLaunchpad, RabbitToken } from "../../client/src/types/contracts";'
    );
  }

  fs.writeFileSync(ahiruTestPath, content);
  console.log(`✅ Fixed RabbitLaunchpad.test.ts imports`);
}

// Fix BondingCurve.test.ts arithmetic issues
const bondingTestPath = 'test/unit/BondingCurve.test.ts';
if (fs.existsSync(bondingTestPath)) {
  let content = fs.readFileSync(bondingTestPath, 'utf8');

  // Fix CURVE_SLOPE reference
  content = content.replace(
    /launchpad\.CURVE_SLOPE/g,
    '5 * 10**19'
  );

  // Fix arithmetic operations with BigInt
  content = content.replace(
    /const result = soldSupply \* soldSupply;/g,
    'const result = Number(soldSupply) * Number(soldSupply);'
  );

  content = content.replace(
    /const price = await launchpad\.calculatePrice\(soldSupply\);/g,
    'const price = await launchpad.calculatePrice(soldSupply);'
  );

  content = content.replace(
    /expect\(result\).to\.equal\(price\);/g,
    'expect(result.toString()).to.equal(price.toString());'
  );

  // Fix more complex arithmetic
  content = content.replace(
    /const expectedPrice = 10 \* 10\*\*9 \+ soldSupply \* 5 \* 10\*\*19;/g,
    'const expectedPrice = BigInt(10 * 10**9) + soldSupply * BigInt(5 * 10**19);'
  );

  content = content.replace(
    /const newPrice = await launchpad\.calculatePrice\(newSoldSupply\);/g,
    'const newPrice = await launchpad.calculatePrice(newSoldSupply);'
  );

  content = content.replace(
    /const calculatedPrice = 10 \* 10\*\*9 \+ newSoldSupply \* 5 \* 10\*\*19;/g,
    'const calculatedPrice = BigInt(10 * 10**9) + newSoldSupply * BigInt(5 * 10**19);'
  );

  fs.writeFileSync(bondingTestPath, content);
  console.log(`✅ Fixed BondingCurve.test.ts arithmetic issues`);
}

console.log('✅ Final TypeScript issues fixed!');