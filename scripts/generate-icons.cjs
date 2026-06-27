const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create a simple icon with "CG" text
async function generateIcon(size) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#f97316"/>
      <rect x="${size * 0.05}" y="${size * 0.05}" width="${size * 0.9}" height="${size * 0.9}" rx="${size * 0.15}" fill="#ffffff"/>
      <rect x="${size * 0.1}" y="${size * 0.1}" width="${size * 0.8}" height="${size * 0.8}" rx="${size * 0.1}" fill="#f97316"/>
      <text x="${size / 2}" y="${size * 0.65}" font-family="Arial, sans-serif" font-size="${size * 0.35}" font-weight="bold" fill="#ffffff" text-anchor="middle">CG</text>
    </svg>
  `;
  
  const outputPath = path.join(__dirname, '..', 'public', 'icons', `icon-${size}.png`);
  
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outputPath);
    
  console.log(`Generated: icon-${size}.png`);
}

async function main() {
  // Ensure icons directory exists
  const iconsDir = path.join(__dirname, '..', 'public', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  for (const size of sizes) {
    await generateIcon(size);
  }
  
  console.log('All icons generated successfully!');
}

main().catch(console.error);
