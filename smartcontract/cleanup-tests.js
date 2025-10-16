const fs = require('fs');
const path = require('path');

// Get all test files
const testDir = path.join(__dirname, 'test');
const testFiles = [];

function findTestFiles(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findTestFiles(filePath);
    } else if (file.endsWith('.test.ts')) {
      testFiles.push(filePath);
    }
  });
}

findTestFiles(testDir);

console.log('Cleaning up test files...');

// Fix syntax errors
const syntaxFixes = [
  // Fix array destructuring in globalState calls
  {
    pattern: /globalState\(\)\.then\(\s*state\s*=>\s*\{[^}]+\}\s*\)/g,
    replacement: (match) => {
      return 'globalState()';
    }
  },

  // Fix totalFeesCollected access
  {
    pattern: /globalState\(\)\.then\(\s*state\s*=>\s*state\.totalFeesCollected\s*\)/g,
    replacement: '(await globalState()).totalFeesCollected'
  },

  // Fix double imports
  {
    pattern: /import\s+"@nomicfoundation\/hardhat-chai-matchers";\s*\nimport\s+"@nomicfoundation\/hardhat-chai-matchers";?/g,
    replacement: 'import "@nomicfoundation/hardhat-chai-matchers";'
  },

  // Fix BigInt expressions
  {
    pattern: /ethers\.parseEther\("([^"]+)"\) \+ BigInt\(1\)/g,
    replacement: (match, etherValue) => `ethers.parseEther("${etherValue}") + BigInt(1)`
  },

  // Fix array access patterns
  {
    pattern: /\.then\(tokens => tokens\[([0-9]+)\]\)\.then\(/g,
    replacement: (match, index) => `.then(tokens => tokens[${index}]).then(`
  },

  // Fix chained promises
  {
    pattern: /\.then\([^)]+\)\.then\(/g,
    replacement: (match, capture) => {
      return match.replace(/\.then\(([^)]+)\)/g, (subMatch, args) => {
        return `.then(${args})`;
      });
    }
  }
];

// Process each file
testFiles.forEach(filePath => {
  console.log(`Processing: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  syntaxFixes.forEach(fix => {
    const originalContent = content;
    content = content.replace(fix.pattern, fix.replacement);
    if (content !== originalContent) {
      modified = true;
      console.log(`  - Applied syntax fix`);
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ Cleaned: ${filePath}`);
  } else {
    console.log(`  - No cleaning needed: ${filePath}`);
  }
});

console.log('\n✅ Test cleanup complete!');