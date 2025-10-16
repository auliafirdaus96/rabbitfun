const fs = require('fs');

console.log('🔧 Fixing async function calls in BondingCurve.test.ts...');

const bondingTestPath = 'test/unit/BondingCurve.test.ts';
if (fs.existsSync(bondingTestPath)) {
  let content = fs.readFileSync(bondingTestPath, 'utf8');

  // Fix all calculateExpectedPrice calls to use await
  content = content.replace(
    /const price1 = calculateExpectedPrice\(supply1\);/g,
    'const price1 = await calculateExpectedPrice(supply1);'
  );

  content = content.replace(
    /const price2 = calculateExpectedPrice\(supply2\);/g,
    'const price2 = await calculateExpectedPrice(supply2);'
  );

  content = content.replace(
    /const expectedPrice = calculateExpectedPrice\(0n\);/g,
    'const expectedPrice = await calculateExpectedPrice(0n);'
  );

  content = content.replace(
    /const price = calculateExpectedPrice\(largeSupply\);/g,
    'const price = await calculateExpectedPrice(largeSupply);'
  );

  content = content.replace(
    /const currentPrice = calculateExpectedPrice\(currentSupply\);/g,
    'const currentPrice = await calculateExpectedPrice(currentSupply);'
  );

  content = content.replace(
    /const priceBefore = calculateExpectedPrice\(currentSupply\);/g,
    'const priceBefore = await calculateExpectedPrice(currentSupply);'
  );

  content = content.replace(
    /const priceAfter = calculateExpectedPrice\(currentSupply \+ tokensReceived\);/g,
    'const priceAfter = await calculateExpectedPrice(currentSupply + tokensReceived);'
  );

  content = content.replace(
    /const smallPriceAfter = calculateExpectedPrice\(currentSupply \+ smallTokens\);/g,
    'const smallPriceAfter = await calculateExpectedPrice(currentSupply + smallTokens);'
  );

  content = content.replace(
    /const largePriceAfter = calculateExpectedPrice\(currentSupply \+ largeTokens\);/g,
    'const largePriceAfter = await calculateExpectedPrice(currentSupply + largeTokens);'
  );

  // Make sure test functions that use these async calls are marked as async
  content = content.replace(
    /it\("Should calculate correct initial price", function \(\) \{/g,
    'it("Should calculate correct initial price", async function () {'
  );

  content = content.replace(
    /it\("Should increase price linearly with supply", function \(\) \{/g,
    'it("Should increase price linearly with supply", async function () {'
  );

  content = content.replace(
    /it\("Should handle very large supply values", function \(\) \{/g,
    'it("Should handle very large supply values", async function () {'
  );

  fs.writeFileSync(bondingTestPath, content);
  console.log(`✅ Fixed async function calls in BondingCurve.test.ts`);
}

console.log('✅ BondingCurve async issues fixed!');