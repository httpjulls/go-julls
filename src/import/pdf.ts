/** Leitura de PDF no próprio app (offline), com pdf.js. Carregado só na tela de importação. */
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import type { PageText } from './examParser';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfDoc = Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>;

export async function openPdf(data: ArrayBuffer): Promise<PdfDoc> {
  return pdfjs.getDocument({ data: new Uint8Array(data), isEvalSupported: false }).promise;
}

export async function extractPages(doc: PdfDoc): Promise<PageText[]> {
  const pages: PageText[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    pages.push({
      page: n,
      width: vp.width,
      height: vp.height,
      items: (content.items as { str?: string; transform?: number[]; width?: number; height?: number }[])
        .filter((i) => typeof i.str === 'string' && i.transform)
        .map((i) => ({ str: i.str!, x: i.transform![4], y: i.transform![5], w: i.width ?? 0, h: i.height || Math.abs(i.transform![3]) || 10 })),
    });
  }
  return pages;
}

export interface RenderedPage {
  canvas: HTMLCanvasElement;
  scale: number;
  height: number; // altura da página em unidades do PDF
}

/** Recorta a área de uma questão (coordenadas do PDF, y para cima) da página renderizada. */
export function cropRegion(p: RenderedPage, r: { x0: number; x1: number; top: number; bottom: number }, pad = 6): string {
  const sx = Math.max(0, (r.x0 + 2) * p.scale);
  const sy = Math.max(0, (p.height - r.top - pad) * p.scale);
  const sw = Math.min(p.canvas.width - sx, (r.x1 - r.x0 - 4) * p.scale);
  const sh = Math.min(p.canvas.height - sy, (r.top - r.bottom + 2 * pad) * p.scale);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sw));
  c.height = Math.max(1, Math.round(sh));
  c.getContext('2d')!.drawImage(p.canvas, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.8);
}

/** Renderiza uma página num canvas (para recortes e para a página inteira). */
export async function renderPageCanvas(doc: PdfDoc, n: number, maxWidth = 1400): Promise<RenderedPage> {
  const page = await doc.getPage(n);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2.2, maxWidth / base.width);
  const vp = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(vp.width);
  canvas.height = Math.round(vp.height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const task = page.render({ canvasContext: ctx, viewport: vp, intent: 'print' });
  const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('tempo esgotado')), 20000));
  try {
    await Promise.race([task.promise, timeout]);
  } catch (e) {
    task.cancel();
    throw e;
  }
  return { canvas, scale, height: base.height };
}

/** Renderiza uma página como JPEG (para figuras de questões). */
export async function renderPage(doc: PdfDoc, n: number, maxWidth = 1400): Promise<string> {
  const page = await doc.getPage(n);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2.2, maxWidth / base.width);
  const vp = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(vp.width);
  canvas.height = Math.round(vp.height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // intent 'print' não usa requestAnimationFrame (que congela com a tela em segundo plano)
  const task = page.render({ canvasContext: ctx, viewport: vp, intent: 'print' });
  const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('tempo esgotado')), 20000));
  try {
    await Promise.race([task.promise, timeout]);
  } catch (e) {
    task.cancel();
    throw e;
  }
  return canvas.toDataURL('image/jpeg', 0.72);
}

export async function readFileAsArrayBuffer(f: File): Promise<ArrayBuffer> {
  return f.arrayBuffer();
}
