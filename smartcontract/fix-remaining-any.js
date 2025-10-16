const fs = require('fs');

console.log('🔧 Fixing remaining any usage in withArgs...');

const filesToFix = [
  'test/unit/RabbitLaunchpad.graduation.test.ts',
  'test/unit/RabbitLaunchpad.sell.test.ts'
];

filesToFix.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace any with anyValue in withArgs calls specifically
    content = content.replace(
      /\.withArgs\(\s*([^,)]+),\s*([^,)]+),\s*([^,)]+),\s*([^,)]+),\s*any\s*\)\);/g,
      '.withArgs($1, $2, $3, $4, anyValue));'
    );

    content = content.replace(
      /\.withArgs\(\s*([^,)]+),\s*([^,)]+),\s*([^,)]+),\s*([^,)]+),\s*any,\s*any\s*\)\);/g,
      '.withArgs($1, $2, $3, $4, anyValue, anyValue));'
    );

    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed remaining any usage in ${filePath}`);
  }
});

console.log('✅ Remaining any usage fixed!');