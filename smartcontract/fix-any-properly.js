const fs = require('fs');

console.log('🔧 Fixing any value assignment properly...');

// Fix any usage issues in test files
const filesToFix = [
  'test/unit/RabbitLaunchpad.graduation.test.ts',
  'test/unit/RabbitLaunchpad.sell.test.ts'
];

filesToFix.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace const anyValue: any = any; with proper Chai any usage
    content = content.replace(
      /const anyValue: any = any;\s*let launchpad:/g,
      'let launchpad:'
    );

    // Replace 'any' with 'anyValue' in .withArgs() calls
    content = content.replace(
      /\.withArgs\(\s*[^\)]*,\s*([^)]*any[^)]*)\s*\);/g,
      (match, args) => {
        // Replace 'any' with 'anyValue' in the args
        const fixedArgs = args.replace(/any/g, 'anyValue');
        return match.replace(args, fixedArgs);
      }
    );

    // Add anyValue declaration at the beginning of describe block if needed
    if (content.includes('anyValue') && !content.includes('const anyValue')) {
      content = content.replace(
        /describe\(".*"\, function \(\) \{\s*let launchpad:/,
        'describe("$1", function () {\n  const anyValue: any = any;\n  let launchpad:'
      );
    }

    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed any value assignment in ${filePath}`);
  }
});

console.log('✅ Any value assignment fixed properly!');