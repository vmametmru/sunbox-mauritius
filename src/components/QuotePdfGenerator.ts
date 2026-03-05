/**
 * PDF generation utilities using html2canvas + jsPDF.
 * Produces real PDF files (not browser print dialogs).
 * Implements block-aware pagination:
 *   – Measures DOM block positions before rendering
 *   – Never slices a block across pages
 *   – Shows a minimal "SUITE" header on continuation pages
 *   – Pushes the EF footer block to the bottom of the last content page
 *   – Adds a separate final action page with a single clickable button
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  getTemplate,
  getTheme,
  buildContinuationHeader,
  type QuotePdfData,
  type PdfDisplaySettings,
  type CompanyInfo,
} from './QuotePdfTemplates';

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Convert an external image URL to a base64 data URL scaled to targetH pixels tall.
 * Returns { src: data URL, w: displayed width in px } so the template can set
 * explicit width/height and html2canvas renders the image without distortion.
 */
async function imageUrlToBase64AtHeight(url: string, targetH: number): Promise<{ src: string; w: number }> {
  if (!url) return { src: '', w: 0 };
  if (url.startsWith('data:')) {
    // Already base64 — decode dimensions from the image
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const naturalH = img.naturalHeight || img.height || targetH;
        const naturalW = img.naturalWidth  || img.width  || targetH;
        const scale = targetH / naturalH;
        const w = Math.round(naturalW * scale);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (ctx) { ctx.drawImage(img, 0, 0, w, targetH); resolve({ src: canvas.toDataURL('image/jpeg', 0.85), w }); }
          else resolve({ src: url, w: targetH });
        } catch { resolve({ src: url, w: targetH }); }
      };
      img.onerror = () => resolve({ src: '', w: 0 });
      img.src = url;
    });
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const naturalH = img.naturalHeight || img.height || targetH;
        const naturalW = img.naturalWidth  || img.width  || targetH;
        const scale = targetH / naturalH;
        const w = Math.round(naturalW * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, targetH);
          resolve({ src: canvas.toDataURL('image/jpeg', 0.85), w });
        } else {
          resolve({ src: '', w: 0 });
        }
      } catch {
        resolve({ src: '', w: 0 });
      }
    };
    img.onerror = () => resolve({ src: '', w: 0 });
    img.src = url + (url.includes('?') ? '&' : '?') + '_cb=' + Date.now();
  });
}

/** Convert an external image URL to a base64 data URL (CORS-safe). */
export async function imageUrlToBase64(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve('');
        }
      } catch {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = url + (url.includes('?') ? '&' : '?') + '_cb=' + Date.now();
  });
}

/** Wait until all <img> elements inside a container are fully loaded. */
function waitForImages(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.querySelectorAll<HTMLImageElement>('img'));
  if (!imgs.length) return Promise.resolve();
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) { resolve(); return; }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  ).then(() => undefined);
}

/** Mount an HTML string in an off-screen hidden div (794 px wide). */
function mountHidden(html: string): HTMLDivElement {
  const div = document.createElement('div');
  Object.assign(div.style, {
    position:   'fixed',
    left:       '-9999px',
    top:        '0',
    width:      '794px',
    background: '#ffffff',
    zIndex:     '-1',
  });
  div.innerHTML = html;
  document.body.appendChild(div);
  return div;
}

/** Render a hidden div to a canvas at 2× scale. */
async function renderToCanvas(div: HTMLDivElement): Promise<HTMLCanvasElement> {
  return html2canvas(div, {
    scale:           2,
    useCORS:         true,
    allowTaint:      false,
    backgroundColor: '#ffffff',
    logging:         false,
    width:           794,
    windowWidth:     794,
  });
}

/** Extract a horizontal slice [srcY, srcY+sliceH) from a source canvas. */
function sliceCanvas(src: HTMLCanvasElement, srcY: number, sliceH: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width  = src.width;
  c.height = Math.max(1, sliceH);
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, srcY, src.width, sliceH, 0, 0, src.width, sliceH);
  return c;
}

/** Add a canvas image to a jsPDF page, returning the height in mm added. */
function addCanvasToPage(pdf: jsPDF, canvas: HTMLCanvasElement, yMM: number, pdfW: number): number {
  if (canvas.height <= 0) return 0;
  const heightMM = (canvas.height / canvas.width) * pdfW;
  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  pdf.addImage(imgData, 'JPEG', 0, yMM, pdfW, heightMM);
  return heightMM;
}

/** Draw the page-number footer at the very bottom-left of the current page. */
function drawPageNumber(pdf: jsPDF, current: number, total: number): void {
  const pdfH = pdf.internal.pageSize.getHeight();
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text(`page ${current} / ${total}`, 10, pdfH - 5);
}

// ─── action page ──────────────────────────────────────────────────────────────

/** Draws a dedicated action page with a single centred "respond to quote" button. */
function drawActionPage(
  pdf: jsPDF,
  quoteId: number,
  reference: string,
  primaryColor: string,
  baseUrl: string,
): void {
  const pw  = pdf.internal.pageSize.getWidth();
  const ph  = pdf.internal.pageSize.getHeight();
  const url = `${baseUrl}/#/quote-action/${quoteId}`;

  // White background
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pw, ph, 'F');

  // Light grey border box centred on the page
  const boxW = 150, boxH = 80;
  const bx = (pw - boxW) / 2;
  const by = ph / 2 - boxH / 2 - 10;
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(bx, by, boxW, boxH, 4, 4, 'S');

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(55, 65, 81);
  pdf.text(`Répondez à ce devis – Réf. ${reference}`, pw / 2, by + 14, { align: 'center' });

  // Subtitle
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128);
  pdf.text(
    'Cliquez sur le bouton pour approuver, rejeter ou demander des modifications :',
    pw / 2, by + 24, { align: 'center' },
  );

  // Single centred button
  const btnW = 80, btnH = 14;
  const btnX = (pw - btnW) / 2;
  const btnY = by + 32;

  // Parse primary color (hex) → RGB
  const hexToRgb = (h: string) => {
    const clean = (h || '#1A365D').replace('#', '');
    const big = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
    return [(big >> 16) & 255, (big >> 8) & 255, big & 255] as [number, number, number];
  };
  const [r, g, b] = hexToRgb(primaryColor);
  pdf.setFillColor(r, g, b);
  pdf.roundedRect(btnX, btnY, btnW, btnH, 3, 3, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Approuver, Rejeter ou Modifier', pw / 2, btnY + 9, { align: 'center' });
  pdf.link(btnX, btnY, btnW, btnH, { url });

  // URL hint
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(156, 163, 175);
  pdf.text(`Ou visitez : ${url}`, pw / 2, btnY + btnH + 10, { align: 'center' });
}

// ─── main generator ───────────────────────────────────────────────────────────

export interface GeneratePdfOptions {
  data: QuotePdfData;
  settings: PdfDisplaySettings;
  company: CompanyInfo;
  logoBase64?: string;
  /** Base URL for action links in the PDF. Defaults to window.location.origin */
  actionBaseUrl?: string;
}

export async function generateQuotePdf(opts: GeneratePdfOptions): Promise<jsPDF> {
  const { data, settings, company, logoBase64 = '', actionBaseUrl = window.location.origin } = opts;

  // ── 1. Pre-convert images at target height (120 px) so html2canvas renders
  //         them at the exact pixel size — no aspect-ratio distortion.
  const IMG_H = 120;
  const [photoResult, planResult] = await Promise.all([
    data.photo_url ? imageUrlToBase64AtHeight(data.photo_url, IMG_H) : Promise.resolve({ src: '', w: 0 }),
    data.plan_url  ? imageUrlToBase64AtHeight(data.plan_url,  IMG_H) : Promise.resolve({ src: '', w: 0 }),
  ]);
  const safeData: QuotePdfData = {
    ...data,
    photo_url:      photoResult.src,
    plan_url:       planResult.src,
    photo_natural_w: photoResult.w || undefined,
    plan_natural_w:  planResult.w  || undefined,
  };

  // ── 2. Build main HTML ─────────────────────────────────────────────────────
  const templateFn  = getTemplate(settings.pdf_template || '1');
  const htmlContent = templateFn(safeData, settings, company, logoBase64);
  const theme       = getTheme(settings);

  // ── 3. Mount, measure block positions, render canvas ──────────────────────
  const mainDiv = mountHidden(htmlContent);
  await waitForImages(mainDiv);

  /** Returns offsetTop + offsetHeight for a data-pdf-block element, in DOM px. */
  const measureBlock = (name: string): { top: number; bottom: number } | null => {
    const el = mainDiv.querySelector(`[data-pdf-block="${name}"]`) as HTMLElement | null;
    if (!el) return null;
    return { top: el.offsetTop, bottom: el.offsetTop + el.offsetHeight };
  };

  const bA  = measureBlock('a');
  const bB  = measureBlock('b');
  const bC  = measureBlock('c');
  const bD  = measureBlock('d');
  const bEF = measureBlock('ef');

  const mainCanvas = await renderToCanvas(mainDiv);
  document.body.removeChild(mainDiv);

  const SCALE = 2;  // matches html2canvas scale option
  const A4_W_PX = 794 * SCALE;   // = 1588 canvas pixels
  const A4_H_PX = Math.floor((297 / 210) * A4_W_PX); // ≈ 2246 canvas pixels

  // Convert DOM pixels → canvas pixels
  const toPx = (domPx: number) => Math.round(domPx * SCALE);

  // Footer (EF block) boundaries in canvas pixels
  const footerTopPx    = bEF ? toPx(bEF.top)    : mainCanvas.height;
  const footerBottomPx = bEF ? toPx(bEF.bottom)  : mainCanvas.height;
  const footerHeightPx = footerBottomPx - footerTopPx;

  // ── 4. Render continuation header canvas (if needed) ──────────────────────
  const miniHtml  = buildContinuationHeader(safeData, settings, company, logoBase64, theme);
  const miniDiv   = mountHidden(miniHtml);
  const miniCanvas = await renderToCanvas(miniDiv);
  document.body.removeChild(miniDiv);
  const MINI_H_PX = miniCanvas.height;  // canvas pixels

  // ── 5. Determine page breaks (block-aware) ─────────────────────────────────
  // Middle blocks (B, C, D) whose boundaries we must not split across pages
  const middleBlockBounds: { startPx: number; endPx: number }[] = [bB, bC, bD]
    .filter((b): b is NonNullable<typeof b> => b !== null)
    .map(b => ({ startPx: toPx(b.top), endPx: toPx(b.bottom) }));

  /**
   * Adjust a tentative page-break position to avoid splitting a block.
   * If the break falls inside any block, move the break to the block's start.
   */
  const adjustBreak = (tentative: number): number => {
    for (const b of middleBlockBounds) {
      if (tentative > b.startPx && tentative < b.endPx) {
        // The break lands mid-block → push break back to start of block
        return b.startPx;
      }
    }
    return tentative;
  };

  // "Content" = everything above the footer
  const contentEndPx = footerTopPx;

  // Determine where each content page ends (in mainCanvas pixel coordinates)
  const pageEndPositions: number[] = [];  // canvas-pixel end of content for each page
  let   pos         = 0;
  let   isFirstPage = true;

  while (pos < contentEndPx) {
    const capacity  = isFirstPage ? A4_H_PX : (A4_H_PX - MINI_H_PX);
    if (capacity <= 0) break; // should never happen, but guard against zero-capacity pages
    const natural   = pos + capacity;
    if (natural >= contentEndPx) break;  // remaining fits on one page

    const adjusted = adjustBreak(natural);
    // If adjusted <= pos (block is larger than a full page) → force break at natural to avoid infinite loop
    const breakAt = adjusted > pos ? adjusted : natural;
    pageEndPositions.push(breakAt);
    pos = breakAt;
    isFirstPage = false;
  }
  // All remaining content ends at contentEndPx (last content page)
  pageEndPositions.push(contentEndPx);

  // ── 6. Compute last-page footer placement ─────────────────────────────────
  const numContentPages = pageEndPositions.length;
  const lastPageIsFirst = numContentPages === 1;
  const lastPageMiniH   = lastPageIsFirst ? 0 : MINI_H_PX;
  const lastPageStart   = pageEndPositions.length > 1 ? pageEndPositions[pageEndPositions.length - 2] : 0;
  const lastContentH    = contentEndPx - lastPageStart;
  const lastAvailable   = A4_H_PX - lastPageMiniH;     // canvas pixels available on last content page

  // Spacer before footer so it sits at the very bottom
  const footerSpacerPx = Math.max(0, lastAvailable - lastContentH - footerHeightPx);

  // Total logical pages: content pages + action page
  const totalPages = numContentPages + 1;

  // ── 7. Assemble PDF pages ─────────────────────────────────────────────────
  const pdf  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pdfW = pdf.internal.pageSize.getWidth();   // 210 mm
  const pdfH = pdf.internal.pageSize.getHeight();  // 297 mm

  /** mm per canvas pixel at A4 width */
  const mmPerPx = pdfW / A4_W_PX;

  let currentStart = 0;

  for (let i = 0; i < numContentPages; i++) {
    if (i > 0) pdf.addPage();

    let yMM = 0;
    const isFirst = i === 0;
    const isLast  = i === numContentPages - 1;

    // Continuation header on pages 2+
    if (!isFirst) {
      yMM += addCanvasToPage(pdf, miniCanvas, 0, pdfW);
    }

    // Content slice for this page
    const sliceEnd = isLast ? contentEndPx : pageEndPositions[i];
    const sliceH   = sliceEnd - currentStart;
    if (sliceH > 0) {
      const slice = sliceCanvas(mainCanvas, currentStart, sliceH);
      yMM += addCanvasToPage(pdf, slice, yMM, pdfW);
    }

    // Footer (EF block) on the last content page, at the very bottom
    if (isLast && footerHeightPx > 0) {
      yMM += footerSpacerPx * mmPerPx;  // spacer
      const footerSlice = sliceCanvas(mainCanvas, footerTopPx, footerHeightPx);
      addCanvasToPage(pdf, footerSlice, yMM, pdfW);
    }

    // Page number
    drawPageNumber(pdf, i + 1, totalPages);

    currentStart = isLast ? contentEndPx : pageEndPositions[i];
  }

  // ── 8. Action page ────────────────────────────────────────────────────────
  pdf.addPage();
  drawActionPage(pdf, data.id, data.reference_number, settings.pdf_primary_color || '#1A365D', actionBaseUrl);
  drawPageNumber(pdf, totalPages, totalPages);

  return pdf;
}

// ─── public helpers ───────────────────────────────────────────────────────────

/** Download the PDF as a file. */
export async function downloadQuotePdf(opts: GeneratePdfOptions): Promise<void> {
  const pdf = await generateQuotePdf(opts);
  const filename = `Devis-${opts.data.reference_number}.pdf`;
  pdf.save(filename);
}

/** Return the PDF as a base64 string (for email attachment). */
export async function getQuotePdfBase64(opts: GeneratePdfOptions): Promise<string> {
  const pdf = await generateQuotePdf(opts);
  const raw = pdf.output('arraybuffer');
  let binary = '';
  const bytes = new Uint8Array(raw);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
