const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="url(#bg-grad)" />
  <circle cx="256" cy="256" r="200" fill="url(#glow-grad)" opacity="0.3" />
  
  <!-- Outer Tech Ring -->
  <circle cx="256" cy="256" r="180" stroke="url(#ring-grad)" stroke-width="6" stroke-dasharray="16 8" opacity="0.5"/>
  
  <!-- Bike Wheels -->
  <circle cx="156" cy="316" r="56" stroke="#38bdf8" stroke-width="16" fill="#0f172a" />
  <circle cx="156" cy="316" r="24" fill="#0284c7" />
  <circle cx="356" cy="316" r="56" stroke="#38bdf8" stroke-width="16" fill="#0f172a" />
  <circle cx="356" cy="316" r="24" fill="#0284c7" />
  
  <!-- Bike Frame -->
  <path d="M156 316 L230 230 L320 230 L356 316" stroke="#ffffff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M230 230 L256 316 L356 316" stroke="#38bdf8" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M320 230 L310 170 L340 160" stroke="#ffffff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M210 210 L250 210" stroke="#38bdf8" stroke-width="16" stroke-linecap="round" />
  
  <!-- Lightning Bolt -->
  <path d="M276 130 L236 210 L270 210 L246 280 L306 195 L270 195 Z" fill="#facc15" />

  <defs>
    <linearGradient id="bg-grad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#0c4a6e"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="ring-grad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <radialGradient id="glow-grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0"/>
    </radialGradient>
  </defs>
</svg>`;

fs.writeFileSync(path.join(dir, 'icon.svg'), svg);

async function generate() {
  await sharp(Buffer.from(svg))
    .resize(512, 512)
    .png()
    .toFile(path.join(dir, 'icon-512x512.png'));

  await sharp(Buffer.from(svg))
    .resize(192, 192)
    .png()
    .toFile(path.join(dir, 'icon-192x192.png'));

  await sharp(Buffer.from(svg))
    .resize(512, 512)
    .png()
    .toFile(path.join(dir, 'icon-maskable-512x512.png'));

  console.log('Icons generated successfully in public/icons!');
}

generate().catch(console.error);
