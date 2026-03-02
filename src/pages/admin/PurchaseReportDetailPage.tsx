import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Printer, CheckCircle, Package, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useSiteSettings } from '@/hooks/use-settings';

interface ReportItem {
  id: number;
  category_name: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;       // HT (legacy)
  total_price: number;      // HT (legacy)
  unit_price_ht: number;
  unit_price_ttc: number;
  total_price_ht: number;
  total_price_ttc: number;
  is_ordered: boolean;
  is_option: boolean;
  display_order: number;
}

interface SupplierGroup {
  supplier_name: string;
  items: ReportItem[];
  subtotal: number;         // HT (legacy)
  subtotal_ht: number;
  subtotal_ttc: number;
}

interface PurchaseReport {
  id: number;
  quote_id: number;
  quote_reference: string;
  model_name: string;
  customer_name: string;
  status: 'in_progress' | 'completed';
  total_amount: number;        // HT (legacy)
  total_amount_ht: number;
  total_amount_ttc: number;
  created_at: string;
  // price summary fields
  vat_rate?: number;
  quote_base_price_ht?: number;
  quote_options_ht?: number;
  quote_total_ht?: number;
  quote_base_price_ttc?: number;
  quote_options_ttc?: number;
  quote_total_ttc?: number;
  // grouped items
  base_groups: SupplierGroup[];
  option_groups: SupplierGroup[];
}

const numFmt = new Intl.NumberFormat('fr-MU', { style: 'decimal', minimumFractionDigits: 0 });
const fmt = (p: number) => numFmt.format(Math.round(p)) + ' Rs';

/** Build a standalone print HTML document and open it in a new window. */
function openPrintWindow(report: PurchaseReport, logoUrl: string, companyName: string) {
  const pdfPages = [
    ...report.base_groups.map(g => ({ ...g, section: 'Base' as const })),
    ...report.option_groups.map(g => ({ ...g, section: 'Options' as const })),
  ];
  const totalPages = pdfPages.length;
  const vatRate = report.vat_rate ?? 15;

  const pageHtml = pdfPages.map((group, idx) => {
    const sectionLabel = group.section === 'Options' ? 'Achats Options' : 'Achats de Base';
    const sectionColor = group.section === 'Options' ? '#7c3aed' : '#1d4ed8';
    const sectionBg    = group.section === 'Options' ? '#ede9fe'  : '#dbeafe';
    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${companyName}" style="height:36px;width:auto;object-fit:contain;">`
      : `<span style="font-size:13px;font-weight:700;color:#ea580c;">${companyName}</span>`;

    const rows = group.items.map(item => {
      const totalHT  = item.total_price_ht  ?? item.total_price;
      const totalTTC = item.total_price_ttc ?? item.total_price;
      const unitHT   = item.unit_price_ht   ?? item.unit_price;
      return `
        <tr style="background:${item.is_ordered ? '#f0fdf4' : 'white'}">
          <td style="border:1px solid #e5e7eb;padding:3px 6px;text-align:center;">${item.is_ordered ? '☑' : '☐'}</td>
          <td style="border:1px solid #e5e7eb;padding:3px 6px;color:#4b5563;">${item.category_name}</td>
          <td style="border:1px solid #e5e7eb;padding:3px 6px;${item.is_ordered ? 'text-decoration:line-through;color:#9ca3af;' : ''}">${item.description}</td>
          <td style="border:1px solid #e5e7eb;padding:3px 6px;text-align:right;">${item.quantity}</td>
          <td style="border:1px solid #e5e7eb;padding:3px 6px;color:#6b7280;">${item.unit}</td>
          <td style="border:1px solid #e5e7eb;padding:3px 6px;text-align:right;">${fmt(unitHT)}</td>
          <td style="border:1px solid #e5e7eb;padding:3px 6px;text-align:right;">${fmt(totalHT)}</td>
          <td style="border:1px solid #e5e7eb;padding:3px 6px;text-align:right;font-weight:600;color:#ea580c;">${fmt(totalTTC)}</td>
        </tr>`;
    }).join('');

    const subtotalHT  = group.subtotal_ht  ?? group.subtotal;
    const subtotalTTC = group.subtotal_ttc ?? group.subtotal;

    return `
      <div class="pdf-page${idx === 0 ? ' first-page' : ''}">
        <div style="border-bottom:2px solid #f97316;padding-bottom:8px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <div style="min-width:80px;">${logoHtml}</div>
            <h1 style="font-size:18px;font-weight:bold;text-align:center;color:#ea580c;flex:1;margin:0 12px;">Rapport d'Achats</h1>
            <span style="font-size:11px;color:#6b7280;white-space:nowrap;min-width:60px;text-align:right;">Page ${idx + 1}/${totalPages}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#374151;">
            <span><strong>Client :</strong> ${report.customer_name}</span>
            <span><strong>Modèle :</strong> ${report.model_name}</span>
            <span><strong>Réf. :</strong> ${report.quote_reference}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;background:${sectionBg};color:${sectionColor};text-transform:uppercase;letter-spacing:0.05em;">${sectionLabel}</span>
          <h2 style="font-size:14px;font-weight:700;color:#1f2937;margin:0;">🏢 ${group.supplier_name}</h2>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="border:1px solid #e5e7eb;padding:4px 6px;text-align:left;">□</th>
              <th style="border:1px solid #e5e7eb;padding:4px 6px;text-align:left;">Catégorie</th>
              <th style="border:1px solid #e5e7eb;padding:4px 6px;text-align:left;">Description</th>
              <th style="border:1px solid #e5e7eb;padding:4px 6px;text-align:right;">Qté</th>
              <th style="border:1px solid #e5e7eb;padding:4px 6px;text-align:left;">Unité</th>
              <th style="border:1px solid #e5e7eb;padding:4px 6px;text-align:right;">P.U. HT</th>
              <th style="border:1px solid #e5e7eb;padding:4px 6px;text-align:right;">Total HT</th>
              <th style="border:1px solid #e5e7eb;padding:4px 6px;text-align:right;">Total TTC</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="background:#fff7ed;">
              <td colspan="6" style="border:1px solid #e5e7eb;padding:4px 6px;text-align:right;font-weight:700;">Sous-total ${group.supplier_name}</td>
              <td style="border:1px solid #e5e7eb;padding:4px 6px;text-align:right;font-weight:700;">${fmt(subtotalHT)} HT</td>
              <td style="border:1px solid #e5e7eb;padding:4px 6px;text-align:right;font-weight:700;color:#ea580c;">${fmt(subtotalTTC)} TTC</td>
            </tr>
          </tfoot>
        </table>
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Rapport d'Achats — ${report.quote_reference}</title>
<style>
  * { box-sizing: border-box; font-family: Arial, sans-serif; }
  body { margin: 0; padding: 0; }
  .pdf-page { padding: 18mm 15mm; min-height: 297mm; }
  .pdf-page:not(.first-page) { page-break-before: always; }
  @media print {
    .pdf-page { padding: 18mm 15mm; }
    .pdf-page:not(.first-page) { page-break-before: always; }
  }
</style>
</head>
<body>${pageHtml}</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) { alert('Veuillez autoriser les pop-ups pour imprimer le PDF.'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Wait for images (logo) to load before printing
  w.onload = () => { w.focus(); w.print(); };
  // Fallback if onload already fired
  setTimeout(() => { try { w.focus(); w.print(); } catch (_) {} }, 800);
}

// Render a list of supplier groups as table rows
function SupplierGroupsTable({
  groups,
  onToggle,
}: {
  groups: SupplierGroup[];
  onToggle: (id: number) => void;
}) {
  if (!groups.length) return null;
  return (
    <div className="space-y-4">
      {groups.map(group => (
        <Card key={group.supplier_name}>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-800">
                🏢 {group.supplier_name}
              </CardTitle>
              <div className="text-right">
                <span className="text-sm font-bold text-orange-600">
                  Sous-total TTC : {fmt(group.subtotal_ttc ?? group.subtotal)}
                </span>
                <span className="text-xs text-gray-400 ml-2">
                  (HT : {fmt(group.subtotal_ht ?? group.subtotal)})
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500 w-10 no-print">✓</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Catégorie</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Description</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Qté</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Unité</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">P.U. HT</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Total HT</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Total TTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {group.items.map(item => (
                    <tr key={item.id}
                      className={item.is_ordered ? 'bg-green-50' : 'hover:bg-gray-50'}>
                      <td className="px-3 py-1.5 no-print">
                        <Checkbox
                          checked={item.is_ordered}
                          onCheckedChange={() => onToggle(item.id)}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-xs text-gray-600">{item.category_name}</td>
                      <td className="px-3 py-1.5 text-xs font-medium">
                        {item.is_ordered
                          ? <span className="line-through text-gray-400">{item.description}</span>
                          : item.description}
                      </td>
                      <td className="px-3 py-1.5 text-xs text-right">{item.quantity}</td>
                      <td className="px-3 py-1.5 text-xs text-gray-500">{item.unit}</td>
                      <td className="px-3 py-1.5 text-xs text-right">{fmt(item.unit_price_ht ?? item.unit_price)}</td>
                      <td className="px-3 py-1.5 text-xs text-right">{fmt(item.total_price_ht ?? item.total_price)}</td>
                      <td className="px-3 py-1.5 text-xs text-right font-medium text-orange-700">{fmt(item.total_price_ttc ?? item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PurchaseReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { toast } = useToast();
  const { data: siteSettings } = useSiteSettings();

  const isProSite = typeof window !== 'undefined' && !!(window as any).__PRO_SITE__;
  const logoUrl = isProSite
    ? ((window as any).__PRO_LOGO_URL__ || '')
    : (siteSettings?.pdf_logo || siteSettings?.site_logo || '');
  const companyName = isProSite
    ? ((window as any).__PRO_COMPANY_NAME__ || '')
    : 'Sunbox';

  const isAdmin  = location.pathname.startsWith('/admin');
  const backPath = isAdmin ? '/admin/reports' : '/pro/reports';

  const [report,   setReport]   = useState<PurchaseReport | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => { if (id) loadReport(parseInt(id)); }, [id]);

  const loadReport = async (reportId: number) => {
    setLoading(true);
    try {
      const data = await api.getPurchaseReport(reportId);
      setReport(data);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = async (itemId: number) => {
    try {
      await api.toggleReportItem(itemId);
      setReport(prev => {
        if (!prev) return prev;
        const toggleIn = (groups: SupplierGroup[]) =>
          groups.map(g => ({
            ...g,
            items: g.items.map(item =>
              item.id === itemId ? { ...item, is_ordered: !item.is_ordered } : item
            ),
          }));
        return { ...prev, base_groups: toggleIn(prev.base_groups), option_groups: toggleIn(prev.option_groups) };
      });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const markCompleted = async () => {
    if (!report || !confirm('Marquer ce rapport comme terminé ?')) return;
    setUpdating(true);
    try {
      await api.updateReportStatus(report.id, 'completed');
      setReport(prev => prev ? { ...prev, status: 'completed' } : prev);
      toast({ title: 'Succès', description: 'Rapport marqué comme terminé.' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const deleteReport = async () => {
    const msg = "Supprimer ce rapport d'achat ? Cette action est irréversible.\nVous pourrez le régénérer depuis la page du devis.";
    if (!report || !confirm(msg)) return;
    setUpdating(true);
    try {
      await api.deleteReport(report.id);
      toast({ title: 'Rapport supprimé', description: 'Vous pouvez maintenant le régénérer depuis le devis.' });
      navigate(backPath);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">Rapport introuvable</p>
        <Button variant="link" onClick={() => navigate(backPath)}>Retour</Button>
      </div>
    );
  }

  const allBaseItems    = report.base_groups.flatMap(g => g.items);
  const allOptionItems  = report.option_groups.flatMap(g => g.items);
  const allItems        = [...allBaseItems, ...allOptionItems];
  const orderedItems    = allItems.filter(i => i.is_ordered);
  const orderedAmountTTC   = orderedItems.reduce((s, i) => s + (i.total_price_ttc ?? i.total_price), 0);
  const remainingAmountTTC = allItems.filter(i => !i.is_ordered).reduce((s, i) => s + (i.total_price_ttc ?? i.total_price), 0);
  const totalAmountTTC  = report.total_amount_ttc ?? report.total_amount;
  const totalAmountHT   = report.total_amount_ht  ?? report.total_amount;
  const totalCount      = allItems.length;
  const orderedCount    = orderedItems.length;
  const vatRate         = report.vat_rate ?? 15;
  const hasOptionGroups = report.option_groups.length > 0;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between no-print">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate(backPath)}>
              <ArrowLeft className="h-4 w-4 mr-2" />Rapports d'Achat
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rapport d'Achats</h1>
              <p className="text-sm text-gray-500 font-mono">{report.quote_reference}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => loadReport(report.id)}>
              <RefreshCw className="h-4 w-4 mr-2" />Actualiser
            </Button>
            <Button variant="outline" size="sm" onClick={() => openPrintWindow(report, logoUrl, companyName)}>
              <Printer className="h-4 w-4 mr-2" />Imprimer / PDF
            </Button>
            {report.status === 'in_progress' && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700"
                onClick={markCompleted} disabled={updating}>
                <CheckCircle className="h-4 w-4 mr-2" />Marquer Terminé
              </Button>
            )}
            <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={deleteReport} disabled={updating}>
              <Trash2 className="h-4 w-4 mr-2" />Supprimer
            </Button>
          </div>
        </div>

        <div id="purchase-report-print">
          {/* On-screen centered title */}
          <h2 className="text-center text-xl font-bold text-gray-800 mb-4">Rapport d'Achats</h2>
          {/* Meta card */}
          <Card className="mb-4">
            <CardContent className="p-4 space-y-4">
              {/* Quote identity */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Devis</p>
                  <p className="font-mono font-medium">{report.quote_reference}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Modèle</p>
                  <p className="font-medium">{report.model_name}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Client</p>
                  <p className="font-medium">{report.customer_name}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Statut</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={report.status === 'completed'
                      ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                      {report.status === 'completed' ? 'Terminé' : 'En cours'}
                    </Badge>
                    <span className="text-xs text-gray-400">{orderedCount}/{totalCount} commandé(s)</span>
                  </div>
                </div>
              </div>

              {/* Price summary */}
              {(report.quote_total_ht != null && report.quote_total_ht > 0) && (
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Résumé du Devis</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-500">Prix de Base HT</p>
                      <p className="font-semibold">{fmt(report.quote_base_price_ht ?? 0)}</p>
                      <p className="text-xs text-gray-400">TTC: {fmt(report.quote_base_price_ttc ?? 0)}</p>
                    </div>
                    {(report.quote_options_ht ?? 0) > 0 && (
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-500">Options HT</p>
                        <p className="font-semibold">{fmt(report.quote_options_ht ?? 0)}</p>
                        <p className="text-xs text-gray-400">TTC: {fmt(report.quote_options_ttc ?? 0)}</p>
                      </div>
                    )}
                    <div className="bg-orange-50 rounded p-2 border border-orange-200">
                      <p className="text-xs text-gray-500">Total Vente HT</p>
                      <p className="font-bold text-orange-700">{fmt(report.quote_total_ht ?? 0)}</p>
                      <p className="text-xs text-gray-500">TTC ({vatRate}%): <span className="font-bold text-orange-600">{fmt(report.quote_total_ttc ?? 0)}</span></p>
                    </div>
                    <div className="bg-blue-50 rounded p-2 border border-blue-200">
                      <p className="text-xs text-gray-500">Coût Achats HT</p>
                      <p className="font-bold text-blue-700">{fmt(totalAmountHT)}</p>
                      <p className="text-xs text-gray-500">TTC ({vatRate}%): <span className="font-bold text-blue-600">{fmt(totalAmountTTC)}</span></p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ordered / Remaining summary */}
          {totalCount > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-3 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500">Commandé ({orderedCount} articles)</p>
                    <p className="text-lg font-bold text-green-700">{fmt(orderedAmountTTC)} TTC</p>
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-500 opacity-60" />
                </CardContent>
              </Card>
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-3 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500">À commander ({totalCount - orderedCount} articles)</p>
                    <p className="text-lg font-bold text-amber-700">{fmt(remainingAmountTTC)} TTC</p>
                  </div>
                  <Package className="h-6 w-6 text-amber-500 opacity-60" />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Base items */}
          {report.base_groups.length === 0 && report.option_groups.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-400">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Aucun article. Le modèle n'a peut-être pas de BOQ défini.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {report.base_groups.length > 0 && (
                <div>
                  <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
                    Achats de Base
                  </h2>
                  <SupplierGroupsTable groups={report.base_groups} onToggle={toggleItem} />
                  {/* Base subtotal */}
                  {(() => {
                    const ht  = report.base_groups.reduce((s, g) => s + (g.subtotal_ht  ?? g.subtotal), 0);
                    const ttc = report.base_groups.reduce((s, g) => s + (g.subtotal_ttc ?? g.subtotal), 0);
                    return (
                      <div className="flex justify-end items-center gap-6 mt-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                        <span className="text-gray-500">Sous-total Achats de Base :</span>
                        <span className="text-gray-700">HT&nbsp;<span className="font-semibold">{fmt(ht)}</span></span>
                        <span className="text-blue-700 font-bold">TTC&nbsp;{fmt(ttc)}</span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {hasOptionGroups && (
                <div>
                  <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-purple-500" />
                    Achats Options
                  </h2>
                  <SupplierGroupsTable groups={report.option_groups} onToggle={toggleItem} />
                  {/* Options subtotal */}
                  {(() => {
                    const ht  = report.option_groups.reduce((s, g) => s + (g.subtotal_ht  ?? g.subtotal), 0);
                    const ttc = report.option_groups.reduce((s, g) => s + (g.subtotal_ttc ?? g.subtotal), 0);
                    return (
                      <div className="flex justify-end items-center gap-6 mt-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm">
                        <span className="text-gray-500">Sous-total Achats Options :</span>
                        <span className="text-gray-700">HT&nbsp;<span className="font-semibold">{fmt(ht)}</span></span>
                        <span className="text-purple-700 font-bold">TTC&nbsp;{fmt(ttc)}</span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Grand total */}
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-800">TOTAL ACHATS TTC</span>
                    <span className="text-2xl font-bold text-orange-600">{fmt(totalAmountTTC)}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">HT : {fmt(totalAmountHT)}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
