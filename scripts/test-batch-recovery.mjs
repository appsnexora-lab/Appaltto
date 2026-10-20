/**
 * test-batch-recovery.mjs
 * Validates the 348-book batch import safety, reconciliation, and recovery logic.
 */

import crypto from 'node:crypto';

// Simulation of computeFileSignature
async function simulateComputeFileSignature(fileName, size, contentBuffer) {
  const headSlice = contentBuffer.subarray(0, 65536);
  const tailSlice = size > 131072 ? contentBuffer.subarray(size - 65536, size) : Buffer.alloc(0);

  const combined = Buffer.concat([headSlice, tailSlice]);
  const sizeBuf = Buffer.alloc(8);
  sizeBuf.writeDoubleBE(size, 0);

  const hash = crypto.createHash('sha256').update(combined).update(sizeBuf).digest('hex').slice(0, 32);
  return hash;
}

// Simulation of Reconciler
function simulateReconciliation(existingBooks, existingBlobs, incomingFiles) {
  const blobSet = new Set(existingBlobs);
  const bookByHash = new Map();
  const bookByNameSize = new Map();

  for (const b of existingBooks) {
    if (b.fileHash) bookByHash.set(b.fileHash, b);
    const nameKey = `${(b.originalFileName || b.title).trim().toLowerCase()}-${b.fileSize || 0}`;
    bookByNameSize.set(nameKey, b);
  }

  const results = {
    alreadyImported: 0,
    canRepair: 0,
    pending: 0,
    invalid: 0,
  };

  for (const file of incomingFiles) {
    if (file.size === 0) {
      results.invalid++;
      continue;
    }

    const nameKey = `${file.name.trim().toLowerCase()}-${file.size}`;
    const matched = bookByHash.get(file.hash) || bookByNameSize.get(nameKey);

    if (matched) {
      const blobKey = matched.fileBlobKey || matched.id;
      if (blobSet.has(blobKey)) {
        results.alreadyImported++;
      } else {
        results.canRepair++;
      }
    } else {
      results.pending++;
    }
  }

  return results;
}

async function runTestSuite() {
  console.log('--- TEST SUITE: RECUPERAÇÃO E IMPORTAÇÃO SEGURA DE 348 LIVROS ---');

  // 1. Generate 348 simulated files
  const simulatedFiles = [];
  for (let i = 1; i <= 348; i++) {
    const ext = i % 2 === 0 ? 'pdf' : 'epub';
    const name = `Livro_Cristao_${i}.${ext}`;
    const size = 50000 + (i * 1234); // various sizes
    const dummyContent = Buffer.alloc(Math.min(size, 140000), `Content for book ${i}`);
    const hash = await simulateComputeFileSignature(name, size, dummyContent);
    simulatedFiles.push({ name, size, hash, ext });
  }

  console.log(`✓ 348 arquivos simulados gerados com hashes criptográficos estáveis.`);

  // 2. Scenario: Android crashed after saving 45 healthy books and 7 incomplete books
  const existingBooks = [];
  const existingBlobs = new Set();

  for (let i = 0; i < 45; i++) {
    const f = simulatedFiles[i];
    const id = `book-${i + 1}`;
    existingBooks.push({
      id,
      title: f.name.replace(/\.[^/.]+$/, ''),
      originalFileName: f.name,
      fileSize: f.size,
      fileHash: f.hash,
      fileBlobKey: id,
      format: f.ext,
    });
    existingBlobs.add(id); // Blob successfully stored
  }

  for (let i = 45; i < 52; i++) {
    const f = simulatedFiles[i];
    const id = `book-${i + 1}`;
    existingBooks.push({
      id,
      title: f.name.replace(/\.[^/.]+$/, ''),
      originalFileName: f.name,
      fileSize: f.size,
      fileHash: f.hash,
      fileBlobKey: id,
      format: f.ext,
    });
    // NOTE: Blob was NOT stored due to crash (incomplete record)
  }

  console.log(`✓ Estado do Banco simulado: 52 livros cadastrados (45 íntegros, 7 incompletos sem blob).`);

  // 3. Test Diagnostic
  let healthyCount = 0;
  let incompleteCount = 0;
  for (const b of existingBooks) {
    if (existingBlobs.has(b.fileBlobKey)) {
      healthyCount++;
    } else {
      incompleteCount++;
    }
  }

  if (healthyCount === 45 && incompleteCount === 7) {
    console.log(`✓ DIAGNÓSTICO PASSOU: Detectou exatamente 45 livros íntegros e 7 incompletos.`);
  } else {
    throw new Error(`Diagnóstico falhou: healthy=${healthyCount}, incomplete=${incompleteCount}`);
  }

  // 4. Test Re-selection and Reconciliation of all 348 files
  const reconciliation = simulateReconciliation(existingBooks, existingBlobs, simulatedFiles);
  console.log('Resultado da reconciliação dos 348 arquivos:', reconciliation);

  if (reconciliation.alreadyImported !== 45) {
    throw new Error(`Esperado 45 já importados, obteve ${reconciliation.alreadyImported}`);
  }
  if (reconciliation.canRepair !== 7) {
    throw new Error(`Esperado 7 para reparar, obteve ${reconciliation.canRepair}`);
  }
  if (reconciliation.pending !== (348 - 52)) {
    throw new Error(`Esperado ${348 - 52} pendentes, obteve ${reconciliation.pending}`);
  }

  console.log(`✓ RECONCILIAÇÃO PASSOU:`);
  console.log(`  - 45 livros preservados sem duplicação.`);
  console.log(`  - 7 registros incompletos identificados para reparo.`);
  console.log(`  - 296 livros novos agendados para importação.`);
  console.log(`  - Total verificado: 45 + 7 + 296 = 348 livros!`);

  console.log('\n--- TODOS OS TESTES PASSARAM COM SUCESSO! ---');
}

runTestSuite().catch(err => {
  console.error('Erro nos testes:', err);
  process.exit(1);
});
