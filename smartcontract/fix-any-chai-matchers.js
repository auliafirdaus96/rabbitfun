const fs = require('fs');

console.log('🔧 Fixing any value usage in Chai matchers...');

const filesToFix = [
  'test/unit/RabbitLaunchpad.graduation.test.ts',
  'test/unit/RabbitLaunchpad.sell.test.ts'
];

filesToFix.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Add anyValue declaration after describe block
    content = content.replace(
      /describe\(".*"\, function \(\) \{\s*let launchpad:/g,
      'describe("$1", function () {\n  const anyValue: any = any;\n  let launchpad:'
    );

    // Replace 'any' with 'anyValue' in .withArgs() calls
    content = content.replace(
      /\.withArgs\(\s*[^\)]*,\s*([^\)]*any[^\)]*)\s*\);/g,
      (match, args) => {
        // Replace 'any' with 'anyValue' in the args
        const fixedArgs = args.replace(/any/g, 'anyValue');
        return match.replace(args, fixedArgs);
      }
    );

    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed any value usage in ${filePath}`);
  }
});

console.log('✅ Any value usage in Chai matchers fixed!');