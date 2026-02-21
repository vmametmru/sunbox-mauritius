/**
 * PDF generation utilities using html2canvas + jsPDF.
 * Produces real PDF files (not browser print dialogs).
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getTemplate, type QuotePdfData, type PdfDisplaySettings, type CompanyInfo } from './QuotePdfTemplates';

// ─── helpers ──────────────────────────────────────────────────────────────────

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

// ─── action bar ───────────────────────────────────────────────────────────────

function drawActionBar(
  pdf: jsPDF,
  startY: number,
  quoteId: number,
  reference: string,
  primaryColor: string,
  accentColor: string,
  baseUrl: string,
) {
  const pw = pdf.internal.pageSize.getWidth();
  const approveUrl  = `${baseUrl}/#/quote-action/${quoteId}?action=approve`;
  const rejectUrl   = `${baseUrl}/#/quote-action/${quoteId}?action=reject`;
  const changesUrl  = `${baseUrl}/#/quote-action/${quoteId}?action=changes`;

  // Background
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, startY, pw, 62, 'F');

  // Top border
  pdf.setDrawColor(229, 231, 235);
  pdf.line(0, startY, pw, startY);

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(55, 65, 81);
  pdf.text(`Répondez à ce devis – Réf. ${reference}`, pw / 2, startY + 10, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128);
  pdf.text('Cliquez sur un bouton pour approuver, rejeter ou demander des modifications :', pw / 2, startY + 18, { align: 'center' });

  const btnW = 52, btnH = 14, gap = 10;
  const totalW = 3 * btnW + 2 * gap;
  const bx = (pw - totalW) / 2;
  const by = startY + 24;

  // Approve – green
  pdf.setFillColor(34, 197, 94);
  pdf.roundedRect(bx, by, btnW, btnH, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('✓  Approuver', bx + btnW / 2, by + 9, { align: 'center' });
  pdf.link(bx, by, btnW, btnH, { url: approveUrl });

  // Reject – red
  pdf.setFillColor(239, 68, 68);
  pdf.roundedRect(bx + btnW + gap, by, btnW, btnH, 2, 2, 'F');
  pdf.text('✕  Rejeter', bx + btnW + gap + btnW / 2, by + 9, { align: 'center' });
  pdf.link(bx + btnW + gap, by, btnW, btnH, { url: rejectUrl });

  // Changes – blue
  pdf.setFillColor(59, 130, 246);
  pdf.roundedRect(bx + 2 * (btnW + gap), by, btnW, btnH, 2, 2, 'F');
  pdf.text('⚙  Modifications', bx + 2 * (btnW + gap) + btnW / 2, by + 9, { align: 'center' });
  pdf.link(bx + 2 * (btnW + gap), by, btnW, btnH, { url: changesUrl });

  // URL
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(156, 163, 175);
  pdf.text(`Ou visitez : ${baseUrl}/#/quote-action/${quoteId}`, pw / 2, by + btnH + 8, { align: 'center' });
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

  // Pre-convert images to base64 to avoid CORS issues in html2canvas
  const [safePhoto, safePlan] = await Promise.all([
    data.photo_url ? imageUrlToBase64(data.photo_url) : Promise.resolve(''),
    data.plan_url  ? imageUrlToBase64(data.plan_url)  : Promise.resolve(''),
  ]);

  const safeData: QuotePdfData = { ...data, photo_url: safePhoto, plan_url: safePlan };

  // Build HTML from the selected template
  const templateFn = getTemplate(settings.pdf_template || '1');
  const htmlContent = templateFn(safeData, settings, company, logoBase64);

  // Mount in a hidden container (794 px wide – standard A4 screen width)
  const container = document.createElement('div');
  Object.assign(container.style, {
    position:   'fixed',
    left:       '-9999px',
    top:        '0',
    width:      '794px',
    background: '#ffffff',
    zIndex:     '-1',
  });
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  await waitForImages(container);

  // Capture full template as a canvas (scale=2 for quality)
  const canvas = await html2canvas(container, {
    scale:           2,
    useCORS:         true,
    allowTaint:      false,
    backgroundColor: '#ffffff',
    logging:         false,
    width:           794,
    windowWidth:     794,
  });

  document.body.removeChild(container);

  // Create jsPDF instance
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pdfW = pdf.internal.pageSize.getWidth();   // 210 mm
  const pdfH = pdf.internal.pageSize.getHeight();  // 297 mm

  // How many canvas pixels correspond to one A4 page height
  const pageHeightPx = Math.floor((pdfH / pdfW) * canvas.width);
  const totalPages   = Math.ceil(canvas.height / pageHeightPx);

  let lastContentHeightMM = 0;

  for (let i = 0; i < totalPages; i++) {
    if (i > 0) pdf.addPage();

    const srcY  = i * pageHeightPx;
    const srcH  = Math.min(pageHeightPx, canvas.height - srcY);

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width  = canvas.width;
    pageCanvas.height = srcH;
    const ctx = pageCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, -srcY);

    const imgData         = pageCanvas.toDataURL('image/jpeg', 0.92);
    const contentHeightMM = (srcH / canvas.width) * pdfW;

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, contentHeightMM);
    lastContentHeightMM = contentHeightMM;
  }

  // Action bar (62 mm tall). Add on last page if enough room, else new page.
  // Action bar height in mm — must match the height drawn by drawActionBar()
  const ACTION_BAR_H = 62;
  const remaining = pdfH - lastContentHeightMM;
  if (remaining < ACTION_BAR_H + 5) {
    pdf.addPage();
    drawActionBar(pdf, 10, data.id, data.reference_number, settings.pdf_primary_color, settings.pdf_accent_color, actionBaseUrl);
  } else {
    drawActionBar(pdf, lastContentHeightMM + 4, data.id, data.reference_number, settings.pdf_primary_color, settings.pdf_accent_color, actionBaseUrl);
  }

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
  // jsPDF output returns the raw binary, encode manually to base64
  const raw = pdf.output('arraybuffer');
  let binary = '';
  const bytes = new Uint8Array(raw);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
