/**
 * 6 PDF quote templates based on "Modele PDF Devis.pdf" layout.
 * Each template function returns a full HTML string (794px wide, portrait A4).
 * Blocks are wrapped with data-pdf-block attributes for block-aware pagination.
 * Styled with inline CSS only (html2canvas compatible).
 */

export interface QuotePdfLine {
  description: string;
  quantity: number;
  unit: string;
  unit_cost_ht: number;
  margin_percent: number;
  sale_price_ht: number;
}

export interface QuotePdfSubcategory {
  name: string;
  total_sale_price_ht: number;
  lines: QuotePdfLine[];
}

export interface QuotePdfCategory {
  name: string;
  total_sale_price_ht: number;
  subcategories?: QuotePdfSubcategory[];
  lines: QuotePdfLine[];
}

export interface QuotePdfData {
  id: number;
  reference_number: string;
  created_at: string;
  valid_until?: string;
  status: string;
  // Customer
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address?: string;
  // Model
  model_name?: string;
  model_type?: string;
  quote_title?: string;
  photo_url?: string;
  plan_url?: string;
  // Pricing
  base_price: number;
  options_total: number;
  total_price: number;
  vat_rate: number;
  notes?: string;
  // Options (model-based quotes) – simple name+price list
  options?: Array<{ option_name: string; option_price: number; option_details?: string }>;
  // Base price breakdown (model-based quotes) – categories with optional subcategories
  base_categories?: QuotePdfCategory[];
  // Categories (free quotes) – categories with optional subcategories
  categories?: QuotePdfCategory[];
  is_free_quote?: boolean;
}

export interface PdfDisplaySettings {
  pdf_primary_color: string;
  pdf_accent_color: string;
  pdf_footer_text: string;
  pdf_terms: string;
  pdf_bank_details: string;
  pdf_validity_days: string;
  pdf_show_logo: string;
  pdf_show_vat: string;
  pdf_show_bank_details: string;
  pdf_show_terms: string;
  pdf_template: string;
  pdf_font: string;
  pdf_logo_position: string;
  // Logo offset (pixels)
  pdf_logo_offset_left: string;
  pdf_logo_offset_right: string;
  pdf_logo_offset_top: string;
  pdf_logo_offset_bottom: string;
}

export interface CompanyInfo {
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
}

export const fontFamilies: Record<string, string> = {
  inter: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  roboto: '"Roboto", "Noto Sans", Arial, Helvetica, sans-serif',
  poppins: '"Poppins", "Noto Sans", Arial, Helvetica, sans-serif',
  lato: '"Lato", "Noto Sans", Arial, Helvetica, sans-serif',
  playfair: '"Playfair Display", "Georgia", "Times New Roman", serif',
};

export function getFont(settings: PdfDisplaySettings): string {
  return fontFamilies[settings.pdf_font] || fontFamilies.inter;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' Rs';
}

function fmtDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getLogoOffsetStyle(settings: PdfDisplaySettings): string {
  const left   = parseInt(settings.pdf_logo_offset_left   || '0') || 0;
  const right  = parseInt(settings.pdf_logo_offset_right  || '0') || 0;
  const top    = parseInt(settings.pdf_logo_offset_top    || '0') || 0;
  const bottom = parseInt(settings.pdf_logo_offset_bottom || '0') || 0;
  const ml = right - left;
  const mt = bottom - top;
  if (ml === 0 && mt === 0) return '';
  return `margin-left:${ml}px;margin-top:${mt}px;`;
}

// ─── PDF-model style helpers ────────────────────────────────────────────────

/** Render categories in PDF-model style: bold name + comma-separated items */
function pdfCatBlock(cats: QuotePdfCategory[] | undefined): string {
  if (!cats?.length) return '';
  let html = '';
  for (const cat of cats) {
    if (cat.subcategories?.length) {
      for (const sub of cat.subcategories) {
        const items = sub.lines.map(l => l.description).join(', ');
        html += `<div style="margin-bottom:8px;">
          <div style="font-size:12px;font-weight:700;color:#111827;">${sub.name}</div>
          ${items ? `<div style="font-size:11px;color:#4b5563;margin-top:2px;">${items}</div>` : ''}
        </div>`;
      }
    } else {
      const items = cat.lines.map(l => l.description).join(', ');
      html += `<div style="margin-bottom:8px;">
        <div style="font-size:12px;font-weight:700;color:#111827;">${cat.name}</div>
        ${items ? `<div style="font-size:11px;color:#4b5563;margin-top:2px;">${items}</div>` : ''}
      </div>`;
    }
  }
  return html;
}

/** Render options in PDF-model style: bold name + comma-separated detail items */
function pdfOptBlock(opts: QuotePdfData['options']): string {
  if (!opts?.length) return '';
  return opts.map(o => `<div style="margin-bottom:8px;">
    <div style="font-size:12px;font-weight:700;color:#111827;">${esc(o.option_name)}</div>
    ${o.option_details ? `<div style="font-size:11px;color:#4b5563;margin-top:2px;">${esc(o.option_details)}</div>` : ''}
  </div>`).join('');
}

/** Photos in a compact side-by-side layout for the model section */
function pdfPhotos(photo?: string, plan?: string): string {
  if (!photo && !plan) return '';
  return `<div style="display:flex;gap:8px;margin-top:8px;">
    ${photo ? `<img src="${photo}" style="width:${plan ? '48%' : '70%'};max-height:120px;object-fit:cover;border-radius:4px;" alt="Photo" />` : ''}
    ${plan ? `<img src="${plan}" style="width:${photo ? '48%' : '70%'};max-height:120px;object-fit:cover;border-radius:4px;" alt="Plan" />` : ''}
  </div>`;
}

/** Totals section in PDF-model style */
function pdfTotals(data: QuotePdfData, accentColor: string, showVat: boolean): string {
  const vatRate = data.vat_rate / 100;
  const totalHt = Number(data.total_price);
  const vat = totalHt * vatRate;
  const totalTtc = totalHt + vat;
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
      <div style="font-size:13px;">
        <span style="color:${accentColor};font-weight:700;">Total HT</span>
        <span style="font-weight:700;margin-left:12px;">${fmt(totalHt)}</span>
      </div>
      <div style="font-size:13px;">
        <span style="color:${accentColor};font-weight:700;">Total TTC</span>
        <span style="font-weight:700;margin-left:12px;">${fmt(totalTtc)}</span>
      </div>
    </div>
    ${showVat ? `<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;color:#6b7280;">
      <div><span>TVA (${data.vat_rate}%)</span><span style="font-weight:600;margin-left:12px;">${fmt(vat)}</span></div>
    </div>` : ''}
    ${data.notes ? `<div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Notes : ${esc(data.notes)}</div>` : ''}
    <div style="border-top:1px solid #d1d5db;margin-top:6px;padding-top:8px;text-align:right;">
      <span style="font-size:24px;font-weight:800;color:${accentColor};">${fmt(totalTtc)}</span>
    </div>
  `;
}

/** Signature + bank details bottom box (no action button) */
function pdfSignatureBox(settings: PdfDisplaySettings): string {
  const showBank = settings.pdf_show_bank_details === 'true';
  const bankDetails = settings.pdf_bank_details || '';
  const hasBank = showBank && !!bankDetails;
  return `<div style="display:flex;border:1px solid #d1d5db;min-height:64px;">
    <div style="flex:1.5;padding:10px 14px;${hasBank ? 'border-right:1px solid #d1d5db;' : ''}">
      <div style="font-size:11px;color:#6b7280;">Bon pour accord : (Signature et date)</div>
    </div>
    ${hasBank ? `<div style="flex:1;padding:10px 14px;">
      <div style="font-size:11px;"><strong style="color:#374151;">Coordonnées bancaires :</strong><br/><span style="color:#6b7280;white-space:pre-line;">${esc(bankDetails)}</span></div>
    </div>` : ''}
  </div>`;
}

// ─── Internal template builder ──────────────────────────────────────────────

export interface TemplateTheme {
  primary: string;
  accent: string;
  barColor: string;
  barHeight: number;
  titleStyle: string;
  divider: string;
  sectionLabelColor: string;
}

export function buildTemplate(
  data: QuotePdfData,
  settings: PdfDisplaySettings,
  company: CompanyInfo,
  logoBase64: string,
  theme: TemplateTheme,
): string {
  const font = getFont(settings);
  const showVat = settings.pdf_show_vat === 'true';
  const modelTitle = data.is_free_quote ? (data.quote_title || 'Devis') : (data.model_name || '');
  const baseTtc = Number(data.base_price) * (1 + data.vat_rate / 100);
  const optionsTtc = Number(data.options_total) * (1 + data.vat_rate / 100);
  const hasOptions = !data.is_free_quote && (data.options?.length || 0) > 0;
  const baseCategories = data.is_free_quote ? data.categories : data.base_categories;
  const hasCats = (baseCategories?.length || 0) > 0;
  const div = theme.divider;

  const offsetStyle = getLogoOffsetStyle(settings);
  const logoHtml = settings.pdf_show_logo === 'true' && logoBase64
    ? `<img src="${logoBase64}" style="${offsetStyle}height:48px;max-width:160px;object-fit:contain;display:block;margin-bottom:8px;" alt="Logo" />`
    : '';

  return `<div style="font-family:${font};width:794px;background:#fff;color:#1f2937;">

    <!-- BLOCK A: HEADER -->
    <div data-pdf-block="a">
      <div style="background:${theme.barColor};height:${theme.barHeight}px;"></div>
      <div style="padding:22px 40px 16px;display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          ${logoHtml}
          <div style="font-size:11px;color:#4b5563;line-height:1.7;">
            ${company.company_name ? `<div style="font-weight:600;color:#374151;">${company.company_name}</div>` : ''}
            ${company.company_address ? `<div>${company.company_address}</div>` : ''}
            ${company.company_phone ? `<div>${company.company_phone}</div>` : ''}
            ${company.company_email ? `<div>${company.company_email}</div>` : ''}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="${theme.titleStyle}">Devis</div>
          <div style="font-size:12px;color:#374151;margin-top:4px;">${data.reference_number}</div>
          <div style="font-size:11px;color:${theme.accent};font-weight:600;margin-top:2px;">envoyé le ${fmtDate(data.created_at)}</div>
        </div>
      </div>
      <div style="border-bottom:1px solid ${div};margin:0 40px;"></div>
    </div>

    <!-- BLOCK B: CLIENT + MODEL -->
    <div data-pdf-block="b">
      <div style="padding:12px 40px 8px;display:flex;gap:32px;">
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;color:${theme.sectionLabelColor};margin-bottom:6px;">Client</div>
          <div style="font-size:11px;color:#374151;line-height:1.7;">
            <div>${data.customer_name}</div>
            ${data.customer_address ? `<div>${data.customer_address}</div>` : ''}
            ${data.customer_email ? `<div>${data.customer_email}</div>` : ''}
            ${data.customer_phone ? `<div>${data.customer_phone}</div>` : ''}
          </div>
        </div>
        <div style="flex:1.3;">
          ${modelTitle ? `<div style="font-size:13px;font-weight:700;color:${theme.sectionLabelColor};margin-bottom:6px;">Modèle : <span style="font-weight:400;">${modelTitle}</span></div>` : ''}
          ${pdfPhotos(data.photo_url, data.plan_url)}
        </div>
      </div>
      <div style="border-bottom:1px solid ${div};margin:8px 40px 0;"></div>
    </div>

    <!-- BLOCK C: BASE CATEGORIES -->
    ${hasCats ? `
    <div data-pdf-block="c">
      <div style="padding:12px 40px 8px;">
        <div style="font-size:13px;font-weight:700;color:${theme.sectionLabelColor};text-decoration:underline;margin-bottom:10px;">
          ${data.is_free_quote ? 'Descriptif :' : 'Inclus dans le prix de base :'}
        </div>
        ${pdfCatBlock(baseCategories)}
        ${!data.is_free_quote ? `<div style="text-align:right;margin-top:10px;font-size:12px;border-top:1px solid ${div};padding-top:8px;">
          <span style="color:${theme.accent};font-weight:600;">Prix de Base TTC</span>
          <span style="font-weight:700;margin-left:16px;">${fmt(baseTtc)}</span>
        </div>` : ''}
      </div>
      <div style="border-bottom:1px solid ${div};margin:0 40px;"></div>
    </div>
    ` : ''}

    <!-- BLOCK D: OPTIONS -->
    ${hasOptions ? `
    <div data-pdf-block="d">
      <div style="padding:12px 40px 8px;">
        <div style="font-size:13px;font-weight:700;color:${theme.sectionLabelColor};margin-bottom:10px;">Option(s) Sélectionnée(s) :</div>
        ${pdfOptBlock(data.options)}
        <div style="text-align:right;margin-top:10px;font-size:12px;border-top:1px solid ${div};padding-top:8px;">
          <span style="color:${theme.accent};font-weight:600;">Prix des Options TTC</span>
          <span style="font-weight:700;margin-left:16px;">${fmt(optionsTtc)}</span>
        </div>
      </div>
      <div style="border-bottom:1px solid ${div};margin:0 40px;"></div>
    </div>
    ` : ''}

    <!-- BLOCKS E+F: FOOTER (validity + totals + signature + terms) -->
    <div data-pdf-block="ef">
      <div style="padding:8px 40px 4px;">
        <div style="font-size:11px;color:#9a3412;background:#fff7ed;border:1px solid #fdba74;border-radius:4px;padding:6px 12px;display:inline-block;">
          ⏱ Devis valable : ${data.valid_until ? fmtDate(data.valid_until) : `${settings.pdf_validity_days || 30} jours à compter de la date d'émission`}
        </div>
      </div>
      <div style="padding:8px 40px 12px;">
        ${pdfTotals(data, theme.accent, showVat)}
      </div>
      <div style="margin:0 40px 12px;">
        ${pdfSignatureBox(settings)}
      </div>
      ${settings.pdf_show_terms === 'true' && settings.pdf_terms ? `
      <div style="padding:0 40px 8px;font-size:11px;font-weight:600;color:#374151;">
        Modalités de paiements : ${esc(settings.pdf_terms)}
      </div>
      ` : ''}
      ${settings.pdf_footer_text ? `<div style="padding:4px 40px 8px;font-size:10px;color:#9ca3af;text-align:center;">${esc(settings.pdf_footer_text)}</div>` : ''}
      <div style="background:${theme.barColor};height:${theme.barHeight}px;margin-top:4px;"></div>
    </div>

  </div>`;
}

/** Compact continuation header rendered on pages 2+ when content spans multiple pages */
export function buildContinuationHeader(
  data: QuotePdfData,
  settings: PdfDisplaySettings,
  company: CompanyInfo,
  logoBase64: string,
  theme: TemplateTheme,
): string {
  const font = getFont(settings);
  const offsetStyle = getLogoOffsetStyle(settings);
  const logoHtml = settings.pdf_show_logo === 'true' && logoBase64
    ? `<img src="${logoBase64}" style="${offsetStyle}height:24px;max-width:80px;object-fit:contain;display:block;" alt="Logo" />`
    : '';
  return `<div style="font-family:${font};width:794px;background:${theme.barColor};">
    <div style="padding:8px 40px;display:flex;justify-content:space-between;align-items:center;">
      <div style="display:flex;align-items:center;gap:10px;">
        ${logoHtml}
        <div style="font-size:10px;color:rgba(255,255,255,0.85);">${company.company_name}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.5);letter-spacing:2px;">SUITE</div>
        <div style="font-size:10px;color:#fff;font-weight:600;">${data.reference_number}</div>
      </div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// TEMPLATE 1 – ÉLÉGANT (Navy + Orange)
// ─────────────────────────────────────────────
export function template1(data: QuotePdfData, settings: PdfDisplaySettings, company: CompanyInfo, logoBase64: string): string {
  const primary = settings.pdf_primary_color || '#1A365D';
  const accent  = settings.pdf_accent_color  || '#f97316';
  return buildTemplate(data, settings, company, logoBase64, {
    primary,
    accent,
    barColor:          primary,
    barHeight:         6,
    titleStyle:        `font-size:38px;font-weight:800;color:${primary};`,
    divider:           '#d1d5db',
    sectionLabelColor: '#111827',
  });
}

// ─────────────────────────────────────────────
// TEMPLATE 2 – MINIMALISTE (Black + thin lines)
// ─────────────────────────────────────────────
export function template2(data: QuotePdfData, settings: PdfDisplaySettings, company: CompanyInfo, logoBase64: string): string {
  const primary = settings.pdf_primary_color || '#111827';
  const accent  = settings.pdf_accent_color  || '#374151';
  return buildTemplate(data, settings, company, logoBase64, {
    primary,
    accent,
    barColor:          primary,
    barHeight:         2,
    titleStyle:        `font-size:44px;font-weight:800;color:${primary};letter-spacing:-1px;`,
    divider:           '#e5e7eb',
    sectionLabelColor: '#111827',
  });
}

// ─────────────────────────────────────────────
// TEMPLATE 3 – SOLAIRE (Orange + Navy)
// ─────────────────────────────────────────────
export function template3(data: QuotePdfData, settings: PdfDisplaySettings, company: CompanyInfo, logoBase64: string): string {
  const primary = settings.pdf_primary_color || '#ea580c';
  const accent  = settings.pdf_accent_color  || '#ea580c';
  return buildTemplate(data, settings, company, logoBase64, {
    primary,
    accent,
    barColor:          primary,
    barHeight:         6,
    titleStyle:        `font-size:38px;font-weight:800;color:${primary};`,
    divider:           '#fed7aa',
    sectionLabelColor: '#9a3412',
  });
}

// ─────────────────────────────────────────────
// TEMPLATE 4 – NUIT (Dark Slate + Orange)
// ─────────────────────────────────────────────
export function template4(data: QuotePdfData, settings: PdfDisplaySettings, company: CompanyInfo, logoBase64: string): string {
  const primary = settings.pdf_primary_color || '#0f172a';
  const accent  = settings.pdf_accent_color  || '#f97316';
  return buildTemplate(data, settings, company, logoBase64, {
    primary,
    accent,
    barColor:          primary,
    barHeight:         8,
    titleStyle:        `font-size:38px;font-weight:800;color:${primary};`,
    divider:           '#cbd5e1',
    sectionLabelColor: '#1e293b',
  });
}

// ─────────────────────────────────────────────
// TEMPLATE 5 – MODERNE (Blue + Orange)
// ─────────────────────────────────────────────
export function template5(data: QuotePdfData, settings: PdfDisplaySettings, company: CompanyInfo, logoBase64: string): string {
  const primary = settings.pdf_primary_color || '#0369a1';
  const accent  = settings.pdf_accent_color  || '#f97316';
  return buildTemplate(data, settings, company, logoBase64, {
    primary,
    accent,
    barColor:          primary,
    barHeight:         6,
    titleStyle:        `font-size:38px;font-weight:800;color:${primary};`,
    divider:           '#bae6fd',
    sectionLabelColor: primary,
  });
}

// ─────────────────────────────────────────────
// TEMPLATE 6 – AQUA (Teal + Orange)
// ─────────────────────────────────────────────
export function template6(data: QuotePdfData, settings: PdfDisplaySettings, company: CompanyInfo, logoBase64: string): string {
  const primary = settings.pdf_primary_color || '#0d9488';
  const accent  = settings.pdf_accent_color  || '#f97316';
  return buildTemplate(data, settings, company, logoBase64, {
    primary,
    accent,
    barColor:          primary,
    barHeight:         6,
    titleStyle:        `font-size:38px;font-weight:800;color:${primary};`,
    divider:           '#99f6e4',
    sectionLabelColor: primary,
  });
}

const TEMPLATE_THEMES: Record<string, (settings: PdfDisplaySettings) => TemplateTheme> = {
  '1': (s) => { const p = s.pdf_primary_color || '#1A365D'; const a = s.pdf_accent_color || '#f97316'; return { primary: p, accent: a, barColor: p, barHeight: 6, titleStyle: `font-size:38px;font-weight:800;color:${p};`, divider: '#d1d5db', sectionLabelColor: '#111827' }; },
  '2': (s) => { const p = s.pdf_primary_color || '#111827'; const a = s.pdf_accent_color || '#374151'; return { primary: p, accent: a, barColor: p, barHeight: 2, titleStyle: `font-size:44px;font-weight:800;color:${p};letter-spacing:-1px;`, divider: '#e5e7eb', sectionLabelColor: '#111827' }; },
  '3': (s) => { const p = s.pdf_primary_color || '#ea580c'; const a = s.pdf_accent_color || '#ea580c'; return { primary: p, accent: a, barColor: p, barHeight: 6, titleStyle: `font-size:38px;font-weight:800;color:${p};`, divider: '#fed7aa', sectionLabelColor: '#9a3412' }; },
  '4': (s) => { const p = s.pdf_primary_color || '#0f172a'; const a = s.pdf_accent_color || '#f97316'; return { primary: p, accent: a, barColor: p, barHeight: 8, titleStyle: `font-size:38px;font-weight:800;color:${p};`, divider: '#cbd5e1', sectionLabelColor: '#1e293b' }; },
  '5': (s) => { const p = s.pdf_primary_color || '#0369a1'; const a = s.pdf_accent_color || '#f97316'; return { primary: p, accent: a, barColor: p, barHeight: 6, titleStyle: `font-size:38px;font-weight:800;color:${p};`, divider: '#bae6fd', sectionLabelColor: p }; },
  '6': (s) => { const p = s.pdf_primary_color || '#0d9488'; const a = s.pdf_accent_color || '#f97316'; return { primary: p, accent: a, barColor: p, barHeight: 6, titleStyle: `font-size:38px;font-weight:800;color:${p};`, divider: '#99f6e4', sectionLabelColor: p }; },
};

export function getTheme(settings: PdfDisplaySettings): TemplateTheme {
  return (TEMPLATE_THEMES[settings.pdf_template || '1'] || TEMPLATE_THEMES['1'])(settings);
}

export const TEMPLATES: Record<string, (data: QuotePdfData, settings: PdfDisplaySettings, company: CompanyInfo, logo: string) => string> = {
  '1': template1,
  '2': template2,
  '3': template3,
  '4': template4,
  '5': template5,
  '6': template6,
};

export const TEMPLATE_NAMES: Record<string, string> = {
  '1': 'Élégant',
  '2': 'Minimaliste',
  '3': 'Solaire',
  '4': 'Nuit',
  '5': 'Moderne',
  '6': 'Aqua',
};

export const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  '1': 'Bandes marines, accent orange, fidèle au modèle PDF',
  '2': 'Bande fine noire, typographie épurée, style minimaliste',
  '3': 'Bandes orangées, accent chaud et lumineux',
  '4': 'Bandes ardoise sombre, accent orange, style luxe',
  '5': 'Bandes bleues, accent orange, style corporate',
  '6': 'Bandes sarcelles, accent orange, fraîcheur contemporaine',
};

export function getTemplate(templateId: string) {
  return TEMPLATES[templateId] || TEMPLATES['1'];
}
