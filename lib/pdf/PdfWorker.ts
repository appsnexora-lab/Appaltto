/**
 * PdfWorker.ts
 * Manages the PDF.js library instance and sets up the Web Worker for background processing.
 */

import * as pdfjsLib from 'pdfjs-dist';

let isWorkerInitialized = false;

export function initPdfWorker(): typeof pdfjsLib {
  if (typeof window === 'undefined') {
    return pdfjsLib;
  }

  if (!isWorkerInitialized) {
    try {
      // Use local bundled worker from public directory for fast, offline, and secure same-origin execution
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      }
      isWorkerInitialized = true;
    } catch (e) {
      console.warn('PDF Worker initialization notice:', e);
    }
  }

  return pdfjsLib;
}

export { pdfjsLib };
