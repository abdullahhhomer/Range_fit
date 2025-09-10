#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing ChunkLoadError...\n');

try {
  // Step 1: Kill any running Node processes
  console.log('1️⃣ Stopping development server...');
  try {
    execSync('taskkill /f /im node.exe', { stdio: 'ignore' });
    console.log('✅ Stopped running processes');
  } catch (error) {
    console.log('ℹ️ No running processes to stop');
  }

  // Step 2: Remove .next directory
  console.log('\n2️⃣ Clearing Next.js cache...');
  const nextDir = path.join(process.cwd(), '.next');
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log('✅ Cleared .next directory');
  } else {
    console.log('ℹ️ .next directory not found');
  }

  // Step 3: Remove node_modules
  console.log('\n3️⃣ Clearing node_modules...');
  const nodeModulesDir = path.join(process.cwd(), 'node_modules');
  if (fs.existsSync(nodeModulesDir)) {
    fs.rmSync(nodeModulesDir, { recursive: true, force: true });
    console.log('✅ Cleared node_modules');
  } else {
    console.log('ℹ️ node_modules directory not found');
  }

  // Step 4: Remove package-lock.json
  console.log('\n4️⃣ Clearing package-lock.json...');
  const packageLockPath = path.join(process.cwd(), 'package-lock.json');
  if (fs.existsSync(packageLockPath)) {
    fs.unlinkSync(packageLockPath);
    console.log('✅ Cleared package-lock.json');
  } else {
    console.log('ℹ️ package-lock.json not found');
  }

  // Step 5: Reinstall dependencies
  console.log('\n5️⃣ Reinstalling dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies reinstalled');

  // Step 6: Start development server
  console.log('\n6️⃣ Starting development server...');
  console.log('🚀 Run "npm run dev" to start the server');
  
  console.log('\n🎉 ChunkLoadError fix complete!');
  console.log('💡 If the error persists, try:');
  console.log('   - Clear browser cache (Ctrl+Shift+R)');
  console.log('   - Try incognito/private browsing mode');
  console.log('   - Check your internet connection');

} catch (error) {
  console.error('❌ Error during fix:', error.message);
  process.exit(1);
}
