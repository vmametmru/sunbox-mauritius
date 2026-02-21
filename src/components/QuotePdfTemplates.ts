/**
 * 6 hardcoded PDF quote templates.
 * Each template function returns a full HTML string (794px wide, portrait A4).
 * Styled with inline CSS only (html2canvas compatible).
 */

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
  // Options (model-based quotes)
  options?: Array<{ option_name: string; option_price: number }>;
  // Categories (free quotes)
  categories?: Array<{
    name: string;
    total_sale_price_ht: number;
    lines: Array<{
      description: string;
      quantity: number;
      unit: string;
      unit_cost_ht: number;
      margin_percent: number;
      sale_price_ht: number;
    }>;
  }>;
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
}

export interface CompanyInfo {
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
}

const fontFamilies: Record<string, string> = {
  inter: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  roboto: '"Roboto", "Noto Sans", Arial, Helvetica, sans-serif',
  poppins: '"Poppins", "Noto Sans", Arial, Helvetica, sans-serif',
  lato: '"Lato", "Noto Sans", Arial, Helvetica, sans-serif',
  playfair: '"Playfair Display", "Georgia", "Times New Roman", serif',
};

function getFont(settings: PdfDisplaySettings): string {
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

function logoAlign(pos: string): string {
  if (pos === 'center') return 'center';
  if (pos === 'right') return 'flex-end';
  return 'flex-start';
}

function logoSection(settings: PdfDisplaySettings, logoBase64: string, size = 56): string {
  if (settings.pdf_show_logo !== 'true' || !logoBase64) return '';
  const align = logoAlign(settings.pdf_logo_position);
  return `<div style="display:flex;justify-content:${align};margin-bottom:8px;">
    <img src="${logoBase64}" style="height:${size}px;max-width:180px;object-fit:contain;" alt="Logo" />
  </div>`;
}

function titleBlock(title: string): string {
  return `<div style="display:inline-block;background:#f97316;color:#fff;font-size:11px;font-weight:700;letter-spacing:2px;padding:4px 12px;border-radius:3px;margin-bottom:4px;">DEVIS</div>
  <div style="font-size:20px;font-weight:700;margin-bottom:2px;">${title}</div>`;
}

function imagesBlock(photo?: string, plan?: string): string {
  if (!photo && !plan) return '';
  return `<div style="display:flex;gap:16px;margin-bottom:24px;">
    ${photo ? `<div style="flex:1;text-align:center;">
      <img src="${photo}" style="width:100%;max-height:180px;object-fit:cover;border-radius:8px;" alt="Photo du modèle" />
      <div style="font-size:11px;color:#6b7280;margin-top:6px;">Photo du modèle</div>
    </div>` : ''}
    ${plan ? `<div style="flex:1;text-align:center;">
      <img src="${plan}" style="width:100%;max-height:180px;object-fit:cover;border-radius:8px;" alt="Plan" />
      <div style="font-size:11px;color:#6b7280;margin-top:6px;">Plan / Vue de dessus</div>
    </div>` : ''}
  </div>`;
}

function linesTable(categories: QuotePdfData['categories'], accentColor: string): string {
  if (!categories?.length) return '';
  let html = '';
  for (const cat of categories) {
    html += `<div style="margin-bottom:16px;">
      <div style="font-size:13px;font-weight:700;color:${accentColor};padding:6px 0;border-bottom:2px solid ${accentColor};margin-bottom:8px;">${cat.name}</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="text-align:left;padding:6px 8px;color:#6b7280;font-weight:600;">Description</th>
            <th style="text-align:center;padding:6px 8px;color:#6b7280;font-weight:600;width:60px;">Qté</th>
            <th style="text-align:center;padding:6px 8px;color:#6b7280;font-weight:600;width:50px;">Unité</th>
            <th style="text-align:right;padding:6px 8px;color:#6b7280;font-weight:600;width:100px;">Prix HT</th>
          </tr>
        </thead>
        <tbody>
          ${cat.lines.map((l, i) => `
          <tr style="border-bottom:1px solid #e5e7eb;${i % 2 === 1 ? 'background:#fafafa;' : ''}">
            <td style="padding:6px 8px;">${l.description}</td>
            <td style="text-align:center;padding:6px 8px;">${l.quantity}</td>
            <td style="text-align:center;padding:6px 8px;">${l.unit}</td>
            <td style="text-align:right;padding:6px 8px;font-weight:600;">${fmt(l.sale_price_ht)}</td>
          </tr>`).join('')}
          <tr style="background:#f9fafb;font-weight:700;">
            <td colspan="3" style="padding:8px;text-align:right;color:#374151;">Sous-total</td>
            <td style="padding:8px;text-align:right;color:${accentColor};">${fmt(cat.total_sale_price_ht)}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
  }
  return html;
}

function optionsTable(options: QuotePdfData['options'], accentColor: string): string {
  if (!options?.length) return '';
  const total = options.reduce((s, o) => s + Number(o.option_price), 0);
  return `<div style="margin-bottom:16px;">
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="text-align:left;padding:6px 8px;color:#6b7280;font-weight:600;">Option</th>
          <th style="text-align:right;padding:6px 8px;color:#6b7280;font-weight:600;width:120px;">Prix HT</th>
        </tr>
      </thead>
      <tbody>
        ${options.map((o, i) => `
        <tr style="border-bottom:1px solid #e5e7eb;${i % 2 === 1 ? 'background:#fafafa;' : ''}">
          <td style="padding:6px 8px;">${o.option_name}</td>
          <td style="text-align:right;padding:6px 8px;font-weight:600;">${fmt(Number(o.option_price))}</td>
        </tr>`).join('')}
        <tr style="background:#f9fafb;font-weight:700;">
          <td style="padding:8px;text-align:right;color:#374151;">Total Options HT</td>
          <td style="padding:8px;text-align:right;color:${accentColor};">${fmt(total)}</td>
        </tr>
      </tbody>
    </table>
  </div>`;
}

function totalsBlock(data: QuotePdfData, primaryColor: string, accentColor: string, showVat: boolean): string {
  const vat = data.total_price * (data.vat_rate / 100);
  const ttc = data.total_price + vat;
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;">
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:8px 12px;color:#6b7280;">Total Base HT</td>
      <td style="padding:8px 12px;text-align:right;font-weight:600;">${fmt(Number(data.base_price))}</td>
    </tr>
    ${Number(data.options_total) > 0 ? `<tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:8px 12px;color:#6b7280;">Total Options HT</td>
      <td style="padding:8px 12px;text-align:right;font-weight:600;">${fmt(Number(data.options_total))}</td>
    </tr>` : ''}
    <tr style="border-bottom:2px solid ${accentColor};">
      <td style="padding:8px 12px;font-weight:700;color:${primaryColor};">Grand Total HT</td>
      <td style="padding:8px 12px;text-align:right;font-weight:700;font-size:15px;color:${primaryColor};">${fmt(Number(data.total_price))}</td>
    </tr>
    ${showVat ? `<tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:8px 12px;color:#6b7280;">TVA (${data.vat_rate}%)</td>
      <td style="padding:8px 12px;text-align:right;">${fmt(vat)}</td>
    </tr>
    <tr style="background:${accentColor};">
      <td style="padding:12px;font-weight:700;color:#fff;font-size:15px;">Grand Total TTC</td>
      <td style="padding:12px;text-align:right;font-weight:700;font-size:18px;color:#fff;">${fmt(ttc)}</td>
    </tr>` : ''}
  </table>`;
}

function customerBlock(data: QuotePdfData, borderColor: string): string {
  return `<table style="width:100%;border-collapse:collapse;font-size:12px;">
    ${[
      ['Nom', data.customer_name],
      ['Email', data.customer_email],
      ['Téléphone', data.customer_phone],
      ...(data.customer_address ? [['Adresse', data.customer_address]] : []),
    ].map(([lbl, val]) => `
    <tr style="border-bottom:1px solid ${borderColor};">
      <td style="padding:6px 8px;color:#6b7280;width:110px;">${lbl}</td>
      <td style="padding:6px 8px;font-weight:500;">${val}</td>
    </tr>`).join('')}
  </table>`;
}

function companyBlock(co: CompanyInfo, borderColor: string): string {
  return `<table style="width:100%;border-collapse:collapse;font-size:12px;">
    ${[
      ['Société', co.company_name],
      ['Email', co.company_email],
      ['Téléphone', co.company_phone],
      ['Adresse', co.company_address],
    ].filter(([, v]) => v).map(([lbl, val]) => `
    <tr style="border-bottom:1px solid ${borderColor};">
      <td style="padding:6px 8px;color:#6b7280;width:110px;">${lbl}</td>
      <td style="padding:6px 8px;font-weight:500;">${val}</td>
    </tr>`).join('')}
  </table>`;
}

function validityBlock(data: QuotePdfData, settings: PdfDisplaySettings, accentColor: string): string {
  const days = settings.pdf_validity_days || '30';
  const validUntil = data.valid_until ? fmtDate(data.valid_until) : `${days} jours à compter de la date d'émission`;
  return `<div style="background:#fff7ed;border:1px solid #fdba74;border-radius:6px;padding:10px 14px;font-size:12px;color:#9a3412;display:inline-block;">
    ⏱ Devis valable : ${validUntil}
  </div>`;
}

function termsBlock(terms: string, bankDetails: string, showBank: boolean): string {
  let html = '';
  if (terms) {
    html += `<div style="font-size:11px;color:#6b7280;margin-bottom:8px;"><strong style="color:#374151;">Conditions générales :</strong> ${terms}</div>`;
  }
  if (showBank && bankDetails) {
    html += `<div style="font-size:11px;color:#6b7280;white-space:pre-line;"><strong style="color:#374151;">Coordonnées bancaires :</strong><br>${bankDetails}</div>`;
  }
  return html;
}

function sectionTitle(title: string, primaryColor: string): string {
  return `<div style="font-size:14px;font-weight:700;color:${primaryColor};padding-bottom:8px;border-bottom:2px solid ${primaryColor};margin-bottom:12px;">${title}</div>`;
}

// ─────────────────────────────────────────────
// TEMPLATE 1 – ÉLÉGANT (Navy + Orange)
// ─────────────────────────────────────────────
export function template1(data: QuotePdfData, settings: PdfDisplaySettings, company: CompanyInfo, logoBase64: string): string {
  const primary = settings.pdf_primary_color || '#1A365D';
  const accent = settings.pdf_accent_color || '#f97316';
  const font = getFont(settings);
  const showVat = settings.pdf_show_vat === 'true';
  const modelTitle = data.is_free_quote ? (data.quote_title || 'Devis') : (data.model_name || 'Devis');

  return `<div style="font-family:${font};width:794px;background:#fff;padding:0;color:#1f2937;">
    <!-- HEADER -->
    <div style="background:${primary};color:#fff;padding:32px 40px 24px;position:relative;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          ${settings.pdf_show_logo === 'true' && logoBase64 && settings.pdf_logo_position === 'left'
            ? `<img src="${logoBase64}" style="height:52px;max-width:160px;object-fit:contain;margin-bottom:10px;" alt="Logo" /><br/>` : ''}
          <div style="font-size:13px;font-weight:300;letter-spacing:1px;opacity:0.8;">${company.company_name}</div>
          <div style="font-size:10px;opacity:0.6;margin-top:2px;">${company.company_email} • ${company.company_phone}</div>
        </div>
        ${settings.pdf_show_logo === 'true' && logoBase64 && settings.pdf_logo_position === 'center'
          ? `<img src="${logoBase64}" style="height:56px;max-width:160px;object-fit:contain;" alt="Logo" />` : ''}
        <div style="text-align:right;">
          <div style="background:${accent};color:#fff;display:inline-block;font-size:11px;font-weight:700;letter-spacing:3px;padding:5px 14px;border-radius:4px;margin-bottom:8px;">DEVIS</div>
          <div style="font-size:22px;font-weight:700;margin-bottom:4px;">${modelTitle}</div>
          <div style="font-size:12px;opacity:0.8;">Réf : <strong>${data.reference_number}</strong></div>
          <div style="font-size:11px;opacity:0.6;">${fmtDate(data.created_at)}</div>
          ${settings.pdf_show_logo === 'true' && logoBase64 && settings.pdf_logo_position === 'right'
            ? `<div style="margin-top:10px;"><img src="${logoBase64}" style="height:44px;max-width:130px;object-fit:contain;" alt="Logo" /></div>` : ''}
        </div>
      </div>
    </div>
    <!-- BODY -->
    <div style="padding:32px 40px;">
      ${imagesBlock(data.photo_url, data.plan_url)}
      <!-- Info row -->
      <div style="display:flex;gap:24px;margin-bottom:28px;">
        <div style="flex:1;background:#f8fafc;border-radius:8px;padding:18px;">
          ${sectionTitle('Client', primary)}
          ${customerBlock(data, '#e5e7eb')}
        </div>
        <div style="flex:1;background:#f8fafc;border-radius:8px;padding:18px;">
          ${sectionTitle('Sunbox Mauritius', primary)}
          ${companyBlock(company, '#e5e7eb')}
        </div>
      </div>
      <!-- Validity -->
      <div style="margin-bottom:24px;">${validityBlock(data, settings, accent)}</div>
      <!-- Lines / Options -->
      ${data.is_free_quote && data.categories?.length
        ? `<div style="margin-bottom:24px;">${sectionTitle('Descriptif', primary)}${linesTable(data.categories, accent)}</div>`
        : ''}
      ${!data.is_free_quote && data.options?.length
        ? `<div style="margin-bottom:24px;">${sectionTitle('Options sélectionnées', primary)}${optionsTable(data.options, accent)}</div>`
        : ''}
      <!-- Totals -->
      <div style="background:#f8fafc;border-radius:8px;padding:18px;margin-bottom:24px;">
        ${sectionTitle('Récapitulatif', primary)}
        ${totalsBlock(data, primary, accent, showVat)}
      </div>
      <!-- Terms -->
      ${settings.pdf_show_terms === 'true' ? `<div style="margin-bottom:12px;">${termsBlock(settings.pdf_terms, settings.pdf_bank_details, settings.pdf_show_bank_details === 'true')}</div>` : ''}
      <!-- Footer -->
      <div style="border-top:2px solid #e5e7eb;margin-top:16px;padding-top:14px;text-align:center;font-size:11px;color:#9ca3af;">${settings.pdf_footer_text}</div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// TEMPLATE 2 – MINIMALISTE (White + thin lines)
// ─────────────────────────────────────────────
export function template2(data: QuotePdfData, settings: PdfDisplaySettings, company: CompanyInfo, logoBase64: string): string {
  const primary = settings.pdf_primary_color || '#111827';
  const accent = settings.pdf_accent_color || '#f97316';
  const font = getFont(settings);
  const showVat = settings.pdf_show_vat === 'true';
  const modelTitle = data.is_free_quote ? (data.quote_title || 'Devis') : (data.model_name || 'Devis');

  return `<div style="font-family:${font};width:794px;background:#fff;padding:48px;color:#1f2937;">
    <!-- HEADER -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid #e5e7eb;">
      <div>
        ${settings.pdf_show_logo === 'true' && logoBase64 && settings.pdf_logo_position === 'left'
          ? `<img src="${logoBase64}" style="height:48px;max-width:150px;object-fit:contain;margin-bottom:10px;display:block;" alt="Logo" />` : ''}
        ${settings.pdf_show_logo === 'true' && logoBase64 && settings.pdf_logo_position === 'center'
          ? `<div style="text-align:center;margin-bottom:12px;"><img src="${logoBase64}" style="height:48px;max-width:150px;object-fit:contain;" alt="Logo" /></div>` : ''}
        <div style="font-size:13px;font-weight:600;color:#374151;">${company.company_name}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:3px;">${company.company_email}</div>
        <div style="font-size:11px;color:#9ca3af;">${company.company_phone}</div>
      </div>
      <div style="text-align:right;">
        ${settings.pdf_show_logo === 'true' && logoBase64 && settings.pdf_logo_position === 'right'
          ? `<img src="${logoBase64}" style="height:48px;max-width:150px;object-fit:contain;margin-bottom:10px;display:block;margin-left:auto;" alt="Logo" />` : ''}
        <div style="font-size:40px;font-weight:800;letter-spacing:-1px;color:${primary};line-height:1;">DEVIS</div>
        <div style="font-size:14px;font-weight:600;color:#374151;margin-top:4px;">${modelTitle}</div>
        <div style="font-size:12px;color:#9ca3af;margin-top:4px;">N° <span style="color:${accent};font-weight:700;">${data.reference_number}</span></div>
        <div style="font-size:11px;color:#9ca3af;">${fmtDate(data.created_at)}</div>
      </div>
    </div>
    ${imagesBlock(data.photo_url, data.plan_url)}
    <!-- Info row -->
    <div style="display:flex;gap:32px;margin-bottom:32px;">
      <div style="flex:1;padding-bottom:4px;border-bottom:2px solid ${primary};">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:#9ca3af;margin-bottom:10px;text-transform:uppercase;">Client</div>
        ${customerBlock(data, '#f3f4f6')}
      </div>
      <div style="flex:1;padding-bottom:4px;border-bottom:2px solid ${primary};">
        <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:#9ca3af;margin-bottom:10px;text-transform:uppercase;">Fournisseur</div>
        ${companyBlock(company, '#f3f4f6')}
      </div>
    </div>
    <div style="margin-bottom:24px;">${validityBlock(data, settings, accent)}</div>
    ${data.is_free_quote && data.categories?.length
      ? `<div style="margin-bottom:24px;"><div style="font-size:11px;font-weight:700;letter-spacing:1px;color:#9ca3af;margin-bottom:12px;text-transform:uppercase;">Descriptif</div>${linesTable(data.categories, accent)}</div>`
      : ''}
    ${!data.is_free_quote && data.options?.length
      ? `<div style="margin-bottom:24px;"><div style="font-size:11px;font-weight:700;letter-spacing:1px;color:#9ca3af;margin-bottom:12px;text-transform:uppercase;">Options</div>${optionsTable(data.options, accent)}</div>`
      : ''}
    <div style="border:1px solid #e5e7eb;border-radius:6px;padding:20px;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:#9ca3af;margin-bottom:12px;text-transform:uppercase;">Récapitulatif</div>
      ${totalsBlock(data, primary, accent, showVat)}
    </div>
    ${settings.pdf_show_terms === 'true' ? `<div style="margin-bottom:12px;">${termsBlock(settings.pdf_terms, settings.pdf_bank_details, settings.pdf_show_bank_details === 'true')}</div>` : ''}
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af;">${settings.pdf_footer_text}</div>
  </div>`;
}

// ─────────────────────────────────────────────
// TEMPLATE 3 – SOLAIRE (Orange header + warm)
// ─────────────────────────────────────────────
export function template3(data: QuotePdfData, settings: PdfDisplaySettings, company: CompanyInfo, logoBase64: string): string {
  const primary = settings.pdf_primary_color || '#ea580c';
  const accent = settings.pdf_accent_color || '#1A365D';
  const font = getFont(settings);
  const showVat = settings.pdf_show_vat === 'true';
  const modelTitle = data.is_free_quote ? (data.quote_title || 'Devis') : (data.model_name || 'Devis');

  return `<div style="font-family:${font};width:794px;background:#fff;color:#1f2937;">
    <!-- ORANGE HEADER -->
    <div style="background:linear-gradient(135deg,${primary},#fb923c);padding:36px 40px 28px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          ${settings.pdf_show_logo === 'true' && logoBase64 && settings.pdf_logo_position !== 'right'
            ? `<img src="${logoBase64}" style="height:50px;max-width:150px;object-fit:contain;margin-bottom:10px;display:block;" alt="Logo" />` : ''}
          <div style="color:#fff;font-size:22px;font-weight:800;line-height:1;">${modelTitle}</div>
          <div style="color:#ffedd5;font-size:12px;margin-top:4px;">${company.company_name} • ${company.company_email}</div>
        </div>
        <div style="text-align:right;">
          ${settings.pdf_show_logo === 'true' && logoBase64 && settings.pdf_logo_position === 'right'
            ? `<img src="${logoBase64}" style="height:50px;max-width:150px;object-fit:contain;margin-bottom:10px;display:block;margin-left:auto;" alt="Logo" />` : ''}
          <div style="background:rgba(255,255,255,0.2);border-radius:8px;padding:14px 18px;display:inline-block;text-align:right;">
            <div style="color:#fff;font-size:13px;font-weight:700;letter-spacing:2px;">DEVIS</div>
            <div style="color:#fff;font-size:18px;font-weight:800;margin-top:2px;">${data.reference_number}</div>
            <div style="color:#ffedd5;font-size:11px;margin-top:2px;">${fmtDate(data.created_at)}</div>
          </div>
        </div>
      </div>
      ${settings.pdf_show_logo === 'true' && logoBase64 && settings.pdf_logo_position === 'center'
        ? `<div style="text-align:center;margin-top:12px;"><img src="${logoBase64}" style="height:44px;max-width:140px;object-fit:contain;" alt="Logo" /></div>` : ''}
    </div>
    <!-- BODY -->
    <div style="padding:32px 40px;">
      ${imagesBlock(data.photo_url, data.plan_url)}
      <div style="display:flex;gap:20px;margin-bottom:28px;">
        <div style="flex:1;border:2px solid #fed7aa;border-radius:10px;padding:16px;">
          <div style="font-size:12px;font-weight:700;color:${primary};margin-bottom:10px;text-transform:uppercase;letter-spacing:1px;">Client</div>
          ${customerBlock(data, '#fed7aa')}
        </div>
        <div style="flex:1;border:2px solid #fed7aa;border-radius:10px;padding:16px;">
          <div style="font-size:12px;font-weight:700;color:${primary};margin-bottom:10px;text-transform:uppercase;letter-spacing:1px;">Sunbox Mauritius</div>
          ${companyBlock(company, '#fed7aa')}
        </div>
      </div>
      <div style="margin-bottom:24px;">${validityBlock(data, settings, primary)}</div>
      ${data.is_free_quote && data.categories?.length
        ? `<div style="margin-bottom:24px;"><div style="font-size:12px;font-weight:700;color:${primary};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Descriptif</div>${linesTable(data.categories, primary)}</div>`
        : ''}
      ${!data.is_free_quote && data.options?.length
        ? `<div style="margin-bottom:24px;"><div style="font-size:12px;font-weight:700;color:${primary};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Options</div>${optionsTable(data.options, primary)}</div>`
        : ''}
      <div style="background:#fff7ed;border-radius:10px;padding:20px;margin-bottom:24px;">
        <div style="font-size:12px;font-weight:700;color:${primary};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Récapitulatif</div>
        ${totalsBlock(data, accent, primary, showVat)}
      </div>
      ${settings.pdf_show_terms === 'true' ? `<div style="margin-bottom:12px;">${termsBlock(settings.pdf_terms, settings.pdf_bank_details, settings.pdf_show_bank_details === 'true')}</div>` : ''}
      <div style="border-top:2px solid #fed7aa;margin-top:16px;padding-top:14px;text-align:center;font-size:11px;color:#9a3412;">${settings.pdf_footer_text}</div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// TEMPLATE 4 – NUIT (Dark professional)
// ─────────────────────────────────────────────
export function template4(data: QuotePdfData, settings: PdfDisplaySettings, company: CompanyInfo, logoBase64: string): string {
  const primary = settings.pdf_primary_color || '#0f172a';
  const accent = settings.pdf_accent_color || '#f97316';
  const font = getFont(settings);
  const showVat = settings.pdf_show_vat === 'true';
  const modelTitle = data.is_free_quote ? (data.quote_title || 'Devis') : (data.model_name || 'Devis');

  return `<div style="font-family:${font};width:794px;background:#f8fafc;color:#1f2937;">
    <!-- DARK HEADER -->
    <div style="background:${primary};padding:0;">
      <div style="display:flex;align-items:stretch;">
        <div style="flex:1;padding:32px 40px;">
          ${settings.pdf_show_logo === 'true' && logoBase64 && (settings.pdf_logo_position === 'left' || settings.pdf_logo_position === 'center')
            ? `<img src="${logoBase64}" style="height:50px;max-width:150px;object-fit:contain;margin-bottom:12px;display:block;" alt="Logo" />` : ''}
          <div style="color:#f1f5f9;font-size:26px;font-weight:800;margin-bottom:4px;">${modelTitle}</div>
          <div style="color:#94a3b8;font-size:12px;">${company.company_name} • ${company.company_email}</div>
        </div>
        <div style="background:${accent};padding:32px 36px;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;min-width:200px;">
          ${settings.pdf_show_logo === 'true' && logoBase64 && settings.pdf_logo_position === 'right'
            ? `<img src="${logoBase64}" style="height:44px;max-width:130px;object-fit:contain;margin-bottom:12px;" alt="Logo" />` : ''}
          <div style="color:#fff;font-size:13px;font-weight:700;letter-spacing:3px;margin-bottom:8px;">DEVIS</div>
          <div style="color:#fff;font-size:20px;font-weight:800;">${data.reference_number}</div>
          <div style="color:rgba(255,255,255,0.8);font-size:11px;margin-top:4px;">${fmtDate(data.created_at)}</div>
        </div>
      </div>
    </div>
    <!-- BODY -->
    <div style="padding:32px 40px;">
      ${imagesBlock(data.photo_url, data.plan_url)}
      <div style="display:flex;gap:20px;margin-bottom:28px;">
        <div style="flex:1;background:#fff;border-radius:8px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <div style="font-size:11px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Client</div>
          ${customerBlock(data, '#f1f5f9')}
        </div>
        <div style="flex:1;background:#fff;border-radius:8px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <div style="font-size:11px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Sunbox Mauritius</div>
          ${companyBlock(company, '#f1f5f9')}
        </div>
      </div>
      <div style="margin-bottom:24px;">${validityBlock(data, settings, accent)}</div>
      ${data.is_free_quote && data.categories?.length
        ? `<div style="background:#fff;border-radius:8px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08);margin-bottom:24px;"><div style="font-size:11px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Descriptif</div>${linesTable(data.categories, accent)}</div>`
        : ''}
      ${!data.is_free_quote && data.options?.length
        ? `<div style="background:#fff;border-radius:8px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08);margin-bottom:24px;"><div style="font-size:11px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Options</div>${optionsTable(data.options, accent)}</div>`
        : ''}
      <div style="background:#fff;border-radius:8px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.08);margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Récapitulatif</div>
        ${totalsBlock(data, primary, accent, showVat)}
      </div>
      ${settings.pdf_show_terms === 'true' ? `<div style="margin-bottom:12px;">${termsBlock(settings.pdf_terms, settings.pdf_bank_details, settings.pdf_show_bank_details === 'true')}</div>` : ''}
      <div style="border-top:2px solid #e2e8f0;margin-top:16px;padding-top:14px;text-align:center;font-size:11px;color:#94a3b8;">${settings.pdf_footer_text}</div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// TEMPLATE 5 – MODERNE (Two-column sidebar)
// ─────────────────────────────────────────────
export function template5(data: QuotePdfData, settings: PdfDisplaySettings, company: CompanyInfo, logoBase64: string): string {
  const primary = settings.pdf_primary_color || '#1A365D';
  const accent = settings.pdf_accent_color || '#f97316';
  const font = getFont(settings);
  const showVat = settings.pdf_show_vat === 'true';
  const modelTitle = data.is_free_quote ? (data.quote_title || 'Devis') : (data.model_name || 'Devis');
  const vat = Number(data.total_price) * (data.vat_rate / 100);
  const ttc = Number(data.total_price) + vat;

  return `<div style="font-family:${font};width:794px;background:#fff;display:flex;color:#1f2937;">
    <!-- LEFT SIDEBAR -->
    <div style="width:240px;min-width:240px;background:${primary};padding:32px 24px;color:#fff;display:flex;flex-direction:column;gap:20px;">
      ${settings.pdf_show_logo === 'true' && logoBase64
        ? `<div style="text-align:${settings.pdf_logo_position === 'right' ? 'right' : settings.pdf_logo_position === 'center' ? 'center' : 'left'};margin-bottom:4px;">
             <img src="${logoBase64}" style="height:48px;max-width:130px;object-fit:contain;" alt="Logo" />
           </div>` : ''}
      <div>
        <div style="font-size:9px;font-weight:700;letter-spacing:2px;opacity:0.6;text-transform:uppercase;margin-bottom:6px;">Devis</div>
        <div style="font-size:14px;font-weight:800;line-height:1.2;">${modelTitle}</div>
        <div style="font-size:12px;opacity:0.7;margin-top:4px;">${data.reference_number}</div>
        <div style="font-size:10px;opacity:0.5;margin-top:2px;">${fmtDate(data.created_at)}</div>
      </div>
      <!-- Client -->
      <div>
        <div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${accent};margin-bottom:8px;">Client</div>
        <div style="font-size:12px;font-weight:600;">${data.customer_name}</div>
        <div style="font-size:10px;opacity:0.7;margin-top:3px;">${data.customer_email}</div>
        <div style="font-size:10px;opacity:0.7;">${data.customer_phone}</div>
        ${data.customer_address ? `<div style="font-size:10px;opacity:0.6;margin-top:2px;">${data.customer_address}</div>` : ''}
      </div>
      <!-- Company -->
      <div>
        <div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${accent};margin-bottom:8px;">Fournisseur</div>
        <div style="font-size:12px;font-weight:600;">${company.company_name}</div>
        <div style="font-size:10px;opacity:0.7;margin-top:3px;">${company.company_email}</div>
        <div style="font-size:10px;opacity:0.7;">${company.company_phone}</div>
      </div>
      <!-- Mini totals -->
      <div style="margin-top:auto;border-top:1px solid rgba(255,255,255,0.2);padding-top:16px;">
        <div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${accent};margin-bottom:8px;">Montants</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;"><span style="opacity:0.7;">Base HT</span><span style="font-weight:600;">${fmt(Number(data.base_price))}</span></div>
        ${Number(data.options_total) > 0 ? `<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;"><span style="opacity:0.7;">Options HT</span><span style="font-weight:600;">${fmt(Number(data.options_total))}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-top:8px;border-top:1px solid rgba(255,255,255,0.2);padding-top:8px;"><span>Total HT</span><span style="color:${accent};">${fmt(Number(data.total_price))}</span></div>
        ${showVat ? `<div style="display:flex;justify-content:space-between;font-size:11px;margin-top:4px;opacity:0.7;"><span>TVA ${data.vat_rate}%</span><span>${fmt(vat)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:800;margin-top:8px;background:${accent};margin-left:-24px;margin-right:-24px;padding:10px 24px;"><span>TTC</span><span>${fmt(ttc)}</span></div>` : ''}
      </div>
    </div>
    <!-- RIGHT CONTENT -->
    <div style="flex:1;padding:32px 32px;overflow:hidden;">
      <div style="margin-bottom:8px;"><span style="background:${accent};color:#fff;font-size:10px;font-weight:700;letter-spacing:2px;padding:3px 10px;border-radius:3px;">DEVIS</span></div>
      ${imagesBlock(data.photo_url, data.plan_url)}
      <div style="background:#fff7ed;border-radius:6px;padding:10px 14px;font-size:11px;color:#9a3412;margin-bottom:20px;">
        ⏱ ${data.valid_until ? `Valable jusqu'au ${fmtDate(data.valid_until)}` : `Valable ${settings.pdf_validity_days || 30} jours`}
      </div>
      ${data.is_free_quote && data.categories?.length
        ? `<div style="margin-bottom:20px;"><div style="font-size:11px;font-weight:700;color:${primary};text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;border-bottom:2px solid ${primary};padding-bottom:6px;">Descriptif</div>${linesTable(data.categories, accent)}</div>`
        : ''}
      ${!data.is_free_quote && data.options?.length
        ? `<div style="margin-bottom:20px;"><div style="font-size:11px;font-weight:700;color:${primary};text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;border-bottom:2px solid ${primary};padding-bottom:6px;">Options</div>${optionsTable(data.options, accent)}</div>`
        : ''}
      ${settings.pdf_show_terms === 'true' ? `<div style="margin-bottom:12px;">${termsBlock(settings.pdf_terms, settings.pdf_bank_details, settings.pdf_show_bank_details === 'true')}</div>` : ''}
      <div style="border-top:1px solid #e5e7eb;margin-top:16px;padding-top:10px;font-size:10px;color:#9ca3af;">${settings.pdf_footer_text}</div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// TEMPLATE 6 – AQUA (Teal / Blue-green)
// ─────────────────────────────────────────────
export function template6(data: QuotePdfData, settings: PdfDisplaySettings, company: CompanyInfo, logoBase64: string): string {
  const primary = settings.pdf_primary_color || '#0d9488';
  const accent = settings.pdf_accent_color || '#f97316';
  const font = getFont(settings);
  const showVat = settings.pdf_show_vat === 'true';
  const modelTitle = data.is_free_quote ? (data.quote_title || 'Devis') : (data.model_name || 'Devis');

  return `<div style="font-family:${font};width:794px;background:#fff;color:#1f2937;">
    <!-- TEAL HEADER -->
    <div style="background:linear-gradient(120deg,${primary},#14b8a6);padding:32px 40px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          ${settings.pdf_show_logo === 'true' && logoBase64 && settings.pdf_logo_position !== 'right'
            ? `<img src="${logoBase64}" style="height:50px;max-width:150px;object-fit:contain;margin-bottom:10px;display:block;" alt="Logo" />` : ''}
          <div style="color:#fff;font-size:24px;font-weight:800;">${modelTitle}</div>
          <div style="color:rgba(255,255,255,0.75);font-size:11px;margin-top:3px;">${company.company_name} • ${company.company_address}</div>
        </div>
        <div style="text-align:right;">
          ${settings.pdf_show_logo === 'true' && logoBase64 && settings.pdf_logo_position === 'right'
            ? `<img src="${logoBase64}" style="height:50px;max-width:150px;object-fit:contain;margin-bottom:10px;display:block;margin-left:auto;" alt="Logo" />` : ''}
          <div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:12px 16px;display:inline-block;">
            <div style="color:#fff;font-size:12px;font-weight:700;letter-spacing:2px;margin-bottom:6px;">DEVIS</div>
            <div style="color:#fff;font-size:17px;font-weight:800;">${data.reference_number}</div>
            <div style="color:rgba(255,255,255,0.7);font-size:10px;margin-top:3px;">${fmtDate(data.created_at)}</div>
          </div>
        </div>
      </div>
      ${settings.pdf_show_logo === 'true' && logoBase64 && settings.pdf_logo_position === 'center'
        ? `<div style="text-align:center;margin-top:14px;"><img src="${logoBase64}" style="height:44px;max-width:140px;object-fit:contain;" alt="Logo" /></div>` : ''}
    </div>
    <!-- TEAL ACCENT BAR -->
    <div style="background:${accent};height:4px;"></div>
    <!-- BODY -->
    <div style="padding:32px 40px;">
      ${imagesBlock(data.photo_url, data.plan_url)}
      <div style="display:flex;gap:20px;margin-bottom:28px;">
        <div style="flex:1;border:2px solid #99f6e4;border-radius:10px;padding:16px;">
          <div style="font-size:11px;font-weight:700;color:${primary};text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Client</div>
          ${customerBlock(data, '#99f6e4')}
        </div>
        <div style="flex:1;border:2px solid #99f6e4;border-radius:10px;padding:16px;">
          <div style="font-size:11px;font-weight:700;color:${primary};text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Sunbox Mauritius</div>
          ${companyBlock(company, '#99f6e4')}
        </div>
      </div>
      <div style="margin-bottom:24px;">${validityBlock(data, settings, primary)}</div>
      ${data.is_free_quote && data.categories?.length
        ? `<div style="margin-bottom:24px;"><div style="font-size:11px;font-weight:700;color:${primary};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;border-bottom:2px solid ${primary};padding-bottom:6px;">Descriptif</div>${linesTable(data.categories, primary)}</div>`
        : ''}
      ${!data.is_free_quote && data.options?.length
        ? `<div style="margin-bottom:24px;"><div style="font-size:11px;font-weight:700;color:${primary};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;border-bottom:2px solid ${primary};padding-bottom:6px;">Options</div>${optionsTable(data.options, primary)}</div>`
        : ''}
      <div style="background:#f0fdfa;border:2px solid #99f6e4;border-radius:10px;padding:20px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;color:${primary};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Récapitulatif</div>
        ${totalsBlock(data, primary, accent, showVat)}
      </div>
      ${settings.pdf_show_terms === 'true' ? `<div style="margin-bottom:12px;">${termsBlock(settings.pdf_terms, settings.pdf_bank_details, settings.pdf_show_bank_details === 'true')}</div>` : ''}
      <div style="border-top:2px solid #99f6e4;margin-top:16px;padding-top:14px;text-align:center;font-size:11px;color:#0f766e;">${settings.pdf_footer_text}</div>
    </div>
  </div>`;
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
  '1': 'En-tête marine sombre, corps blanc, accents orange',
  '2': 'Tout blanc, bordures fines, typographie épurée',
  '3': 'En-tête dégradé orange, chaleureux et lumineux',
  '4': 'En-tête ardoise sombre, style luxe professionnel',
  '5': 'Barre latérale colorée, mise en page bicolonne',
  '6': 'En-tête sarcelle/vert, fraîcheur contemporaine',
};

export function getTemplate(templateId: string) {
  return TEMPLATES[templateId] || TEMPLATES['1'];
}
