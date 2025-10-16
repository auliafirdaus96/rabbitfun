const fs = require('fs');

console.log('🔧 Fixing describe block names...');

const filesToFix = [
  'test/unit/RabbitLaunchpad.graduation.test.ts',
  'test/unit/RabbitLaunchpad.sell.test.ts'
];

filesToFix.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix graduation test describe name
    content = content.replace(
      /describe\("\$1", function \(\) \{\s*const anyValue: any = any;\s*let launchpad:/g,
      'describe("RabbitLaunchpad - Graduation Functionality", function () {\n  const anyValue: any = any;\n  let launchpad:'
    );

    // Fix sell test describe name
    content = content.replace(
      /describe\("\$1", function \(\) \{\s*const anyValue: any = any;\s*let launchpad:/g,
      'describe("RabbitLaunchpad - Sell Functionality", function () {\n  const anyValue: any = any;\n  let launchpad:'
    );

    // Replace any with anyValue in withArgs calls
    content = content.replace(
      /\.withArgs\(\s*[^\)]*,\s*([^\)]*any[^\)]*)\s*\);/g,
      (match, args) => {
        const fixedArgs = args.replace(/any/g, 'anyValue');
        return match.replace(args, fixedArgs);
      }
    );

    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed describe names in ${filePath}`);
  }
});

console.log('✅ Describe block names fixed!');