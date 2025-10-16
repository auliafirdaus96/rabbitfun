const fs = require('fs');
const path = require('path');

console.log('Fixing slope property errors...');

// Get all test files
const testDir = path.join(__dirname, 'test/unit');
const testFiles = fs.readdirSync(testDir).filter(file => file.endsWith('.test.ts'));

testFiles.forEach(filePath => {
  const fullPath = path.join(testDir, filePath);
  console.log(`Processing: ${filePath}`);

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Fix calculateTokenSale calls that use tokenInfo.slope
  const tokenSalePattern = /calculateTokenSale\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*[^)]+\s*\)/g;
  const originalContent = content;

  content = content.replace(tokenSalePattern, (match, soldSupply, tokenAmount, initialPrice) => {
    // Replace the slope parameter with 0 or remove it, since slope is not used in the actual contract
    return `calculateTokenSale(${soldSupply}, ${tokenAmount}, ${initialPrice}, 0)`;
  });

  if (content !== originalContent) {
    modified = true;
    console.log(`  - Fixed calculateTokenSale calls`);
  }

  // Fix any other references to tokenInfo.slope
  const slopePattern = /tokenInfo\.slope/g;
  const beforeSlopeFix = content;
  content = content.replace(slopePattern, '0'); // Replace with 0 since slope is not used

  if (content !== beforeSlopeFix) {
    modified = true;
    console.log(`  - Fixed tokenInfo.slope references`);
  }

  // Fix any direct slope property access in other contexts
  const directSlopePattern = /\.slope/g;
  const beforeDirectFix = content;
  content = content.replace(directSlopePattern, (match) => {
    // Only replace if it's not part of a longer property name
    if (match.length === 5) { // ".slope" is 5 characters
      return ' /* slope removed */ ';
    }
    return match;
  });

  if (content !== beforeDirectFix) {
    modified = true;
    console.log(`  - Fixed direct slope references`);
  }

  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`  ✅ Fixed: ${filePath}`);
  } else {
    console.log(`  - No slope errors found: ${filePath}`);
  }
});

console.log('\n✅ Slope error fixes complete!');