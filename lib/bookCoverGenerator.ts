/**
 * bookCoverGenerator.ts
 * Generates high-fidelity, elegant, classical book covers for Christian literature and PDF/EPUB books.
 * Features realistic leather/linen background gradients, gold filigree borders, theological emblems,
 * balanced typography with auto-wrapping, and 3D spine lighting.
 */

export interface CoverTheme {
  primaryBg: string;
  secondaryBg: string;
  accentGold: string;
  subGold: string;
  textColor: string;
  emblem: 'cross' | 'bible' | 'heart' | 'dove' | 'chalice' | 'star' | 'sword' | 'shield';
  tagline?: string;
}

const THEMES: Record<string, CoverTheme> = {
  emerald: {
    primaryBg: '#0f3d2e',
    secondaryBg: '#08231a',
    accentGold: '#e5c07b',
    subGold: '#b8964d',
    textColor: '#fdfbf7',
    emblem: 'cross',
    tagline: 'EDIÇÃO CLÁSSICA • ALMANAQUE CELESTIAL',
  },
  burgundy: {
    primaryBg: '#4a0e17',
    secondaryBg: '#2a050b',
    accentGold: '#f3c98b',
    subGold: '#c7924c',
    textColor: '#fdfbf7',
    emblem: 'cross',
    tagline: 'DEVOCIONAL CRISTÃO HISTÓRICO',
  },
  sapphire: {
    primaryBg: '#0f2744',
    secondaryBg: '#071424',
    accentGold: '#f0ce8e',
    subGold: '#bfa063',
    textColor: '#fdfbf7',
    emblem: 'heart',
    tagline: 'MEMÓRIAS DA GRAÇA • PATRÍSTICA',
  },
  charcoal: {
    primaryBg: '#1f2429',
    secondaryBg: '#0f1114',
    accentGold: '#e6be75',
    subGold: '#ad8742',
    textColor: '#fdfbf7',
    emblem: 'shield',
    tagline: 'APOLOGÉTICA CRISTÃ • FILOSOFIA',
  },
  terracotta: {
    primaryBg: '#472314',
    secondaryBg: '#281108',
    accentGold: '#f7d794',
    subGold: '#cfa257',
    textColor: '#fdfbf7',
    emblem: 'chalice',
    tagline: 'VIDA INTERIOR • CONTEMPLAÇÃO',
  },
  purple: {
    primaryBg: '#321447',
    secondaryBg: '#1a0726',
    accentGold: '#ebd08d',
    subGold: '#bfa15c',
    textColor: '#fdfbf7',
    emblem: 'bible',
    tagline: 'EXPOSIÇÃO BÍBLICA • PATRÍSTICA',
  },
  walnut: {
    primaryBg: '#362214',
    secondaryBg: '#1c1008',
    accentGold: '#e8c47e',
    subGold: '#b8914b',
    textColor: '#fdfbf7',
    emblem: 'dove',
    tagline: 'GRAÇA E MISERICÓRDIA DIVINA',
  },
};

/**
 * Chooses or detects the best theme for a book based on title, author or hash.
 */
export function getThemeForBook(title: string, author?: string): CoverTheme {
  const t = (title + ' ' + (author || '')).toLowerCase();
  if (t.includes('peregrino') || t.includes('bunyan')) return THEMES.emerald;
  if (t.includes('imita') || t.includes('kempis')) return THEMES.burgundy;
  if (t.includes('confiss') || t.includes('agostinho') || t.includes('augustine')) return THEMES.sapphire;
  if (t.includes('ortodox') || t.includes('chesterton')) return THEMES.charcoal;
  if (t.includes('louren') || t.includes('presen') || t.includes('lawrence')) return THEMES.terracotta;
  if (t.includes('serm') || t.includes('crisostom') || t.includes('monte')) return THEMES.purple;
  if (t.includes('gra') || t.includes('pecador')) return THEMES.walnut;

  // Hash title for stable selection among themes
  const keys = Object.keys(THEMES);
  let hash = 0;
  for (let i = 0; i < t.length; i++) {
    hash = (hash << 5) - hash + t.charCodeAt(i);
    hash |= 0;
  }
  const chosenKey = keys[Math.abs(hash) % keys.length];
  return THEMES[chosenKey];
}

/**
 * Draws theological emblems on the canvas using pure vector canvas paths.
 */
function drawEmblem(
  ctx: CanvasRenderingContext2D,
  emblem: CoverTheme['emblem'],
  cx: number,
  cy: number,
  size: number,
  gold: string,
  subGold: string
) {
  ctx.save();
  ctx.strokeStyle = gold;
  ctx.fillStyle = gold;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (emblem === 'cross') {
    // Elegant Latin Cross with radiating sun rays
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.9, 0, Math.PI * 2);
    ctx.strokeStyle = subGold;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cross bars
    ctx.strokeStyle = gold;
    ctx.lineWidth = 5;
    // Vertical beam
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.85);
    ctx.lineTo(cx, cy + size * 0.85);
    ctx.stroke();
    // Horizontal beam
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.55, cy - size * 0.25);
    ctx.lineTo(cx + size * 0.55, cy - size * 0.25);
    ctx.stroke();

    // Decorative flourishes on cross endpoints
    ctx.fillStyle = gold;
    [
      [cx, cy - size * 0.85],
      [cx, cy + size * 0.85],
      [cx - size * 0.55, cy - size * 0.25],
      [cx + size * 0.55, cy - size * 0.25],
    ].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (emblem === 'bible') {
    // Open Scripture Book
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.5);
    ctx.bezierCurveTo(cx - size * 0.4, cy + size * 0.2, cx - size * 0.8, cy + size * 0.4, cx - size * 0.8, cy - size * 0.4);
    ctx.bezierCurveTo(cx - size * 0.4, cy - size * 0.6, cx, cy - size * 0.3, cx, cy - size * 0.2);
    ctx.bezierCurveTo(cx, cy - size * 0.3, cx + size * 0.4, cy - size * 0.6, cx + size * 0.8, cy - size * 0.4);
    ctx.bezierCurveTo(cx + size * 0.8, cy + size * 0.4, cx + size * 0.4, cy + size * 0.2, cx, cy + size * 0.5);
    ctx.stroke();

    // Center crease
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.2);
    ctx.lineTo(cx, cy + size * 0.5);
    ctx.stroke();

    // Page text lines
    ctx.strokeStyle = subGold;
    ctx.lineWidth = 1.5;
    [-0.2, 0, 0.2].forEach(dy => {
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.6, cy + dy * size);
      ctx.lineTo(cx - size * 0.2, cy + dy * size + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + size * 0.2, cy + dy * size + 2);
      ctx.lineTo(cx + size * 0.6, cy + dy * size);
      ctx.stroke();
    });
  } else if (emblem === 'heart') {
    // Heart of Augustine (Sacred Love & Radiant Grace)
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.6);
    ctx.bezierCurveTo(cx - size * 0.8, cy + size * 0.1, cx - size * 0.8, cy - size * 0.5, cx, cy - size * 0.2);
    ctx.bezierCurveTo(cx + size * 0.8, cy - size * 0.5, cx + size * 0.8, cy + size * 0.1, cx, cy + size * 0.6);
    ctx.stroke();

    // Radiating flame from the heart top
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.25);
    ctx.lineTo(cx, cy - size * 0.7);
    ctx.moveTo(cx - 10, cy - size * 0.2);
    ctx.lineTo(cx - 15, cy - size * 0.55);
    ctx.moveTo(cx + 10, cy - size * 0.2);
    ctx.lineTo(cx + 15, cy - size * 0.55);
    ctx.strokeStyle = subGold;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (emblem === 'dove') {
    // Holy Spirit Dove
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.8, 0, Math.PI * 2);
    ctx.strokeStyle = subGold;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - size * 0.6, cy - size * 0.1);
    ctx.bezierCurveTo(cx - size * 0.2, cy - size * 0.5, cx + size * 0.2, cy - size * 0.5, cx + size * 0.6, cy - size * 0.1);
    ctx.bezierCurveTo(cx + size * 0.3, cy + size * 0.2, cx, cy + size * 0.5, cx, cy + size * 0.6);
    ctx.bezierCurveTo(cx, cy + size * 0.5, cx - size * 0.3, cy + size * 0.2, cx - size * 0.6, cy - size * 0.1);
    ctx.stroke();
  } else {
    // Universal Radiant Cross & Shield
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.7);
    ctx.lineTo(cx, cy + size * 0.7);
    ctx.moveTo(cx - size * 0.5, cy - size * 0.2);
    ctx.lineTo(cx + size * 0.5, cy - size * 0.2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.2, size * 0.3, 0, Math.PI * 2);
    ctx.strokeStyle = subGold;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Generates an original, high-resolution original book cover as a JPEG Data URL.
 */
export function generateOriginalBookCover(
  title: string,
  author?: string,
  format: string = 'pdf',
  customTheme?: CoverTheme
): string {
  if (typeof document === 'undefined') {
    // Safe SSR fallback SVG
    return generateSvgCoverDataUrl(title, author, format, customTheme);
  }

  const width = 480;
  const height = 640;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return generateSvgCoverDataUrl(title, author, format, customTheme);
  }

  const theme = customTheme || getThemeForBook(title, author);

  // 1. Rich Leather / Parchment Gradient Background
  const bgGrad = ctx.createRadialGradient(
    width * 0.45,
    height * 0.4,
    40,
    width * 0.5,
    height * 0.5,
    width * 0.8
  );
  bgGrad.addColorStop(0, theme.primaryBg);
  bgGrad.addColorStop(1, theme.secondaryBg);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle paper/leather grain texture
  ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
  for (let i = 0; i < 400; i++) {
    const rx = Math.random() * width;
    const ry = Math.random() * height;
    ctx.fillRect(rx, ry, 2, 2);
  }

  // 2. Left Book Spine Crease & 3D Shadow
  const spineGrad = ctx.createLinearGradient(0, 0, 36, 0);
  spineGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
  spineGrad.addColorStop(0.25, 'rgba(0, 0, 0, 0.15)');
  spineGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.10)');
  spineGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.20)');
  spineGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = spineGrad;
  ctx.fillRect(0, 0, 36, height);

  // 3. Ornate Double Gold Filigree Borders
  const m1 = 24;
  ctx.strokeStyle = theme.accentGold;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(m1, m1, width - m1 * 2, height - m1 * 2);

  const m2 = 32;
  ctx.strokeStyle = theme.subGold;
  ctx.lineWidth = 1;
  ctx.strokeRect(m2, m2, width - m2 * 2, height - m2 * 2);

  // Corner Rosettes / Flourishes
  const corners = [
    [m1, m1],
    [width - m1, m1],
    [m1, height - m1],
    [width - m1, height - m1],
  ];
  ctx.fillStyle = theme.accentGold;
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // 4. Header Badge / Category
  ctx.textAlign = 'center';
  ctx.fillStyle = theme.accentGold;
  ctx.font = 'bold 11px serif';
  ctx.letterSpacing = '3px';
  const headerText = theme.tagline || 'BIBLIOTECA CRISTÃ • CLÁSSICO';
  ctx.fillText(headerText.toUpperCase(), width / 2, 68);

  // Small divider
  ctx.strokeStyle = theme.subGold;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 50, 78);
  ctx.lineTo(width / 2 + 50, 78);
  ctx.stroke();

  // 5. Theological Emblem in upper-mid
  drawEmblem(ctx, theme.emblem, width / 2, 160, 40, theme.accentGold, theme.subGold);

  // 6. Title with Auto-Wrapping and Elegant Typography
  ctx.fillStyle = theme.textColor;
  ctx.font = 'bold 28px serif';
  ctx.letterSpacing = '1px';

  const cleanTitle = (title || 'Livro Cristão').trim();
  const words = cleanTitle.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width < width - 100) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);

  // Adjust font size if title is long
  let titleY = 260;
  if (lines.length > 3) {
    ctx.font = 'bold 22px serif';
    titleY = 245;
  } else if (lines.length === 1) {
    ctx.font = 'bold 32px serif';
    titleY = 270;
  }

  const lineHeight = lines.length > 3 ? 32 : 38;
  lines.forEach((line, idx) => {
    ctx.fillText(line, width / 2, titleY + idx * lineHeight);
  });

  // Golden Diamond Rosette Divider under title
  const dividerY = titleY + lines.length * lineHeight + 20;
  ctx.strokeStyle = theme.accentGold;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 80, dividerY);
  ctx.lineTo(width / 2 - 15, dividerY);
  ctx.moveTo(width / 2 + 15, dividerY);
  ctx.lineTo(width / 2 + 80, dividerY);
  ctx.stroke();

  // Diamond center
  ctx.fillStyle = theme.accentGold;
  ctx.beginPath();
  ctx.moveTo(width / 2, dividerY - 6);
  ctx.lineTo(width / 2 + 6, dividerY);
  ctx.lineTo(width / 2, dividerY + 6);
  ctx.lineTo(width / 2 - 6, dividerY);
  ctx.closePath();
  ctx.fill();

  // 7. Author Name
  const authorName = (author || 'Autor Clássico').trim();
  ctx.fillStyle = theme.accentGold;
  ctx.font = 'bold 15px serif';
  ctx.letterSpacing = '3px';
  ctx.fillText(authorName.toUpperCase(), width / 2, dividerY + 45);

  // 8. Footer Badge (Format & Seal)
  const footerY = height - 52;
  ctx.fillStyle = theme.subGold;
  ctx.font = 'italic 11px serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('SOLI DEO GLORIA', width / 2, footerY);

  const formatText = format.toUpperCase() === 'PDF' ? 'DOCUMENTO PDF INTEGRAL' : `${format.toUpperCase()} • LIVRO DIGITAL`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.font = '9px sans-serif';
  ctx.letterSpacing = '1.5px';
  ctx.fillText(formatText, width / 2, footerY + 18);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
  canvas.width = 0;
  canvas.height = 0;
  return dataUrl;
}

/**
 * Fallback SVG Data URL for server-side generation or non-canvas environments.
 */
function generateSvgCoverDataUrl(
  title: string,
  author?: string,
  format: string = 'pdf',
  customTheme?: CoverTheme
): string {
  const theme = customTheme || getThemeForBook(title, author);
  const cleanTitle = (title || 'Livro Cristão')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const cleanAuthor = (author || 'Autor Clássico')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 640" width="480" height="640">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="${theme.primaryBg}"/>
      <stop offset="100%" stop-color="${theme.secondaryBg}"/>
    </radialGradient>
    <linearGradient id="spine" x1="0" y1="0" x2="36" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="rgba(0,0,0,0.5)"/>
      <stop offset="50%" stop-color="rgba(255,255,255,0.1)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </linearGradient>
  </defs>
  <rect width="480" height="640" fill="url(#bg)"/>
  <rect width="36" height="640" fill="url(#spine)"/>
  <rect x="24" y="24" width="432" height="592" fill="none" stroke="${theme.accentGold}" stroke-width="2.5"/>
  <rect x="32" y="32" width="416" height="576" fill="none" stroke="${theme.subGold}" stroke-width="1"/>
  <text x="240" y="68" fill="${theme.accentGold}" font-family="serif" font-size="11" font-weight="bold" letter-spacing="3" text-anchor="middle">
    ${(theme.tagline || 'BIBLIOTECA CRISTÃ • CLÁSSICO').toUpperCase()}
  </text>
  <circle cx="240" cy="160" r="36" fill="none" stroke="${theme.subGold}" stroke-width="1.5"/>
  <path d="M240 125 L240 195 M218 150 L262 150" stroke="${theme.accentGold}" stroke-width="4" stroke-linecap="round"/>
  <text x="240" y="280" fill="${theme.textColor}" font-family="serif" font-size="26" font-weight="bold" text-anchor="middle">
    ${cleanTitle}
  </text>
  <line x1="160" y1="330" x2="320" y2="330" stroke="${theme.accentGold}" stroke-width="1.5"/>
  <text x="240" y="375" fill="${theme.accentGold}" font-family="serif" font-size="14" font-weight="bold" letter-spacing="3" text-anchor="middle">
    ${cleanAuthor.toUpperCase()}
  </text>
  <text x="240" y="588" fill="${theme.subGold}" font-family="serif" font-size="11" font-style="italic" letter-spacing="2" text-anchor="middle">
    SOLI DEO GLORIA
  </text>
  <text x="240" y="608" fill="rgba(255,255,255,0.6)" font-family="sans-serif" font-size="9" letter-spacing="1.5" text-anchor="middle">
    ${format.toUpperCase()} • EDIÇÃO INTEGRAL
  </text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
