import type {PDFDocumentProxy} from 'pdfjs-dist';
import type {TextItem} from 'pdfjs-dist/types/src/display/api';
import {encodeImage} from './encode-image';

// Finds the drawing of each «Pregunta N» (a staff, a diagram…) and returns it as an image.
// Within a question, the drawing is the tallest gap without text that has ink (blank space at the end of a page is skipped).
const SCALE = 2;
const MIN_GAP = 28; // points: more than two text lines

export async function questionFigures(pdf: PDFDocumentProxy): Promise<Record<number, string>> {
  const figures: Record<number, string> = {};
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const items = (await page.getTextContent()).items.filter((i): i is TextItem => 'str' in i && i.str.trim() !== '');
    if (items.some((i) => /solucionario/i.test(i.str))) continue;
    const heads = items
      .map((i) => ({ number: Number(i.str.trim().match(/^Pregunta\s+(\d+)$/i)?.[1]), y: i.transform[5] }))
      .filter((h) => h.number > 0)
      .sort((a, b) => b.y - a.y);
    if (!heads.length) continue;
    const viewport = page.getViewport({ scale: SCALE });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) continue;
    // «print» draws straight away; «display» waits for animation frames, which stop when the tab is not visible.
    await page.render({ canvas, canvasContext: context, viewport, intent: 'print' }).promise;
    const bottomOfPage = Math.min(...items.map((i) => i.transform[5]));
    for (const [index, head] of heads.entries()) {
      const floor = index + 1 < heads.length ? heads[index + 1].y : bottomOfPage;
      const lines = [...new Set(items.map((i) => i.transform[5]).filter((y) => y <= head.y && y > floor))].sort((a, b) => b - a);
      const edges = [...lines, floor];
      const gaps = edges
        .slice(0, -1)
        .map((top, k) => ({ top, bottom: edges[k + 1] }))
        .filter((g) => g.top - g.bottom >= MIN_GAP)
        .sort((a, b) => b.top - b.bottom - (a.top - a.bottom));
      for (const gap of gaps) {
        // Text baselines: leave room for the line above, stop above the next line's capitals.
        const top = Math.round((viewport.height / SCALE - gap.top + 4) * SCALE);
        const bottom = Math.round((viewport.height / SCALE - gap.bottom - 12) * SCALE);
        const image = cropInk(context, top, bottom, canvas.width);
        if (image) {
          figures[head.number] = await encodeImage(image, image.width, image.height);
          break;
        }
      }
    }
  }
  return figures;
}

// Trims the white margins of a band of the page; null when the band is blank.
function cropInk(context: CanvasRenderingContext2D, top: number, bottom: number, width: number) {
  const height = bottom - top;
  if (height < 10) return null;
  const { data } = context.getImageData(0, top, width, height);
  let minX = width, maxX = -1, minY = height, maxY = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4;
      if (data[at] + data[at + 1] + data[at + 2] < 690) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  if (maxX - minX < 20 || maxY - minY < 10) return null;
  const pad = 12;
  const x0 = Math.max(0, minX - pad), y0 = Math.max(0, minY - pad);
  const w = Math.min(width, maxX + pad) - x0, h = Math.min(height, maxY + pad) - y0;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const target = out.getContext('2d');
  if (!target) return null;
  target.fillStyle = 'white';
  target.fillRect(0, 0, w, h);
  target.drawImage(context.canvas, x0, top + y0, w, h, 0, 0, w, h);
  return out;
}
