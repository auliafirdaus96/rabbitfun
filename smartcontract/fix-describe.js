const fs = require('fs');

console.log('🔧 Fixing describe blocks...');

// Fix sell test file
let sellContent = fs.readFileSync('test/unit/RabbitLaunchpad.sell.test.ts', 'utf8');
sellContent = sellContent.replace(
  /describe\("\$1", function \(\) \{\s*const anyValue = any;\s*let launchpad:/,
  'describe("RabbitLaunchpad - Sell Functionality", function () {\n  const anyValue = any;\n  let launchpad:'
);
fs.writeFileSync('test/unit/RabbitLaunchpad.sell.test.ts', sellContent);

// Fix graduation test file
let gradContent = fs.readFileSync('test/unit/RabbitLaunchpad.graduation.test.ts', 'utf8');
gradContent = gradContent.replace(
  /describe\("\$1", function \(\) \{\s*const anyValue = any;\s*let launchpad:/,
  'describe("RabbitLaunchpad - Graduation Functionality", function () {\n  const anyValue = any;\n  let launchpad:'
);
fs.writeFileSync('test/unit/RabbitLaunchpad.graduation.test.ts', gradContent);

console.log('✅ Fixed describe blocks');