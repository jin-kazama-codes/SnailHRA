import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="60%" stop-color="#0d9488" />
      <stop offset="100%" stop-color="#0f766e" />
    </linearGradient>
    
    <radialGradient id="bgHighlight" cx="30%" cy="20%" r="70%">
      <stop offset="0%" stop-color="#34d399" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#059669" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="glyphGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#e0f2fe" />
    </linearGradient>

    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6ee7b7" />
      <stop offset="100%" stop-color="#10b981" />
    </linearGradient>
  </defs>

  <rect x="16" y="16" width="480" height="480" rx="120" fill="url(#bgGrad)" />
  <rect x="16" y="16" width="480" height="480" rx="120" fill="url(#bgHighlight)" />
  <rect x="16" y="16" width="480" height="480" rx="120" fill="none" stroke="#ffffff" stroke-width="4" stroke-opacity="0.15" />

  <g transform="translate(0, 0)">
    <path d="M 336 160 C 375.8 160 408 192.2 408 232 C 408 320 336 384 248 384 C 168 384 104 320 104 240 C 104 160 168 96 248 96 C 300 96 344 122 368 160" 
          fill="none" 
          stroke="url(#glyphGrad)" 
          stroke-width="44" 
          stroke-linecap="round" 
          stroke-linejoin="round" />

    <path d="M 248 184 C 217 184 192 209 192 240 C 192 271 217 296 248 296 C 279 296 304 271 304 240" 
          fill="none" 
          stroke="url(#glyphGrad)" 
          stroke-width="36" 
          stroke-linecap="round" />

    <circle cx="368" cy="144" r="28" fill="url(#accentGrad)" stroke="#ffffff" stroke-width="6" />
  </g>
</svg>`;

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const appDir = path.join(rootDir, 'app');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function generate() {
  const svgBuffer = Buffer.from(svgContent);

  // Write SVG files
  fs.writeFileSync(path.join(appDir, 'icon.svg'), svgContent);
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

  // Generate PNG sizes
  const png32 = await sharp(svgBuffer).resize(32, 32).toBuffer();
  const png48 = await sharp(svgBuffer).resize(48, 48).toBuffer();
  const png180 = await sharp(svgBuffer).resize(180, 180).toBuffer();
  const png192 = await sharp(svgBuffer).resize(192, 192).toBuffer();
  const png512 = await sharp(svgBuffer).resize(512, 512).toBuffer();

  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png180);
  fs.writeFileSync(path.join(publicDir, 'apple-icon.png'), png180);
  fs.writeFileSync(path.join(appDir, 'apple-icon.png'), png180);
  fs.writeFileSync(path.join(appDir, 'icon.png'), png180);
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), png32);
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), await sharp(svgBuffer).resize(16, 16).toBuffer());

  // Generate favicon.ico (ICO file format holding PNG data)
  // Simple ICO header for a single 32x32 PNG image
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
  icoHeader.writeUInt16LE(1, 4); // 1 image

  const icoDirectory = Buffer.alloc(16);
  icoDirectory.writeUInt8(32, 0); // Width
  icoDirectory.writeUInt8(32, 1); // Height
  icoDirectory.writeUInt8(0, 2);  // Palette colors (0 = no palette)
  icoDirectory.writeUInt8(0, 3);  // Reserved
  icoDirectory.writeUInt16LE(1, 4); // Color planes
  icoDirectory.writeUInt16LE(32, 6); // Bits per pixel
  icoDirectory.writeUInt32LE(png32.length, 8); // Image size in bytes
  icoDirectory.writeUInt32LE(22, 12); // Image offset (6 + 16 = 22)

  const icoBuffer = Buffer.concat([icoHeader, icoDirectory, png32]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);

  console.log('Successfully generated all favicons and icons!');
}

generate().catch(err => {
  console.error('Error generating favicons:', err);
  process.exit(1);
});
