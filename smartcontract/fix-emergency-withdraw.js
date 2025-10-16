const fs = require('fs');
const path = require('path');

console.log('Fixing emergencyWithdraw function calls...');

// Get all test files
const testDir = path.join(__dirname, 'test/unit');
const testFiles = fs.readdirSync(testDir).filter(file => file.endsWith('.test.ts'));

testFiles.forEach(filePath => {
  const fullPath = path.join(testDir, filePath);
  console.log(`Processing: ${filePath}`);

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Fix old emergencyWithdraw() syntax
  const oldPattern = /\["emergencyWithdraw\(\)"\]\(\)/g;
  const originalContent = content;

  content = content.replace(oldPattern, 'emergencyWithdraw(ethers.parseEther("1"))');

  if (content !== originalContent) {
    modified = true;
    console.log(`  - Fixed emergencyWithdraw() calls`);
  }

  // Fix any direct emergencyWithdraw() calls
  const directPattern = /emergencyWithdraw\(\)/g;
  const beforeDirectFix = content;
  content = content.replace(directPattern, 'emergencyWithdraw(ethers.parseEther("1"))');

  if (content !== beforeDirectFix) {
    modified = true;
    console.log(`  - Fixed direct emergencyWithdraw() calls`);
  }

  // Fix emergencyWithdraw calls without parameters in other contexts
  const noParamPattern = /\.emergencyWithdraw\(\s*\)/g;
  const beforeNoParamFix = content;
  content = content.replace(noParamPattern, '.emergencyWithdraw(ethers.parseEther("1"))');

  if (content !== beforeNoParamFix) {
    modified = true;
    console.log(`  - Fixed no-param emergencyWithdraw calls`);
  }

  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`  ✅ Fixed: ${filePath}`);
  } else {
    console.log(`  - No emergencyWithdraw issues found: ${filePath}`);
  }
});

console.log('\n✅ Emergency withdraw fixes complete!');