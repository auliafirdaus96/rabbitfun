const fs = require('fs');
const path = require('path');

console.log('Fixing remaining syntax errors...');

// Get all test files
const testDir = path.join(__dirname, 'test/unit');
const testFiles = fs.readdirSync(testDir).filter(file => file.endsWith('.test.ts'));

testFiles.forEach(filePath => {
  const fullPath = path.join(testDir, filePath);
  console.log(`Processing: ${filePath}`);

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Fix malformed array access patterns with extra brackets
  const fixes = [
    {
      pattern: /\.then\(tokens => tokens\[\(([0-9]+)\)\]\)/g,
      replacement: '.then(tokens => tokens[$1])'
    },
    {
      pattern: /\.then\(tokens => tokens\[\s*([0-9]+)\s*\]\s*\)\s*\./g,
      replacement: '.then(tokens => tokens[$1]).'
    },
    {
      pattern: /\.then\(tokens => tokens\[\s*\(([0-9]+)\)\s*\]\s*\)\s*\./g,
      replacement: '.then(tokens => tokens[$1]).'
    },
    // Fix any remaining issues with bracket placement
    {
      pattern: /\.then\(tokens => tokens\[\s*([0-9]+)\s*\]\s*\)/g,
      replacement: '.then(tokens => tokens[$1])'
    }
  ];

  fixes.forEach(fix => {
    const originalContent = content;
    content = content.replace(fix.pattern, fix.replacement);
    if (content !== originalContent) {
      modified = true;
      console.log(`  - Applied syntax fix`);
    }
  });

  // Remove any remaining problematic characters around array access
  const lines = content.split('\n');
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for patterns that have bracket issues
    if (line.includes('.then(tokens => tokens[')) {
      // Fix bracket placement issues
      lines[i] = line.replace(/\.then\(tokens => tokens\[\s*([0-9]+)\s*\]\s*\)\s*\./g, '.then(tokens => tokens[$1]).');
      changed = true;
    }
  }

  if (changed) {
    content = lines.join('\n');
    modified = true;
    console.log(`  - Fixed bracket placement`);
  }

  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`  ✅ Fixed: ${filePath}`);
  } else {
    console.log(`  - No changes needed: ${filePath}`);
  }
});

console.log('\n✅ Syntax error fixes complete!');