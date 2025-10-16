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

console.log('Found test files:', testFiles);

// Fix patterns
const fixes = [
  // Import fixes
  {
    pattern: /import\s+\{[^}]+\}\s+from\s+["\']\.\.\/\.\.\/typechain-types["\'];?/g,
    replacement: (match) => {
      // Extract the imports and convert to correct path
      const imports = match.match(/\{([^}]+)\}/)[1];
      const contractNames = imports.split(',').map(s => s.trim());
      const newImports = contractNames.map(name => {
        if (name === 'ERC20') return `import { RabbitToken } from "../../client/src/types/contracts";`;
        return `import { ${name} } from "../../client/src/types/contracts";`;
      }).join('\n');
      return newImports;
    }
  },

  // ERC20 to RabbitToken type declaration
  {
    pattern: /let\s+token:\s*ERC20;/g,
    replacement: 'let token: RabbitToken;'
  },

  // getContractAt ERC20 to RabbitToken
  {
    pattern: /ethers\.getContractAt\("ERC20"/g,
    replacement: 'ethers.getContractAt("RabbitToken"'
  },

  // globalState tokenList to getAllTokens
  {
    pattern: /globalState\(\)\.then\(state => state\.tokenList\[/g,
    replacement: 'getAllTokens().then(tokens => tokens['
  },

  // totalFeesCollected access
  {
    pattern: /globalState\(\)\.then\(state => state\.totalFeesCollected\)/g,
    replacement: '(await globalState()).totalFeesCollected'
  },

  // BigInt literals
  {
    pattern: /(\s)1n/g,
    replacement: '$1BigInt(1)'
  },

  // Add Chai matchers import
  {
    pattern: /import\s+\{\s*expect\s*\}\s+from\s+["\']chai["\'];?\s*\nimport\s+\{\s*ethers\s*\}\s+from\s+["\']hardhat["\'];?\s*\nimport\s+\{\s*SignerWithAddress\s*\}\s+from\s+["\']@nomicfoundation\/hardhat-ethers\/signers["\'];?/g,
    replacement: `import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import "@nomicfoundation/hardhat-chai-matchers";`
  }
];

// Process each file
testFiles.forEach(filePath => {
  console.log(`Processing: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  fixes.forEach(fix => {
    const originalContent = content;
    content = content.replace(fix.pattern, fix.replacement);
    if (content !== originalContent) {
      modified = true;
      console.log(`  - Applied fix: ${fix.pattern}`);
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ Fixed: ${filePath}`);
  } else {
    console.log(`  - No fixes needed: ${filePath}`);
  }
});

console.log('\n✅ Test fixing complete!');