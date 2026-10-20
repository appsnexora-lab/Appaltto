import { execSync } from 'child_process';
import fs from 'fs';

const masterImg = 'src/assets/images/altto_icon_master_1792418673092.jpg';

if (!fs.existsSync(masterImg)) {
  console.error("Master image not found!");
  process.exit(1);
}

// Ensure public directories
fs.mkdirSync('public/icons', { recursive: true });

console.log("Generating official icons from master image...");

// 1. Standard Icons
execSync(`convert "${masterImg}" -resize 512x512 public/icons/icon-512.png`);
execSync(`convert "${masterImg}" -resize 192x192 public/icons/icon-192.png`);
execSync(`convert "${masterImg}" -resize 180x180 public/icons/apple-touch-icon.png`);
execSync(`convert "${masterImg}" -resize 64x64 public/icons/icon-64.png`);
execSync(`convert "${masterImg}" -resize 32x32 public/favicon-32x32.png`);
execSync(`convert "${masterImg}" -resize 16x16 public/favicon-16x16.png`);

// 2. Maskable Icons (safe zone scaled onto pure white canvas)
execSync(`convert "${masterImg}" -resize 420x420 -background white -gravity center -extent 512x512 public/icons/icon-maskable-512.png`);
execSync(`convert "${masterImg}" -resize 156x156 -background white -gravity center -extent 192x192 public/icons/icon-maskable-192.png`);

// 3. Root aliases and copies
execSync(`cp public/icons/apple-touch-icon.png public/apple-touch-icon.png`);
execSync(`cp public/icons/icon-192.png public/pwa-192x192.png`);
execSync(`cp public/icons/icon-512.png public/pwa-512x512.png`);
execSync(`cp public/icons/icon-maskable-192.png public/pwa-maskable-192x192.png`);
execSync(`cp public/icons/icon-maskable-512.png public/pwa-maskable-512x512.png`);
execSync(`cp public/icons/icon-512.png public/altto-official-logo.png`);
execSync(`cp public/icons/icon-192.png public/icon.png`);

console.log("All official icon assets successfully generated!");
