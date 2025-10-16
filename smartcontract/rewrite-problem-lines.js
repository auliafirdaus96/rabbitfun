const fs = require('fs');
const path = require('path');

console.log('Rewriting problematic lines...');

// Get all test files with errors
const errorFiles = [
  'AhiruLaunchpad.fee.test.ts',
  'AhiruLaunchpad.gas.test.ts',
  'AhiruLaunchpad.graduation.test.ts',
  'AhiruLaunchpad.security.test.ts',
  'AhiruLaunchpad.sell.test.ts'
];

// Known problematic line positions and their correct replacements
const lineFixes = {
  'AhiruLaunchpad.fee.test.ts': {
    40: '    const tokenAddress = await launchpad.getAllTokens().then(tokens => tokens[0]);',
    362: '      const token2Address = await launchpad.getAllTokens().then(tokens => tokens[1]);',
    412: '      const tokenAddress = await sameAddressLaunchpad.getAllTokens().then(tokens => tokens[0]);'
  },
  'AhiruLaunchpad.gas.test.ts': {
    37: '    const tokenAddress = await launchpad.getAllTokens().then(tokens => tokens[0]);',
    161: '      const token2Address = await launchpad.getAllTokens().then(tokens => tokens[1]);',
    244: '      const token3Address = await launchpad.getAllTokens().then(tokens => tokens[2]);',
    317: '      const token4Address = await launchpad.getAllTokens().then(tokens => tokens[3]);',
    463: '      const token5Address = await launchpad.getAllTokens().then(tokens => tokens[4]);'
  },
  'AhiruLaunchpad.graduation.test.ts': {
    39: '    const tokenAddress = await launchpad.getAllTokens().then(tokens => tokens[0]);'
  },
  'AhiruLaunchpad.security.test.ts': {
    38: '    const tokenAddress = await launchpad.getAllTokens().then(tokens => tokens[0]);'
  },
  'AhiruLaunchpad.sell.test.ts': {
    39: '    const tokenAddress = await launchpad.getAllTokens().then(tokens => tokens[0]);'
  }
};

errorFiles.forEach(fileName => {
  const fullPath = path.join(__dirname, 'test/unit', fileName);
  console.log(`Processing: ${fileName}`);

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  const lines = content.split('\n');
  const fixes = lineFixes[fileName];

  if (fixes) {
    Object.keys(fixes).forEach(lineNumber => {
      const lineIndex = parseInt(lineNumber) - 1; // Convert to 0-based index
      if (lines[lineIndex] !== undefined) {
        const originalLine = lines[lineIndex];
        const correctLine = fixes[lineNumber];

        // Check if the line contains getAllTokens and needs fixing
        if (originalLine.includes('getAllTokens()') && originalLine !== correctLine) {
          lines[lineIndex] = correctLine;
          modified = true;
          console.log(`  - Fixed line ${lineNumber}: ${originalLine.trim()} -> ${correctLine.trim()}`);
        }
      }
    });
  }

  if (modified) {
    content = lines.join('\n');
    fs.writeFileSync(fullPath, content);
    console.log(`  ✅ Fixed: ${fileName}`);
  } else {
    console.log(`  - No changes needed: ${fileName}`);
  }
});

console.log('\n✅ Line rewrites complete!');