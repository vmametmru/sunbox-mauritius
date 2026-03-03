import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, X, ClipboardList, Download, Eye, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { downloadQuotePdf, imageUrlToBase64 } from '@/components/QuotePdfGenerator';
import type { QuotePdfData, PdfDisplaySettings, CompanyInfo } from '@/components/QuotePdfTemplates';

interface Quote {
  id: number;
  reference_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_message?: string;
  model_name?: string;
  model_type?: string;
  base_price?: number;
  options_total?: number;
  total_price: number;
  status: string;
  valid_until?: string;
  created_at: string;
  boq_requested?: number | boolean;
  purchase_report_id?: number | null;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'secondary' },
  approved: { label: 'Approuvé', variant: 'default' },
  rejected: { label: 'Rejeté', variant: 'destructive' },
  completed: { label: 'Complété', variant: 'default' },
};

export default function ProQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const data = await api.getQuotes();
      setQuotes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (quote: Quote) => {
    if (!confirm(`Valider et envoyer le devis ${quote.reference_number} par email ? (1 000 Rs seront déduits)`)) return;
    try {
      await api.updateQuoteStatus(quote.id, 'approved');
      toast({ title: 'Succès', description: 'Devis validé. 1 000 Rs déduits.' });
      loadQuotes();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const handleBoqReport = async (quote: Quote) => {
    // If report already exists, navigate directly to it
    if (Number(quote.boq_requested)) {
      if (quote.purchase_report_id) {
        navigate(`/pro/reports/${quote.purchase_report_id}`);
      } else {
        toast({ title: 'Info', description: 'Rapport déjà demandé.' });
      }
      return;
    }
    if (!confirm(`Générer le Rapport d'Achat pour le devis ${quote.reference_number} ? (1 500 Rs seront déduits)`)) return;
    try {
      const result = await api.requestBoqReport(quote.id);
      toast({ title: 'Succès', description: "Rapport d'Achat généré. 1 500 Rs déduits." });
      navigate(`/pro/reports/${result.report_id}`);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const handleDownloadPdf = async (quote: Quote) => {
    setGeneratingPdfId(quote.id);
    try {
      const [pdfSettingsRaw, companySettingsRaw, siteSettingsRaw, fullQuote] = await Promise.all([
        api.getSettings('pdf').catch(() => ({})),
        api.getSettings('company').catch(() => ({})),
        api.getSettings('site').catch(() => ({})),
        api.getQuoteWithDetails(quote.id),
      ]);

      const pdfSettings: PdfDisplaySettings = {
        pdf_primary_color:     pdfSettingsRaw?.pdf_primary_color     || '#1A365D',
        pdf_accent_color:      pdfSettingsRaw?.pdf_accent_color      || '#f97316',
        pdf_footer_text:       pdfSettingsRaw?.pdf_footer_text       || '',
        pdf_terms:             pdfSettingsRaw?.pdf_terms             || '',
        pdf_bank_details:      pdfSettingsRaw?.pdf_bank_details      || '',
        pdf_validity_days:     pdfSettingsRaw?.pdf_validity_days     || '30',
        pdf_show_logo:         pdfSettingsRaw?.pdf_show_logo         || 'true',
        pdf_show_vat:          pdfSettingsRaw?.pdf_show_vat          || 'true',
        pdf_show_bank_details: pdfSettingsRaw?.pdf_show_bank_details || 'false',
        pdf_show_terms:        pdfSettingsRaw?.pdf_show_terms        || 'true',
        pdf_template:          pdfSettingsRaw?.pdf_template          || '1',
        pdf_font:              pdfSettingsRaw?.pdf_font              || 'inter',
        pdf_logo_position:     pdfSettingsRaw?.pdf_logo_position     || 'left',
        pdf_logo_offset_left:  pdfSettingsRaw?.pdf_logo_offset_left  || '0',
        pdf_logo_offset_right: pdfSettingsRaw?.pdf_logo_offset_right || '0',
        pdf_logo_offset_top:   pdfSettingsRaw?.pdf_logo_offset_top   || '0',
        pdf_logo_offset_bottom:pdfSettingsRaw?.pdf_logo_offset_bottom|| '0',
      };

      const company: CompanyInfo = {
        company_name:    companySettingsRaw?.company_name    || '',
        company_email:   companySettingsRaw?.company_email   || '',
        company_phone:   companySettingsRaw?.company_phone   || '',
        company_address: companySettingsRaw?.company_address || '',
      };

      const logoUrl: string = siteSettingsRaw?.site_logo || '';
      const logoBase64 = logoUrl ? await imageUrlToBase64(logoUrl) : '';
      const vatRate = Number(pdfSettingsRaw?.vat_rate) || 15;

      const data: QuotePdfData = {
        id:               fullQuote.id,
        reference_number: fullQuote.reference_number,
        created_at:       fullQuote.created_at,
        valid_until:      fullQuote.valid_until,
        status:           fullQuote.status,
        customer_name:    fullQuote.customer_name  || fullQuote.contact_name  || '',
        customer_email:   fullQuote.customer_email || fullQuote.contact_email || '',
        customer_phone:   fullQuote.customer_phone || fullQuote.contact_phone || '',
        customer_address: fullQuote.customer_address || '',
        model_name:       fullQuote.model_name,
        model_type:       fullQuote.model_type,
        photo_url:        fullQuote.photo_url,
        plan_url:         fullQuote.plan_url,
        pool_shape:       fullQuote.pool_shape,
        pool_longueur:    fullQuote.pool_longueur    != null ? Number(fullQuote.pool_longueur)    : null,
        pool_largeur:     fullQuote.pool_largeur     != null ? Number(fullQuote.pool_largeur)     : null,
        pool_profondeur:  fullQuote.pool_profondeur  != null ? Number(fullQuote.pool_profondeur)  : null,
        pool_longueur_la: fullQuote.pool_longueur_la != null ? Number(fullQuote.pool_longueur_la) : null,
        pool_largeur_la:  fullQuote.pool_largeur_la  != null ? Number(fullQuote.pool_largeur_la)  : null,
        pool_profondeur_la: fullQuote.pool_profondeur_la != null ? Number(fullQuote.pool_profondeur_la) : null,
        pool_longueur_lb: fullQuote.pool_longueur_lb != null ? Number(fullQuote.pool_longueur_lb) : null,
        pool_largeur_lb:  fullQuote.pool_largeur_lb  != null ? Number(fullQuote.pool_largeur_lb)  : null,
        pool_profondeur_lb: fullQuote.pool_profondeur_lb != null ? Number(fullQuote.pool_profondeur_lb) : null,
        pool_longueur_ta: fullQuote.pool_longueur_ta != null ? Number(fullQuote.pool_longueur_ta) : null,
        pool_largeur_ta:  fullQuote.pool_largeur_ta  != null ? Number(fullQuote.pool_largeur_ta)  : null,
        pool_profondeur_ta: fullQuote.pool_profondeur_ta != null ? Number(fullQuote.pool_profondeur_ta) : null,
        pool_longueur_tb: fullQuote.pool_longueur_tb != null ? Number(fullQuote.pool_longueur_tb) : null,
        pool_largeur_tb:  fullQuote.pool_largeur_tb  != null ? Number(fullQuote.pool_largeur_tb)  : null,
        pool_profondeur_tb: fullQuote.pool_profondeur_tb != null ? Number(fullQuote.pool_profondeur_tb) : null,
        base_price:       Number(fullQuote.base_price),
        options_total:    Number(fullQuote.options_total),
        total_price:      Number(fullQuote.total_price),
        vat_rate:         vatRate,
        notes:            fullQuote.notes,
        options:          fullQuote.options,
        base_categories:  fullQuote.base_categories,
        is_free_quote:    false,
      };

      await downloadQuotePdf({ data, settings: pdfSettings, company, logoBase64 });
      toast({ title: 'PDF téléchargé', description: `Devis-${quote.reference_number}.pdf` });
    } catch (err: any) {
      toast({ title: 'Erreur PDF', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingPdfId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes Devis</h1>
          <p className="text-gray-500 mt-1">{quotes.length} devis au total</p>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : !quotes.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun devis pour le moment. Configurez un modèle depuis la page Modèles.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Référence</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Client</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Total</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Statut</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => {
                const status = statusLabels[q.status] ?? { label: q.status, variant: 'outline' as const };
                const isApproved = q.status === 'approved';
                const isPending  = q.status === 'pending';
                return (
                  <tr key={q.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm font-medium">
                      <button
                        className="text-orange-600 hover:underline focus:outline-none"
                        onClick={() => setSelectedQuote(q)}
                      >
                        {q.reference_number}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm">{q.customer_name}</td>
                    <td className="px-4 py-3 text-sm font-medium">Rs {q.total_price?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(q.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                       <div className="flex gap-2 flex-wrap">
                         <Button size="sm" variant="ghost" onClick={() => setSelectedQuote(q)} title="Visualiser le devis">
                           <Eye className="h-3 w-3 mr-1" />Voir
                         </Button>
                         <Button size="sm" variant="ghost" disabled={generatingPdfId === q.id} onClick={() => handleDownloadPdf(q)} title="Télécharger PDF">
                           {generatingPdfId === q.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}PDF
                         </Button>
                         {isPending && (
                           <Button size="sm" variant="outline" onClick={() => handleValidate(q)}>
                             Valider (1 000 Rs)
                           </Button>
                         )}
                         {isApproved && (
                           Number(q.boq_requested)
                             ? <Button size="sm" variant="outline" className="text-green-700 border-green-300"
                                 onClick={() => q.purchase_report_id && navigate(`/pro/reports/${q.purchase_report_id}`)}>
                                 <ClipboardList className="h-3 w-3 mr-1" />Voir le rapport
                               </Button>
                             : <Button size="sm" variant="outline" onClick={() => handleBoqReport(q)}>
                                 <ClipboardList className="h-3 w-3 mr-1" />Rapport d'Achat (1 500 Rs)
                               </Button>
                         )}
                       </div>
                     </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Quote detail modal */}
      <Dialog open={!!selectedQuote} onOpenChange={(open) => { if (!open) setSelectedQuote(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">{selectedQuote?.reference_number}</DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-gray-500 text-xs">Client</p>
                  <p className="font-medium">{selectedQuote.customer_name}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Statut</p>
                  <Badge variant={(statusLabels[selectedQuote.status] ?? { variant: 'outline' }).variant}>
                    {(statusLabels[selectedQuote.status] ?? { label: selectedQuote.status }).label}
                  </Badge>
                </div>
                {selectedQuote.customer_email && (
                  <div>
                    <p className="text-gray-500 text-xs">Email</p>
                    <p>{selectedQuote.customer_email}</p>
                  </div>
                )}
                {selectedQuote.customer_phone && (
                  <div>
                    <p className="text-gray-500 text-xs">Téléphone</p>
                    <p>{selectedQuote.customer_phone}</p>
                  </div>
                )}
                {selectedQuote.customer_address && (
                  <div className="col-span-2">
                    <p className="text-gray-500 text-xs">Adresse</p>
                    <p>{selectedQuote.customer_address}</p>
                  </div>
                )}
                {selectedQuote.model_name && (
                  <div>
                    <p className="text-gray-500 text-xs">Modèle</p>
                    <p>{selectedQuote.model_name}</p>
                  </div>
                )}
                {selectedQuote.model_type && (
                  <div>
                    <p className="text-gray-500 text-xs">Type</p>
                    <p className="capitalize">{selectedQuote.model_type}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500 text-xs">Prix de base</p>
                  <p>Rs {selectedQuote.base_price?.toLocaleString() ?? '—'}</p>
                </div>
                {selectedQuote.options_total != null && selectedQuote.options_total > 0 && (
                  <div>
                    <p className="text-gray-500 text-xs">Options</p>
                    <p>Rs {selectedQuote.options_total.toLocaleString()}</p>
                  </div>
                )}
                <div className="col-span-2 border-t pt-2">
                  <p className="text-gray-500 text-xs">Total TTC</p>
                  <p className="text-lg font-bold text-orange-600">Rs {selectedQuote.total_price?.toLocaleString()}</p>
                </div>
                {selectedQuote.valid_until && (
                  <div>
                    <p className="text-gray-500 text-xs">Valide jusqu'au</p>
                    <p>{new Date(selectedQuote.valid_until).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500 text-xs">Créé le</p>
                  <p>{new Date(selectedQuote.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              {selectedQuote.customer_message && (
                <div>
                  <p className="text-gray-500 text-xs mb-1">Message du client</p>
                  <p className="bg-gray-50 rounded p-2 text-gray-700">{selectedQuote.customer_message}</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                 <Button
                   size="sm"
                   variant="outline"
                   disabled={generatingPdfId === selectedQuote.id}
                   onClick={() => { const q = selectedQuote!; handleDownloadPdf(q); }}
                 >
                   {generatingPdfId === selectedQuote.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                   Télécharger PDF
                 </Button>
                 {selectedQuote.status === 'pending' && (
                   <Button
                     size="sm"
                     onClick={() => { handleValidate(selectedQuote); setSelectedQuote(null); }}
                   >
                     Valider (1 000 Rs)
                   </Button>
                 )}
                 {selectedQuote.status === 'approved' && (
                   Number(selectedQuote.boq_requested)
                     ? <Button size="sm" variant="outline" className="text-green-700 border-green-300"
                         onClick={() => { selectedQuote.purchase_report_id && navigate(`/pro/reports/${selectedQuote.purchase_report_id}`); setSelectedQuote(null); }}>
                         <ClipboardList className="h-3 w-3 mr-1" />Voir le rapport
                       </Button>
                     : <Button size="sm" variant="outline"
                         onClick={() => { const q = selectedQuote; setSelectedQuote(null); handleBoqReport(q); }}>
                         <ClipboardList className="h-3 w-3 mr-1" />Rapport d'Achat (1 500 Rs)
                       </Button>
                 )}
                 <Button size="sm" variant="ghost" onClick={() => setSelectedQuote(null)}>
                   <X className="h-4 w-4 mr-1" /> Fermer
                 </Button>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
