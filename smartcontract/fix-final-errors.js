const fs = require('fs');
const path = require('path');

console.log('Performing final error fixes...');

// Get all test files
const testDir = path.join(__dirname, 'test/unit');
const testFiles = fs.readdirSync(testDir).filter(file => file.endsWith('.test.ts'));

testFiles.forEach(filePath => {
  const fullPath = path.join(testDir, filePath);
  console.log(`Processing: ${filePath}`);

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // First, normalize all problematic getAllTokens patterns
  const patterns = [
    // Fix any getAllTokens patterns with corrupted array access
    {
      pattern: /await launchpad\.getAllTokens\(\)\.then\(tokens => tokens\[([0-9]+)\]\)\./g,
      replacement: 'await launchpad.getAllTokens().then(tokens => tokens[$1]).'
    },
    // Fix patterns with extra brackets or spaces
    {
      pattern: /await launchpad\.getAllTokens\(\)\.then\(tokens => tokens\[\s*([0-9]+)\s*\]\s*\)\s*\./g,
      replacement: 'await launchpad.getAllTokens().then(tokens => tokens[$1]).'
    },
    // Fix any remaining patterns that might have corrupted bracket structure
    {
      pattern: /await launchpad\.getAllTokens\(\)\.then\(tokens => tokens\[\([0-9]+\)\]\)/g,
      replacement: 'await launchpad.getAllTokens().then(tokens => tokens[$1])'
    }
  ];

  patterns.forEach(patternObj => {
    const originalContent = content;
    content = content.replace(patternObj.pattern, patternObj.replacement);
    if (content !== originalContent) {
      modified = true;
      console.log(`  - Fixed getAllTokens pattern`);
    }
  });

  // Now fix any remaining globalState patterns
  const globalStatePatterns = [
    {
      pattern: /await \(await launchpad\.globalState\(\)\)\.totalFeesCollected/g,
      replacement: '(await launchpad.globalState()).totalFeesCollected'
    },
    {
      pattern: /await launchpad\.globalState\(\)\.then\(/g,
      replacement: 'await launchpad.globalState()'
    }
  ];

  globalStatePatterns.forEach(patternObj => {
    const originalContent = content;
    content = content.replace(patternObj.pattern, patternObj.replacement);
    if (content !== originalContent) {
      modified = true;
      console.log(`  - Fixed globalState pattern`);
    }
  });

  // Clean up any duplicate brackets or syntax issues
  const lines = content.split('\n');
  let changedLines = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Fix any lines with bracket issues at the end
    if (line.includes('getAllTokens().then(tokens => tokens[')) {
      // Ensure proper bracket closure
      line = line.replace(/\.then\(tokens => tokens\[\s*([0-9]+)\s*\]\s*\)\s*\./g, '.then(tokens => tokens[$1]).');
      changedLines = true;
    }

    // Fix any lines that have extra brackets at the end
    if (line.endsWith(')') && line.includes('getAllTokens()')) {
      // Check if this is a simple getAllTokens call that should end with a semicolon
      const beforeGetAllTokens = line.substring(0, line.indexOf('getAllTokens()'));
      const afterGetAllTokens = line.substring(line.indexOf('getAllTokens()') + 'getAllTokens()'.length);

      if (afterGetAllTokens.startsWith('.then(tokens => tokens[')) {
        // Fix the bracket pattern
        const newLine = beforeGetAllTokens + 'getAllTokens()' + afterGetAllTokens.replace(/\)\s*\./g, ').');
        line = newLine;
        changedLines = true;
      }
    }

    lines[i] = line;
  }

  if (changedLines) {
    content = lines.join('\n');
    modified = true;
    console.log(`  - Fixed bracket issues`);
  }

  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`  ✅ Fixed: ${filePath}`);
  } else {
    console.log(`  - No changes needed: ${filePath}`);
  }
});

console.log('\n✅ Final error fixes complete!');