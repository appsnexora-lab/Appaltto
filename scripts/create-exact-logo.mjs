import fs from 'fs';
import { execSync } from 'child_process';

const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <!-- Clean Pure White Base -->
  <rect width="1000" height="1000" fill="#FFFFFF" />

  <!-- Soft Pale Lilac Squircle Outline with rounded corners -->
  <rect x="58" y="58" width="884" height="884" rx="210" ry="210" fill="#FFFFFF" stroke="#EAE2FB" stroke-width="14" />

  <!-- Altto Official Stylized "A" Monogram in Soft Lilac -->
  <g id="altto-official-symbol" fill="#B59EED">
    <!-- Top Apex & Main Loop with Left Flair and Crescent Swoosh -->
    <path d="
      M 488,248
      C 496,244 504,244 512,248
      C 524,254 534,268 544,292
      L 634,484
      C 610,490 580,500 550,510
      L 504,380
      C 502,374 498,374 496,380
      L 450,504
      C 424,524 394,548 368,574
      L 448,296
      C 460,268 474,254 488,248 Z
    " />

    <!-- Left Ribbon Leg that flourishes outward to bottom-left -->
    <path d="
      M 436,540
      C 416,560 392,590 366,628
      L 326,684
      C 304,714 274,726 230,714
      C 268,702 302,674 332,634
      L 380,568
      C 398,554 416,546 436,540 Z
    " />

    <!-- Sweeping Crescent Crossbar swooshing across from left flair to right wing tip -->
    <path d="
      M 230,714
      C 292,708 364,666 440,620
      C 520,574 610,538 764,532
      C 700,506 612,502 536,518
      C 456,534 380,566 312,618
      C 274,648 248,680 230,714 Z
    " />

    <!-- Lower Right Leg with outward curling foot -->
    <path d="
      M 568,578
      L 632,708
      C 644,732 670,746 718,746
      C 748,742 768,728 774,714
      C 740,720 708,712 688,678
      L 646,594
      C 620,588 594,582 568,578 Z
    " />
  </g>
</svg>`;

// Maskable version: Safe zone inside 80% (center 500, 500 with radius 380)
// With full white bleed background (no border cutoff on Android adaptive icon masks)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <!-- Solid white full bleed for Android maskable adaptive icon -->
  <rect width="1000" height="1000" fill="#FFFFFF" />

  <!-- Safe Zone Centered Squircle Outline (Scaled to 78% so corners and borders never get clipped) -->
  <g transform="translate(500, 500) scale(0.78) translate(-500, -500)">
    <rect x="58" y="58" width="884" height="884" rx="210" ry="210" fill="#FFFFFF" stroke="#EAE2FB" stroke-width="16" />

    <!-- Altto Official Stylized "A" Monogram in Soft Lilac -->
    <g id="m-altto-official-symbol" fill="#B59EED">
      <path d="
        M 488,248
        C 496,244 504,244 512,248
        C 524,254 534,268 544,292
        L 634,484
        C 610,490 580,500 550,510
        L 504,380
        C 502,374 498,374 496,380
        L 450,504
        C 424,524 394,548 368,574
        L 448,296
        C 460,268 474,254 488,248 Z
      " />

      <path d="
        M 436,540
        C 416,560 392,590 366,628
        L 326,684
        C 304,714 274,726 230,714
        C 268,702 302,674 332,634
        L 380,568
        C 398,554 416,546 436,540 Z
      " />

      <path d="
        M 230,714
        C 292,708 364,666 440,620
        C 520,574 610,538 764,532
        C 700,506 612,502 536,518
        C 456,534 380,566 312,618
        C 274,648 248,680 230,714 Z
      " />

      <path d="
        M 568,578
        L 632,708
        C 644,732 670,746 718,746
        C 748,742 768,728 774,714
        C 740,720 708,712 688,678
        L 646,594
        C 620,588 594,582 568,578 Z
      " />
    </g>
  </g>
</svg>`;

fs.writeFileSync('public/icons/icon.svg', standardSvg);
fs.writeFileSync('public/icon.svg', standardSvg);
fs.writeFileSync('public/icons/icon-maskable.svg', maskableSvg);

console.log('Generating crisp PNGs via ffmpeg...');

// Generate exact PNG sizes
execSync('ffmpeg -y -i public/icons/icon.svg -vf "scale=192:192" public/icons/icon-192.png');
execSync('ffmpeg -y -i public/icons/icon.svg -vf "scale=512:512" public/icons/icon-512.png');
execSync('ffmpeg -y -i public/icons/icon.svg -vf "scale=180:180" public/icons/apple-touch-icon.png');
execSync('cp public/icons/apple-touch-icon.png public/apple-touch-icon.png');

// Maskable
execSync('ffmpeg -y -i public/icons/icon-maskable.svg -vf "scale=192:192" public/icons/icon-maskable-192.png');
execSync('ffmpeg -y -i public/icons/icon-maskable.svg -vf "scale=512:512" public/icons/icon-maskable-512.png');

// Fallback legacy roots
execSync('cp public/icons/icon-192.png public/pwa-192x192.png');
execSync('cp public/icons/icon-512.png public/pwa-512x512.png');

console.log('All official icons generated successfully!');
