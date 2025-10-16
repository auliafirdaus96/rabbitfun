#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { LAUNCHPAD_ABI, ERC20_ABI } from '../src/types/contracts';

// Write ABI files to temp directory for TypeChain
const tempDir = join(__dirname, '../temp-abi');
const fs = require('fs');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Write Launchpad ABI
writeFileSync(
  join(tempDir, 'Launchpad.json'),
  JSON.stringify([...LAUNCHPAD_ABI], null, 2)
);

// Write ERC20 ABI
writeFileSync(
  join(tempDir, 'ERC20.json'),
  JSON.stringify([...ERC20_ABI], null, 2)
);

// Run TypeChain generation
try {
  console.log('Generating contract types with TypeChain...');

  execSync(
    `npx typechain --target ethers-v6 --out-dir src/generated/types ${tempDir}/*.json`,
    { stdio: 'inherit', cwd: process.cwd() }
  );

  console.log('✅ Contract types generated successfully!');

  // Cleanup temp files
  fs.rmSync(tempDir, { recursive: true, force: true });

} catch (error) {
  console.error('❌ Error generating contract types:', error);
  process.exit(1);
}