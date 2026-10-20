#!/usr/bin/env node
/**
 * scripts/diagnose-bible-pdf.mjs
 *
 * Diagnostic utility script that scans all pages of a Bible PDF,
 * extracts main text, aggressively normalizes strings (accents, formatting, casing),
 * and generates a chapter -> page number JSON mapping.
 *
 * Usage:
 *   node scripts/diagnose-bible-pdf.mjs [path-to-pdf] [output-json-path]
 * Example:
 *   node scripts/diagnose-bible-pdf.mjs ./public/biblia.pdf ./services/bible/bible-mapping.json
 */

import fs from 'fs';
import path from 'path';

// Aggressive string normalizer (remover acentos e case-insensitive)
function normalizeBibleText(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBibleCompact(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const BIBLE_BOOKS = [
  { name: 'Gênesis', abbrev: 'Gn', chapters: 50 },
  { name: 'Êxodo', abbrev: 'Êx', chapters: 40 },
  { name: 'Levítico', abbrev: 'Lv', chapters: 27 },
  { name: 'Números', abbrev: 'Nm', chapters: 36 },
  { name: 'Deuteronômio', abbrev: 'Dt', chapters: 34 },
  { name: 'Josué', abbrev: 'Js', chapters: 24 },
  { name: 'Juízes', abbrev: 'Jz', chapters: 21 },
  { name: 'Rute', abbrev: 'Rt', chapters: 4 },
  { name: '1 Samuel', abbrev: '1Sm', chapters: 31 },
  { name: '2 Samuel', abbrev: '2Sm', chapters: 24 },
  { name: '1 Reis', abbrev: '1Rs', chapters: 22 },
  { name: '2 Reis', abbrev: '2Rs', chapters: 25 },
  { name: '1 Crônicas', abbrev: '1Cr', chapters: 29 },
  { name: '2 Crônicas', abbrev: '2Cr', chapters: 36 },
  { name: 'Esdras', abbrev: 'Ed', chapters: 10 },
  { name: 'Neemias', abbrev: 'Ne', chapters: 13 },
  { name: 'Ester', abbrev: 'Et', chapters: 10 },
  { name: 'Jó', abbrev: 'Jó', chapters: 42 },
  { name: 'Salmos', abbrev: 'Sl', chapters: 150 },
  { name: 'Provérbios', abbrev: 'Pv', chapters: 31 },
  { name: 'Eclesiastes', abbrev: 'Ec', chapters: 12 },
  { name: 'Cânticos', abbrev: 'Ct', chapters: 8 },
  { name: 'Isaías', abbrev: 'Is', chapters: 66 },
  { name: 'Jeremias', abbrev: 'Jr', chapters: 52 },
  { name: 'Lamentações', abbrev: 'Lm', chapters: 5 },
  { name: 'Ezequiel', abbrev: 'Ez', chapters: 48 },
  { name: 'Daniel', abbrev: 'Dn', chapters: 12 },
  { name: 'Oséias', abbrev: 'Os', chapters: 14 },
  { name: 'Joel', abbrev: 'Jl', chapters: 3 },
  { name: 'Amós', abbrev: 'Am', chapters: 9 },
  { name: 'Obadias', abbrev: 'Ob', chapters: 1 },
  { name: 'Jonas', abbrev: 'Jn', chapters: 4 },
  { name: 'Miquéias', abbrev: 'Mq', chapters: 7 },
  { name: 'Naum', abbrev: 'Na', chapters: 3 },
  { name: 'Habacuque', abbrev: 'Hc', chapters: 3 },
  { name: 'Sofonias', abbrev: 'Sf', chapters: 3 },
  { name: 'Ageu', abbrev: 'Ag', chapters: 2 },
  { name: 'Zacarias', abbrev: 'Zc', chapters: 14 },
  { name: 'Malaquias', abbrev: 'Ml', chapters: 4 },
  { name: 'Mateus', abbrev: 'Mt', chapters: 28 },
  { name: 'Marcos', abbrev: 'Mc', chapters: 16 },
  { name: 'Lucas', abbrev: 'Lc', chapters: 24 },
  { name: 'João', abbrev: 'Jo', chapters: 21 },
  { name: 'Atos', abbrev: 'At', chapters: 28 },
  { name: 'Romanos', abbrev: 'Rm', chapters: 16 },
  { name: '1 Coríntios', abbrev: '1Co', chapters: 16 },
  { name: '2 Coríntios', abbrev: '2Co', chapters: 13 },
  { name: 'Gálatas', abbrev: 'Gl', chapters: 6 },
  { name: 'Efésios', abbrev: 'Ef', chapters: 6 },
  { name: 'Filipenses', abbrev: 'Fp', chapters: 4 },
  { name: 'Colossenses', abbrev: 'Cl', chapters: 4 },
  { name: '1 Tessalonicenses', abbrev: '1Ts', chapters: 5 },
  { name: '2 Tessalonicenses', abbrev: '2Ts', chapters: 3 },
  { name: '1 Timóteo', abbrev: '1Tm', chapters: 6 },
  { name: '2 Timóteo', abbrev: '2Tm', chapters: 4 },
  { name: 'Tito', abbrev: 'Tt', chapters: 3 },
  { name: 'Filemom', abbrev: 'Fm', chapters: 1 },
  { name: 'Hebreus', abbrev: 'Hb', chapters: 13 },
  { name: 'Tiago', abbrev: 'Tg', chapters: 5 },
  { name: '1 Pedro', abbrev: '1Pe', chapters: 5 },
  { name: '2 Pedro', abbrev: '2Pe', chapters: 3 },
  { name: '1 João', abbrev: '1Jo', chapters: 5 },
  { name: '2 João', abbrev: '2Jo', chapters: 1 },
  { name: '3 João', abbrev: '3Jo', chapters: 1 },
  { name: 'Judas', abbrev: 'Jd', chapters: 1 },
  { name: 'Apocalipse', abbrev: 'Ap', chapters: 22 },
];

function getAliases(bookName, abbrev) {
  const norm = normalizeBibleText(bookName);
  const aliases = new Set([norm, normalizeBibleText(abbrev)]);
  if (norm.startsWith('1 ') || norm.startsWith('1')) {
    const base = norm.replace(/^1\s*/, '');
    aliases.add(`1 ${base}`);
    aliases.add(`1${base}`);
    aliases.add(`i ${base}`);
  }
  if (norm.startsWith('2 ') || norm.startsWith('2')) {
    const base = norm.replace(/^2\s*/, '');
    aliases.add(`2 ${base}`);
    aliases.add(`2${base}`);
    aliases.add(`ii ${base}`);
  }
  return Array.from(aliases);
}

function matchesChapter(rawText, bookName, abbrev, chapter) {
  if (!rawText) return false;
  const normText = normalizeBibleText(rawText);
  const compactText = normalizeBibleCompact(rawText);
  const aliases = getAliases(bookName, abbrev);
  const chStr = String(chapter);

  for (const alias of aliases) {
    const compactAlias = normalizeBibleCompact(alias);
    const compactTarget = `${compactAlias}${chStr}`;
    const compactRegex = new RegExp(`(?:^|[^a-z0-9])${compactTarget}(?:[^0-9]|1(?:[^0-9]|$)|$)`, 'i');
    if (compactRegex.test(compactText)) {
      return true;
    }

    if (new RegExp(`\\b${alias}\\s*[-:.]?\\s*${chStr}(?!\\d)`, 'i').test(normText)) {
      return true;
    }
  }
  return false;
}

async function runDiagnostic() {
  const pdfPath = process.argv[2];
  const outputPath = process.argv[3] || './services/bible/bible-mapping.json';

  console.log('=== DIAGNÓSTICO DE MAPEAMENTO DE BÍBLIA EM PDF ===');
  console.log(`Arquivo de entrada: ${pdfPath || '(Nenhum fornecido, gerando modelo canônico)'}`);
  console.log(`Destino do JSON: ${outputPath}`);

  if (!pdfPath || !fs.existsSync(pdfPath)) {
    console.log('\nNenhum arquivo PDF local fornecido ou arquivo inexistente.');
    console.log('Gerando mapeamento canônico estruturado padrão...');

    const defaultMapping = {
      version: '1.0.0',
      description: 'Mapeamento canônico otimizado para navegação precisa da Bíblia',
      generatedAt: new Date().toISOString(),
      totalPages: 1189,
      chapters: {},
    };

    let p = 1;
    for (const b of BIBLE_BOOKS) {
      for (let c = 1; c <= b.chapters; c++) {
        const key = `${normalizeBibleCompact(b.name)}_${c}`;
        defaultMapping.chapters[key] = p;
        p += 1;
      }
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(defaultMapping, null, 2), 'utf-8');
    console.log(`Mapeamento salvo com sucesso em: ${outputPath}`);
    return;
  }

  // If a PDF file path is given, dynamic load pdfjs-dist
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdfDoc = await loadingTask.promise;

  console.log(`PDF carregado com sucesso. Total de páginas: ${pdfDoc.numPages}`);
  const chapters = {};
  let detected = 0;

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();
    const rawText = content.items.map((i) => i.str || '').join(' ');
    const normText = normalizeBibleText(rawText);

    for (const b of BIBLE_BOOKS) {
      for (let ch = 1; ch <= b.chapters; ch++) {
        const key = `${normalizeBibleCompact(b.name)}_${ch}`;
        if (chapters[key]) continue;

        const isMatch = matchesChapter(rawText, b.name, b.abbrev, ch);
        const excerpt = normText.slice(0, 80).replace(/\n/g, ' ');

        console.log(
          `[UniversalReader:Busca] Pág ${pageNum}/${pdfDoc.numPages} | Alvo: "${b.name} ${ch}" vs Encontrado: "${excerpt}..." | Match: ${isMatch ? 'SIM' : 'NÃO'}`
        );

        if (isMatch) {
          chapters[key] = pageNum;
          detected++;
        }
      }
    }
  }

  const result = {
    version: '1.0.0',
    pdfFile: path.basename(pdfPath),
    totalPages: pdfDoc.numPages,
    totalChaptersMapped: detected,
    generatedAt: new Date().toISOString(),
    chapters,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\nDiagnóstico concluído! ${detected} capítulos mapeados salvos em: ${outputPath}`);
}

runDiagnostic().catch((e) => {
  console.error('Erro durante diagnóstico:', e);
  process.exit(1);
});
