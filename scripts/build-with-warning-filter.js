// scripts/build-with-warning-filter.js
/**
 * Build wrapper that filters out known harmless warnings from Stencil/Ionic
 * Specifically filters the "empty-glob" warning from @stencil/core
 */

const { spawn } = require('child_process');

// Get build command from arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  args.push('build', '--configuration', 'production');
}

console.log('🔨 Building with warning filter...');
console.log(`Command: ng ${args.join(' ')}\n`);

// Spawn the build process
const buildProcess = spawn('npx', ['ng', ...args], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
  cwd: process.cwd()
});

// Track if we're in a warning block
let inWarningBlock = false;
let warningBuffer = '';

// Filter warnings from stdout
buildProcess.stdout.on('data', (data) => {
  const output = data.toString();
  const lines = output.split(/\r?\n/);
  
  lines.forEach(line => {
    // Check if this is the start of the Stencil warning
    if (line.includes('empty-glob') || 
        (line.includes('[WARNING]') && line.includes('glob pattern'))) {
      inWarningBlock = true;
      warningBuffer = line;
      return;
    }
    
    // If we're in a warning block, check if this line is part of it
    if (inWarningBlock) {
      warningBuffer += '\n' + line;
      
      // Check if this is the end of the warning block (line with node_modules path)
      if (line.includes('node_modules/@stencil/core') || 
          line.includes('@stencil/core/internal/client/index.js')) {
        // This is the Stencil warning - suppress it
        inWarningBlock = false;
        warningBuffer = '';
        return;
      }
      
      // Check if we've reached a line that doesn't belong to the warning
      if (line.trim() === '' || line.match(/^[▲✖✓]/)) {
        // End of warning block
        inWarningBlock = false;
        warningBuffer = '';
        return;
      }
    } else {
      // Pass through all other output
      process.stdout.write(line + '\n');
    }
  });
});

// Filter warnings from stderr (Angular CLI often writes warnings to stderr)
buildProcess.stderr.on('data', (data) => {
  const output = data.toString();
  const lines = output.split(/\r?\n/);
  
  lines.forEach(line => {
    // Filter out the Stencil empty-glob warning
    if (line.includes('empty-glob') && 
        (line.includes('@stencil/core') || line.includes('stencil'))) {
      // Suppress this specific warning
      return;
    }
    
    // Check for warning block
    if (line.includes('[WARNING]') && line.includes('glob pattern')) {
      inWarningBlock = true;
      return;
    }
    
    if (inWarningBlock && line.includes('node_modules/@stencil/core')) {
      inWarningBlock = false;
      return;
    }
    
    if (!inWarningBlock) {
      // Pass through all other output
      process.stderr.write(line + '\n');
    }
  });
});

// Handle process completion
buildProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Build completed successfully');
  } else {
    console.error(`\n❌ Build failed with exit code ${code}`);
    process.exit(code);
  }
});

// Handle errors
buildProcess.on('error', (error) => {
  console.error('❌ Build process error:', error);
  process.exit(1);
});

