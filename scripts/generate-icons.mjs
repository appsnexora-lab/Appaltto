import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const publicIconsDir = path.resolve('public/icons');
if (!fs.existsSync(publicIconsDir)) {
  fs.mkdirSync(publicIconsDir, { recursive: true });
}

// 1. Standard icon SVG (with soft border and stylized 'A')
const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="lilacGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A78BFA" />
      <stop offset="50%" stop-color="#8B5CF6" />
      <stop offset="100%" stop-color="#7C3AED" />
    </linearGradient>
    <linearGradient id="softLilacBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#F8F5FF" />
    </linearGradient>
  </defs>

  <!-- Clean Pure White Base with delicate subtle contour -->
  <rect width="512" height="512" rx="112" fill="url(#softLilacBg)" />
  <rect x="4" y="4" width="504" height="504" rx="108" fill="none" stroke="#EEEAF3" stroke-width="8" />

  <!-- Inner delicate ring -->
  <rect x="36" y="36" width="440" height="440" rx="84" fill="#FFFFFF" stroke="#F0E9FF" stroke-width="3" />

  <!-- Stylized letter 'A' of Altto in elegant editorial curves -->
  <g id="altto-symbol" transform="translate(0, 4)">
    <!-- Apex and legs of 'A' -->
    <path d="M 256 128 C 244 128 234 136 226 154 L 148 336 C 142 350 148 366 162 372 C 174 376 186 370 192 358 L 216 304 L 296 304 L 320 358 C 326 370 338 376 350 372 C 364 366 370 350 364 336 L 286 154 C 278 136 268 128 256 128 Z M 256 196 L 284 266 L 228 266 Z"
          fill="url(#lilacGrad)" />
    <!-- Graceful open book arch / crossbar accent below apex -->
    <path d="M 204 316 C 228 326 256 328 284 316 C 294 312 304 318 308 328 C 312 338 306 348 296 352 C 262 366 226 364 192 352 C 182 348 176 338 180 328 C 184 318 194 312 204 316 Z"
          fill="#DDD0FF" opacity="0.95" />
    <!-- Serene book bird wing dot (representing elevation / Altto) -->
    <circle cx="256" cy="112" r="14" fill="#A78BFA" opacity="0.95" />
  </g>
</svg>`;

// 2. Maskable SVG: Full bleed #FFFFFF background with artwork completely contained in the inner 76% safe zone circle (radius <= 194px from center 256, 256)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="m-lilacGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A78BFA" />
      <stop offset="50%" stop-color="#8B5CF6" />
      <stop offset="100%" stop-color="#7C3AED" />
    </linearGradient>
    <linearGradient id="m-softLilacBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#F8F5FF" />
    </linearGradient>
  </defs>

  <!-- Android Maskable Full Canvas Background (must be 100% solid, no rounded corners) -->
  <rect width="512" height="512" fill="#FFFFFF" />

  <!-- Inner safe circular medallion within the 76% safe zone -->
  <circle cx="256" cy="256" r="182" fill="url(#m-softLilacBg)" stroke="#EEEAF3" stroke-width="4" />
  <circle cx="256" cy="256" r="172" fill="#FFFFFF" stroke="#F0E9FF" stroke-width="2" />

  <!-- Scaled letter 'A' of Altto centered safely -->
  <g transform="translate(256, 256) scale(0.78) translate(-256, -252)">
    <path d="M 256 128 C 244 128 234 136 226 154 L 148 336 C 142 350 148 366 162 372 C 174 376 186 370 192 358 L 216 304 L 296 304 L 320 358 C 326 370 338 376 350 372 C 364 366 370 350 364 336 L 286 154 C 278 136 268 128 256 128 Z M 256 196 L 284 266 L 228 266 Z"
          fill="url(#m-lilacGrad)" />
    <path d="M 204 316 C 228 326 256 328 284 316 C 294 312 304 318 308 328 C 312 338 306 348 296 352 C 262 366 226 364 192 352 C 182 348 176 338 180 328 C 184 318 194 312 204 316 Z"
          fill="#DDD0FF" opacity="0.95" />
    <circle cx="256" cy="112" r="14" fill="#A78BFA" opacity="0.95" />
  </g>
</svg>`;

fs.writeFileSync('public/icons/icon.svg', standardSvg);
fs.writeFileSync('public/icon.svg', standardSvg);
fs.writeFileSync('public/icons/icon-maskable.svg', maskableSvg);

console.log('SVGs written. Converting with ffmpeg...');

// Conversions via ffmpeg
execSync('ffmpeg -y -i public/icons/icon.svg -vf "scale=192:192" public/icons/icon-192.png');
execSync('ffmpeg -y -i public/icons/icon.svg -vf "scale=512:512" public/icons/icon-512.png');
execSync('ffmpeg -y -i public/icons/icon.svg -vf "scale=180:180" public/icons/apple-touch-icon.png');
execSync('cp public/icons/apple-touch-icon.png public/apple-touch-icon.png');

execSync('ffmpeg -y -i public/icons/icon-maskable.svg -vf "scale=192:192" public/icons/icon-maskable-192.png');
execSync('ffmpeg -y -i public/icons/icon-maskable.svg -vf "scale=512:512" public/icons/icon-maskable-512.png');

// Also create root standard PWA icons for fallback
execSync('cp public/icons/icon-192.png public/pwa-192x192.png');
execSync('cp public/icons/icon-512.png public/pwa-512x512.png');

console.log('All icons generated successfully!');
