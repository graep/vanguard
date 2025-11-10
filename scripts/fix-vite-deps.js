#!/usr/bin/env node

/**
 * Pre-start script to fix Windows vite/deps directory scandir error
 * Runs before ng serve to ensure the directory exists and is accessible
 * 
 * Strategy: If we can't fix the directory, clear the entire cache and let Angular recreate it
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const angularCachePath = path.join(projectRoot, '.angular', 'cache');
const viteDepsPath = path.join(angularCachePath, '19.2.18', 'app', 'vite', 'deps');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function tryRemove(pathToRemove, description) {
  if (!fs.existsSync(pathToRemove)) {
    return true;
  }
  
  // Try Node.js removal first
  let retries = 2;
  while (retries > 0) {
    try {
      fs.rmSync(pathToRemove, { recursive: true, force: true });
      await sleep(500);
      if (!fs.existsSync(pathToRemove)) {
        return true;
      }
    } catch (error) {
      // Continue to PowerShell method
    }
    retries--;
    if (retries > 0) await sleep(500);
  }
  
  // If Node.js failed, try PowerShell (more aggressive on Windows)
  if (process.platform === 'win32') {
    try {
      const { execSync } = require('child_process');
      const psPath = pathToRemove.replace(/\\/g, '\\$&'); // Escape backslashes
      execSync(`powershell -Command "Remove-Item -Path '${psPath}' -Recurse -Force -ErrorAction SilentlyContinue"`, {
        stdio: 'ignore',
        timeout: 5000
      });
      await sleep(800);
      if (!fs.existsSync(pathToRemove)) {
        return true;
      }
    } catch (psError) {
      // PowerShell also failed
    }
  }
  
  console.log(`  ⚠️  Could not remove ${description} - Windows file lock detected`);
  return false;
}

async function ensureViteDepsDirectory() {
  try {
    console.log('🔧 Fixing vite/deps directory for Windows...');
    
    // Strategy 1: Try to remove just the vite/deps directory
    const removed = await tryRemove(viteDepsPath, 'vite/deps directory');
    
    if (!removed) {
      console.log('  ⚠️  Could not remove vite/deps, trying full cache clear...');
      // Strategy 2: Clear entire Angular cache
      const cacheCleared = await tryRemove(angularCachePath, 'Angular cache');
      if (cacheCleared) {
        console.log('  ✅ Cleared entire Angular cache - Angular will recreate it');
        return true;
      } else {
        console.log('  ⚠️  Could not clear cache - Windows may have file locks');
        console.log('  💡 Try: 1) Restart computer, 2) Close all Node processes, 3) Run as admin');
        // Don't fail - let Angular try to handle it
        return true;
      }
    }
    
    // Wait for Windows file system to settle
    await sleep(800);
    
    // Try to create parent directories
    try {
      const parentPath = path.dirname(viteDepsPath);
      if (!fs.existsSync(parentPath)) {
        fs.mkdirSync(parentPath, { recursive: true });
      }
      await sleep(300);
      
      // Try to create the deps directory
      if (!fs.existsSync(viteDepsPath)) {
        fs.mkdirSync(viteDepsPath, { recursive: true });
        await sleep(300);
      }
      
      // Try to verify it's accessible (but don't fail if we can't)
      try {
        fs.readdirSync(viteDepsPath);
        console.log('  ✅ Directory ready');
      } catch (readError) {
        console.log('  ⚠️  Directory exists but may have access issues');
        console.log('     Angular will attempt to use it anyway');
      }
      
      return true;
    } catch (createError) {
      console.log('  ⚠️  Could not create directory:', createError.message);
      console.log('     Angular will attempt to create it during build');
      // Don't fail - Angular might be able to handle it
      return true;
    }
  } catch (error) {
    console.error('  ⚠️  Error:', error.message);
    console.log('     Continuing anyway - Angular may handle it');
    // Always return true so npm start continues
    return true;
  }
}

if (require.main === module) {
  ensureViteDepsDirectory().then(() => {
    // Always exit with 0 so npm start continues even if we couldn't fix it
    process.exit(0);
  });
}

module.exports = { ensureViteDepsDirectory };


