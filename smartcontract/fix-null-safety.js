const fs = require('fs');

console.log('🔧 Fixing null safety issues...');

const filesToFix = [
  'test/unit/TokenCreation.test.ts',
  'test/unit/BuyFunctionality.test.ts',
  'test/unit/SecurityFixes.test.ts'
];

filesToFix.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix null safety for receipt.gasUsed and receipt.gasPrice
    content = content.replace(
      /const gasUsed = receipt\.gasUsed \* receipt\.gasPrice;/g,
      'const gasUsed = (receipt?.gasUsed || 0n) * (receipt?.gasPrice || 0n);'
    );

    // Fix null safety for receipt in general
    content = content.replace(
      /receipt\.gasUsed/g,
      'receipt?.gasUsed || 0n'
    );

    content = content.replace(
      /receipt\.gasPrice/g,
      'receipt?.gasPrice || 0n'
    );

    // Fix null safety for receipt.wait() calls
    content = content.replace(
      /const receipt = await tx\.wait\(\);/g,
      'const receipt = await tx.wait();'
    );

    // Fix array operations with gasUsages (convert to numbers for arithmetic)
    content = content.replace(
      /gasUsages\.push\(receipt\.gasUsed\.toString\(\)\);/g,
      'gasUsages.push((receipt?.gasUsed || 0n).toString());'
    );

    // Fix reduce operations with mixed types
    content = content.replace(
      /const avgGas = gasUsages\.reduce\(\(a, b\) => a \+ b, 0\) \/ gasUsages\.length;/g,
      'const avgGas = gasUsages.reduce((a, b) => Number(a) + Number(b), 0) / gasUsages.length;'
    );

    content = content.replace(
      /const variance = gasUsages\.reduce\(\(acc, gas\) => acc \+ Math\.abs\(gas - avgGas\), 0\) \/ gasUsages\.length;/g,
      'const variance = gasUsages.reduce((acc, gas) => acc + Math.abs(Number(gas) - avgGas), 0) / gasUsages.length;'
    );

    // Fix multiplication operations
    content = content.replace(
      /expect\(variance\)\.to\.be\.lt\(avgGas \* (\d+)n \/ 100n\);/g,
      'expect(variance).to.be.lt(avgGas * $1 / 100);'
    );

    // Fix event parsing with null safety
    content = content.replace(
      /const event = receipt\.logs\?\.find\(\(e: any\) => e\.event === "TokenCreated"\);/g,
      'const event = receipt?.logs?.find((e: any) => e.event === "TokenCreated");'
    );

    content = content.replace(
      /const event1 = receipt1\.logs\?\.find\(\(e: any\) => e\.event === "TokenCreated"\);/g,
      'const event1 = receipt1?.logs?.find((e: any) => e.event === "TokenCreated");'
    );

    content = content.replace(
      /const event2 = receipt2\.logs\?\.find\(\(e: any\) => e\.event === "TokenCreated"\);/g,
      'const event2 = receipt2?.logs?.find((e: any) => e.event === "TokenCreated");'
    );

    content = content.replace(
      /const event3 = receipt3\.logs\?\.find\(\(e: any\) => e\.event === "TokenCreated"\);/g,
      'const event3 = receipt3?.logs?.find((e: any) => e.event === "TokenCreated");'
    );

    // Fix property access on event args
    content = content.replace(
      /const token1Address = event1\?\.args\?\.tokenAddress;/g,
      'const token1Address = (event1 as any)?.args?.tokenAddress;'
    );

    content = content.replace(
      /const token2Address = event2\?\.args\?\.tokenAddress;/g,
      'const token2Address = (event2 as any)?.args?.tokenAddress;'
    );

    content = content.replace(
      /const token3Address = event3\?\.args\?\.tokenAddress;/g,
      'const token3Address = (event3 as any)?.args?.tokenAddress;'
    );

    // Fix timestamp access
    content = content.replace(
      /const timestamp = event\?\.args\?\.timestamp;/g,
      'const timestamp = (event as any)?.args?.timestamp;'
    );

    // Fix Promise.all wait calls
    content = content.replace(
      /const \[receipt1, receipt2, receipt3\] = await Promise\.all\(\[\s*tx1\.wait\(\),\s*tx2\.wait\(\),\s*tx3\.wait\(\),\s*\]\);/g,
      'const [receipt1, receipt2, receipt3] = await Promise.all([\n        tx1,\n        tx2,\n        tx3,\n      ].map(tx => tx.wait()));'
    );

    // Fix parsed null safety in SecurityFixes.test.ts
    content = content.replace(
      /const parsed = launchpad\.interface\.parseLog\(log\);\s*return parsed\.name === "TokenBought";/g,
      'const parsed = launchpad.interface.parseLog(log);\n          return parsed?.name === "TokenBought";'
    );

    content = content.replace(
      /const parsed = launchpad\.interface\.parseLog\(log\);\s*return parsed\.name === "TokenSold";/g,
      'const parsed = launchpad.interface.parseLog(log);\n          return parsed?.name === "TokenSold";'
    );

    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed null safety in ${filePath}`);
  }
});

console.log('✅ Null safety fixes completed!');