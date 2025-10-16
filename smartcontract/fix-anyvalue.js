const fs = require('fs');

console.log('🔧 Fixing anyValue placement...');

// Fix sell test file
let sellContent = fs.readFileSync('test/unit/RabbitLaunchpad.sell.test.ts', 'utf8');
sellContent = sellContent.replace(
  /import "\@nomicfoundation\/hardhat-chai-matchers";\s*\n\s*const anyValue = any;\n/,
  'import "@nomicfoundation/hardhat-chai-matchers";\n'
);
fs.writeFileSync('test/unit/RabbitLaunchpad.sell.test.ts', sellContent);

// Fix graduation test file
let gradContent = fs.readFileSync('test/unit/RabbitLaunchpad.graduation.test.ts', 'utf8');
gradContent = gradContent.replace(
  /import "\@nomicfoundation\/hardhat-chai-matchers";\s*\n\s*const anyValue = any;\n/,
  'import "@nomicfoundation/hardhat-chai-matchers";\n'
);
fs.writeFileSync('test/unit/RabbitLaunchpad.graduation.test.ts', gradContent);

// Add anyValue inside describe blocks for files that need it
const filesToFix = [
  'test/unit/RabbitLaunchpad.sell.test.ts',
  'test/unit/RabbitLaunchpad.graduation.test.ts'
];

filesToFix.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('anyValue') && !content.includes('const anyValue = any;')) {
    // Add anyValue declaration after the first describe block
    content = content.replace(
      /describe\(".*"\, function \(\) \{\s*let launchpad:/,
      'describe("$1", function () {\n  const anyValue = any;\n  let launchpad:'
    );
    fs.writeFileSync(filePath, content);
    console.log(`✅ Added anyValue declaration to ${filePath}`);
  }
});

console.log('✅ Fixed anyValue placement');