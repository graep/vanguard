#!/usr/bin/env node
/**
 * Icon Generator Script for Vanguard Fleet PWA
 * This script helps generate proper icon sizes for PWA installation
 */

const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const iconSizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'favicon-48x48.png' },
  { size: 72, name: 'favicon-72x72.png' },
  { size: 96, name: 'favicon-96x96.png' },
  { size: 144, name: 'favicon-144x144.png' },
  { size: 192, name: 'favicon-192x192.png' },
  { size: 512, name: 'favicon-512x512.png' }
];

const iconDir = path.join(__dirname, '..', 'src', 'assets', 'icon');
const svgPath = path.join(iconDir, 'favicon_black.svg');

console.log('🛡️ Vanguard Fleet Icon Generator');
console.log('================================');

// Check if SVG exists
if (!fs.existsSync(svgPath)) {
  console.error('❌ Shield icon SVG not found at:', svgPath);
  process.exit(1);
}

console.log('✅ Found shield icon SVG');
console.log('📁 Icon directory:', iconDir);

// Create a simple HTML file for manual icon generation
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Icon Generator</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .icon-preview { margin: 10px; display: inline-block; text-align: center; }
        canvas { border: 1px solid #ccc; margin: 5px; }
        .instructions { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>🛡️ Vanguard Fleet Icon Generator</h1>
    
    <div class="instructions">
        <h3>Instructions:</h3>
        <ol>
            <li>Right-click on each icon below</li>
            <li>Select "Save image as..."</li>
            <li>Save with the filename shown below each icon</li>
            <li>Place all saved icons in: <code>src/assets/icon/</code></li>
        </ol>
    </div>

    <div id="icons"></div>

    <script>
        // Load the SVG
        fetch('favicon_black.svg')
            .then(response => response.text())
            .then(svgText => {
                const iconSizes = [16, 32, 48, 72, 96, 144, 192, 512];
                const container = document.getElementById('icons');
                
                iconSizes.forEach(size => {
                    const div = document.createElement('div');
                    div.className = 'icon-preview';
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    
                    // Create a temporary image from SVG
                    const img = new Image();
                    const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
                    const url = URL.createObjectURL(svgBlob);
                    
                    img.onload = function() {
                        ctx.drawImage(img, 0, 0, size, size);
                        URL.revokeObjectURL(url);
                    };
                    
                    img.src = url;
                    
                    const label = document.createElement('div');
                    label.textContent = \`favicon-\${size}x\${size}.png\`;
                    label.style.fontSize = '12px';
                    label.style.marginTop = '5px';
                    
                    div.appendChild(canvas);
                    div.appendChild(label);
                    container.appendChild(div);
                });
            })
            .catch(error => {
                console.error('Error loading SVG:', error);
                document.getElementById('icons').innerHTML = '<p>Error loading SVG file</p>';
            });
    </script>
</body>
</html>
`;

const htmlPath = path.join(iconDir, 'icon-generator.html');
fs.writeFileSync(htmlPath, htmlContent);

console.log('📄 Created icon generator HTML at:', htmlPath);
console.log('');
console.log('🔧 Manual Icon Generation Steps:');
console.log('1. Open the HTML file in your browser: file://' + htmlPath.replace(/\\/g, '/'));
console.log('2. Right-click each icon and save with the suggested filename');
console.log('3. Place all saved PNG files in: src/assets/icon/');
console.log('');
console.log('📋 Required icon files:');
iconSizes.forEach(icon => {
  console.log(`   - ${icon.name} (${icon.size}x${icon.size}px)`);
});
console.log('');
console.log('✅ After generating icons, run: npm run build:prod');
console.log('🚀 Then deploy with: firebase deploy --only hosting');
