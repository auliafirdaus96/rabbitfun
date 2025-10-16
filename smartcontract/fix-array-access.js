const fs = require('fs');
const path = require('path');

// Get all test files
const testDir = path.join(__dirname, 'test/unit');
const testFiles = fs.readdirSync(testDir).filter(file => file.endsWith('.test.ts'));

console.log('Fixing array access patterns...');

testFiles.forEach(filePath => {
  const fullPath = path.join(testDir, filePath);
  console.log(`Processing: ${filePath}`);

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Fix corrupted array access patterns
  const corruptedPattern = /\.then\(tokens => tokens\[([0-9]+)\]\)\./g;
  const fixedPattern = '.then(tokens => tokens[$1]).';

  const originalContent = content;
  content = content.replace(corruptedPattern, fixedPattern);

  if (content !== originalContent) {
    modified = true;
    console.log(`  - Fixed array access patterns`);
  }

  // Fix other syntax issues
  const fixes = [
    {
      pattern: /\.then\(tokens => tokens\[\([0-9]+\)\]\)/g,
      replacement: (match, index) => `.then(tokens => tokens[${index}])`
    },
    {
      pattern: /\.then\(\s*state\s*=>\s*state\.totalFeesCollected\s*\)/g,
      replacement: '.then(state => state.totalFeesCollected)'
    }
  ];

  fixes.forEach(fix => {
    const before = content;
    content = content.replace(fix.pattern, fix.replacement);
    if (content !== before) {
      modified = true;
      console.log(`  - Applied syntax fix`);
    }
  });

  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`  ✅ Fixed: ${filePath}`);
  } else {
    console.log(`  - No changes needed: ${filePath}`);
  }
});

console.log('\n✅ Array access fixes complete!');