const fs = require('fs');

console.log('🔧 Fixing remaining any and other issues...');

// Fix any usage issues in test files
const filesToFix = [
  'test/unit/RabbitLaunchpad.graduation.test.ts',
  'test/unit/RabbitLaunchpad.sell.test.ts'
];

filesToFix.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace any with anyValue for Chai matchers - but need to import it properly
    content = content.replace(
      /const anyValue = any;\s*let launchpad:/g,
      'let launchpad:'
    );

    content = content.replace(
      /\/\/ any is now using Chai any matcher directly\s*let launchpad:/g,
      'const anyValue: any = any;\n  let launchpad:'
    );

    // Replace 'any' with 'anyValue' in .withArgs() calls
    content = content.replace(
      /\.withArgs\(\s*[^\)]+,([^)]+)\);/g,
      (match, rest) => {
        if (rest.includes('any')) {
          return match.replace(/any/g, 'anyValue');
        }
        return match;
      }
    );

    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed any issues in ${filePath}`);
  }
});

// Fix RabbitLaunchpad.test.ts ERC20 import
const ahiruTestPath = 'test/unit/RabbitLaunchpad.test.ts';
if (fs.existsSync(ahiruTestPath)) {
  let content = fs.readFileSync(ahiruTestPath, 'utf8');

  // Remove ERC20 import since it doesn't exist in contracts
  content = content.replace(
    /import \{ ERC20 \} from "\.\.\/\.\.\/client\/src\/types\/contracts";\s*\n/g,
    ''
  );

  // Add RabbitToken import if not present
  if (content.includes('let token: RabbitToken') && !content.includes('import { RabbitToken }')) {
    content = content.replace(
      /import { RabbitLaunchpad } from "\.\.\/\.\.\/client\/src\/types\/contracts";/,
      'import { RabbitLaunchpad, RabbitToken } from "../../client/src/types/contracts";'
    );
  }

  fs.writeFileSync(ahiruTestPath, content);
  console.log(`✅ Fixed RabbitLaunchpad.test.ts ERC20 import`);
}

// Fix TokenCreation.test.ts Promise.all issue
const tokenCreationPath = 'test/unit/TokenCreation.test.ts';
if (fs.existsSync(tokenCreationPath)) {
  let content = fs.readFileSync(tokenCreationPath, 'utf8');

  // Fix Promise.all with async operations
  content = content.replace(
    /const \[receipt1, receipt2, receipt3\] = await Promise\.all\(\[\s*tx1,\s*tx2,\s*tx3,\s*\]\.map\(tx => tx\.wait\(\)\)\);/g,
    `const receipt1 = await tx1.wait();
      const receipt2 = await tx2.wait();
      const receipt3 = await tx3.wait();`
  );

  fs.writeFileSync(tokenCreationPath, content);
  console.log(`✅ Fixed TokenCreation.test.ts Promise.all issue`);
}

// Fix BondingCurve.test.ts remaining arithmetic issues
const bondingTestPath = 'test/unit/BondingCurve.test.ts';
if (fs.existsSync(bondingTestPath)) {
  let content = fs.readFileSync(bondingTestPath, 'utf8');

  // Fix remaining CURVE_SLOPE reference
  content = content.replace(
    /launchpad\.CURVE_SLOPE/g,
    '5n * 10n**19n'
  );

  // Fix arithmetic operations by converting to BigInt properly
  content = content.replace(
    /const result = soldSupply \* soldSupply;/g,
    'const result = soldSupply * soldSupply;'
  );

  // Fix calculatePrice usage - it returns a Promise
  content = content.replace(
    /const price = await launchpad\.calculatePrice\(soldSupply\);/g,
    'const price = await launchpad.calculatePrice(soldSupply);'
  );

  // Fix arithmetic with BigInt in calculations
  content = content.replace(
    /(\w+)\s*\*\s*(\d+\s*\*\s*10\*\*\d+)/g,
    '$1 * BigInt($2)'
  );

  content = content.replace(
    /(\d+\s*\*\s*10\*\*\d+)\s*\*\s*(\w+)/g,
    'BigInt($1) * $2'
  );

  fs.writeFileSync(bondingTestPath, content);
  console.log(`✅ Fixed BondingCurve.test.ts arithmetic issues`);
}

console.log('✅ Remaining any and other issues fixed!');