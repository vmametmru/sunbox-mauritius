import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FileText, X, ClipboardList, Download, Eye, Loader2, Pencil, Trash2, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { downloadQuotePdf } from '@/components/QuotePdfGenerator';
import type { QuotePdfData, PdfDisplaySettings, CompanyInfo } from '@/components/QuotePdfTemplates';
import AdminConfigureModal from '@/components/AdminConfigureModal';

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
  pool_shape?: string | null;
  pool_longueur?: number | null;
  pool_largeur?: number | null;
  pool_profondeur?: number | null;
  pool_longueur_la?: number | null;
  pool_largeur_la?: number | null;
  pool_profondeur_la?: number | null;
  pool_longueur_lb?: number | null;
  pool_largeur_lb?: number | null;
  pool_profondeur_lb?: number | null;
  pool_longueur_ta?: number | null;
  pool_largeur_ta?: number | null;
  pool_profondeur_ta?: number | null;
  pool_longueur_tb?: number | null;
  pool_largeur_tb?: number | null;
  pool_profondeur_tb?: number | null;
  photo_url?: string | null;
  plan_url?: string | null;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:   { label: 'En attente', variant: 'secondary' },
  approved:  { label: 'Approuvé',   variant: 'default' },
  rejected:  { label: 'Rejeté',     variant: 'destructive' },
  completed: { label: 'Complété',   variant: 'default' },
};

type TypeFilter = 'all' | 'pool' | 'container';

export default function ProQuotesPage() {
  const [quotes, setQuotes]         = useState<Quote[]>([]);
  const [loading, setLoading]       = useState(true);
  const [vatRate, setVatRate]       = useState(15);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const [selectedQuote, setSelectedQuote]   = useState<Quote | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);
  const [deletingId, setDeletingId]           = useState<number | null>(null);

  // Edit via AdminConfigureModal
  const [configuringQuoteId, setConfiguringQuoteId] = useState<number | null>(null);

  // BOQ confirmation dialog
  const [boqConfirmQuote, setBoqConfirmQuote] = useState<Quote | null>(null);
  const [boqLoading, setBoqLoading]           = useState(false);

  const { toast } = useToast();
  const navigate  = useNavigate();

  useEffect(() => {
    loadQuotes();
    api.query('get_settings', { group: 'general' })
      .then((s: any) => { if (s?.vat_rate) setVatRate(Number(s.vat_rate) || 15); })
      .catch(() => {});
  }, []);

  const toTtc = (ht: number) => Math.round(ht * (1 + vatRate / 100));

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

  const filteredQuotes = typeFilter === 'all'
    ? quotes
    : quotes.filter((q) => q.model_type === typeFilter);

  const openQuoteDetail = async (q: Quote) => {
    setSelectedQuote(q);
    if (!q.photo_url && !q.plan_url) {
      setLoadingDetails(true);
      try {
        const full = await api.getQuoteWithDetails(q.id);
        setSelectedQuote((prev) =>
          prev?.id === q.id
            ? { ...prev, photo_url: full.photo_base64 || full.photo_url || null, plan_url: full.plan_base64 || full.plan_url || null }
            : prev
        );
      } catch (err) { console.debug('Failed to load photo/plan details:', err); } finally {
        setLoadingDetails(false);
      }
    }
  };

  const handleValidate = async (quote: Quote) => {
    if (!confirm(`Valider le devis ${quote.reference_number} ? (1 000 Rs seront déduits)`)) return;
    try {
      await api.updateQuoteStatus(quote.id, 'approved');
      toast({ title: 'Devis validé', description: '1 000 Rs déduits.' });
      loadQuotes();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (quote: Quote) => {
    if (!confirm(`Supprimer définitivement le devis ${quote.reference_number} ?\nLe rapport d'achat associé sera également supprimé.`)) return;
    setDeletingId(quote.id);
    try {
      await api.deleteQuote(quote.id);
      toast({ title: 'Devis supprimé' });
      if (selectedQuote?.id === quote.id) setSelectedQuote(null);
      loadQuotes();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const confirmBoqReport = async () => {
    if (!boqConfirmQuote) return;
    setBoqLoading(true);
    try {
      const result = await api.requestBoqReport(boqConfirmQuote.id);
      toast({ title: 'Rapport créé', description: '1 500 Rs déduits.' });
      setBoqConfirmQuote(null);
      navigate(`/pro/reports/${result.report_id}`);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setBoqLoading(false);
    }
  };

  const handleDownloadPdf = async (quote: Quote) => {
    setGeneratingPdfId(quote.id);
    try {
      const [pdfContext, fullQuote] = await Promise.all([
        api.query('get_pdf_context').catch(() => ({} as any)),
        api.getQuoteWithDetails(quote.id),
      ]);
      const pdfSettingsRaw     = pdfContext?.pdf_settings     || {};
      const companySettingsRaw = pdfContext?.company_settings || {};
      const logoBase64: string = pdfContext?.logo_base64      || '';
      const pdfSettings: PdfDisplaySettings = {
        pdf_primary_color:      pdfSettingsRaw?.pdf_primary_color      || '#1A365D',
        pdf_accent_color:       pdfSettingsRaw?.pdf_accent_color       || '#f97316',
        pdf_footer_text:        pdfSettingsRaw?.pdf_footer_text        || '',
        pdf_terms:              pdfSettingsRaw?.pdf_terms              || '',
        pdf_bank_details:       pdfSettingsRaw?.pdf_bank_details       || '',
        pdf_validity_days:      pdfSettingsRaw?.pdf_validity_days      || '30',
        pdf_show_logo:          pdfSettingsRaw?.pdf_show_logo          || 'true',
        pdf_show_vat:           pdfSettingsRaw?.pdf_show_vat           || 'true',
        pdf_show_bank_details:  pdfSettingsRaw?.pdf_show_bank_details  || 'false',
        pdf_show_terms:         pdfSettingsRaw?.pdf_show_terms         || 'true',
        pdf_template:           pdfSettingsRaw?.pdf_template           || '1',
        pdf_font:               pdfSettingsRaw?.pdf_font               || 'inter',
        pdf_logo_position:      pdfSettingsRaw?.pdf_logo_position      || 'left',
        pdf_logo_offset_left:   pdfSettingsRaw?.pdf_logo_offset_left   || '0',
        pdf_logo_offset_right:  pdfSettingsRaw?.pdf_logo_offset_right  || '0',
        pdf_logo_offset_top:    pdfSettingsRaw?.pdf_logo_offset_top    || '0',
        pdf_logo_offset_bottom: pdfSettingsRaw?.pdf_logo_offset_bottom || '0',
      };
      const company: CompanyInfo = {
        company_name:    companySettingsRaw?.company_name    || '',
        company_email:   companySettingsRaw?.company_email   || '',
        company_phone:   companySettingsRaw?.company_phone   || '',
        company_address: companySettingsRaw?.company_address || '',
      };
      const pdfVatRate = Number(pdfSettingsRaw?.vat_rate) || 15;
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
        photo_url:        fullQuote.photo_base64 || fullQuote.photo_url,
        plan_url:         fullQuote.plan_base64  || fullQuote.plan_url,
        pool_shape:           fullQuote.pool_shape,
        pool_longueur:        fullQuote.pool_longueur    != null ? Number(fullQuote.pool_longueur)    : null,
        pool_largeur:         fullQuote.pool_largeur     != null ? Number(fullQuote.pool_largeur)     : null,
        pool_profondeur:      fullQuote.pool_profondeur  != null ? Number(fullQuote.pool_profondeur)  : null,
        pool_longueur_la:     fullQuote.pool_longueur_la != null ? Number(fullQuote.pool_longueur_la) : null,
        pool_largeur_la:      fullQuote.pool_largeur_la  != null ? Number(fullQuote.pool_largeur_la)  : null,
        pool_profondeur_la:   fullQuote.pool_profondeur_la != null ? Number(fullQuote.pool_profondeur_la) : null,
        pool_longueur_lb:     fullQuote.pool_longueur_lb != null ? Number(fullQuote.pool_longueur_lb) : null,
        pool_largeur_lb:      fullQuote.pool_largeur_lb  != null ? Number(fullQuote.pool_largeur_lb)  : null,
        pool_profondeur_lb:   fullQuote.pool_profondeur_lb != null ? Number(fullQuote.pool_profondeur_lb) : null,
        pool_longueur_ta:     fullQuote.pool_longueur_ta != null ? Number(fullQuote.pool_longueur_ta) : null,
        pool_largeur_ta:      fullQuote.pool_largeur_ta  != null ? Number(fullQuote.pool_largeur_ta)  : null,
        pool_profondeur_ta:   fullQuote.pool_profondeur_ta != null ? Number(fullQuote.pool_profondeur_ta) : null,
        pool_longueur_tb:     fullQuote.pool_longueur_tb != null ? Number(fullQuote.pool_longueur_tb) : null,
        pool_largeur_tb:      fullQuote.pool_largeur_tb  != null ? Number(fullQuote.pool_largeur_tb)  : null,
        pool_profondeur_tb:   fullQuote.pool_profondeur_tb != null ? Number(fullQuote.pool_profondeur_tb) : null,
        base_price:      Number(fullQuote.base_price),
        options_total:   Number(fullQuote.options_total),
        total_price:     Number(fullQuote.total_price),
        vat_rate:        pdfVatRate,
        notes:           fullQuote.notes,
        options:         fullQuote.options,
        base_categories: fullQuote.base_categories,
        is_free_quote:   false,
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mes Devis</h1>
        <p className="text-sm text-gray-500 mt-1">{quotes.length} devis au total</p>
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-600">Filtrer :</span>
        {(['all', 'pool', 'container'] as TypeFilter[]).map((f) => (
          <Button key={f} size="sm" variant={typeFilter === f ? 'default' : 'outline'} onClick={() => setTypeFilter(f)}>
            {f === 'all' ? 'Tous' : f === 'pool' ? 'Piscine' : 'Conteneur'}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : !filteredQuotes.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500">
              {quotes.length === 0 ? 'Aucun devis pour le moment.' : 'Aucun devis pour ce filtre.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow-sm">
          <table className="w-full bg-white text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Référence</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Client</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Modèle</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Total TTC</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Statut</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map((q) => {
                const status     = statusLabels[q.status] ?? { label: q.status, variant: 'outline' as const };
                const isApproved = q.status === 'approved';
                const isPending  = q.status === 'pending';
                return (
                  <tr key={q.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-orange-600">
                      <button className="hover:underline focus:outline-none" onClick={() => openQuoteDetail(q)}>
                        {q.reference_number}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{q.customer_name}</td>
                    <td className="px-4 py-3 text-gray-600">{q.model_name || '\u2014'}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      Rs {toTtc(q.total_price ?? 0).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(q.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Voir le détail" onClick={() => openQuoteDetail(q)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Modifier (configurateur)" onClick={() => setConfiguringQuoteId(q.id)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Télécharger PDF"
                          disabled={generatingPdfId === q.id} onClick={() => handleDownloadPdf(q)}>
                          {generatingPdfId === q.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Supprimer" disabled={deletingId === q.id} onClick={() => handleDelete(q)}>
                          {deletingId === q.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                        {isPending && (
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => handleValidate(q)}>
                            Valider (1 000 Rs)
                          </Button>
                        )}
                        {isApproved && (
                          Number(q.boq_requested)
                            ? <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-green-700 border-green-300"
                                onClick={() => q.purchase_report_id && navigate(`/pro/reports/${q.purchase_report_id}`)}>
                                <ClipboardList className="h-3 w-3 mr-1" />Voir rapport
                              </Button>
                            : <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                                onClick={() => setBoqConfirmQuote(q)}>
                                <ClipboardList className="h-3 w-3 mr-1" />Créer Rapport d'Achat
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

      {/* ── Detail modal */}
      <Dialog open={!!selectedQuote} onOpenChange={(open) => { if (!open) setSelectedQuote(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">{selectedQuote?.reference_number}</DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-500">Client</p>
                  <p className="font-medium text-gray-800">{selectedQuote.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Statut</p>
                  <Badge variant={(statusLabels[selectedQuote.status] ?? { variant: 'outline' }).variant}>
                    {(statusLabels[selectedQuote.status] ?? { label: selectedQuote.status }).label}
                  </Badge>
                </div>
                {selectedQuote.customer_email && (
                  <div><p className="text-xs text-gray-500">Email</p><p className="text-gray-700">{selectedQuote.customer_email}</p></div>
                )}
                {selectedQuote.customer_phone && (
                  <div><p className="text-xs text-gray-500">Téléphone</p><p className="text-gray-700">{selectedQuote.customer_phone}</p></div>
                )}
                {selectedQuote.customer_address && (
                  <div className="col-span-2"><p className="text-xs text-gray-500">Adresse</p><p className="text-gray-700">{selectedQuote.customer_address}</p></div>
                )}
                {selectedQuote.model_name && (
                  <div><p className="text-xs text-gray-500">Modèle</p><p className="text-gray-700">{selectedQuote.model_name}</p></div>
                )}
                {selectedQuote.model_type && (
                  <div><p className="text-xs text-gray-500">Type</p><p className="text-gray-700">{selectedQuote.model_type === 'pool' ? 'Piscine' : 'Conteneur'}</p></div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Prix de base</p>
                  <p className="text-gray-700">Rs {selectedQuote.base_price?.toLocaleString('fr-FR') ?? '—'}</p>
                </div>
                {!!selectedQuote.options_total && selectedQuote.options_total > 0 && (
                  <div><p className="text-xs text-gray-500">Options</p><p className="text-gray-700">Rs {selectedQuote.options_total.toLocaleString('fr-FR')}</p></div>
                )}
                <div className="col-span-2 border-t pt-2">
                  <p className="text-xs text-gray-500">Total TTC</p>
                  <p className="text-lg font-bold text-orange-600">Rs {toTtc(selectedQuote.total_price ?? 0).toLocaleString('fr-FR')}</p>
                </div>
                {selectedQuote.valid_until && (
                  <div>
                    <p className="text-xs text-gray-500">Valide jusqu'au</p>
                    <p className="text-gray-700">{new Date(selectedQuote.valid_until).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Créé le</p>
                  <p className="text-gray-700">{new Date(selectedQuote.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>

              {selectedQuote.customer_message && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Message du client</p>
                  <p className="bg-gray-50 rounded p-2 text-sm text-gray-700">{selectedQuote.customer_message}</p>
                </div>
              )}

              {selectedQuote.model_type === 'pool' && selectedQuote.pool_longueur != null && (
                <div className="border-t pt-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Dimensions de la piscine</p>
                  <div className="grid grid-cols-3 gap-1 bg-gray-50 rounded p-2 text-xs">
                    {selectedQuote.pool_shape && (
                      <div className="col-span-3 text-gray-600 mb-1">Forme : <span className="font-medium">{selectedQuote.pool_shape}</span></div>
                    )}
                    {selectedQuote.pool_longueur != null && <div><span className="text-gray-400">L</span> {Number(selectedQuote.pool_longueur).toFixed(2)} m</div>}
                    {selectedQuote.pool_largeur  != null && <div><span className="text-gray-400">l</span> {Number(selectedQuote.pool_largeur).toFixed(2)} m</div>}
                    {selectedQuote.pool_profondeur != null && <div><span className="text-gray-400">P</span> {Number(selectedQuote.pool_profondeur).toFixed(2)} m</div>}
                  </div>
                </div>
              )}

              {/* Photos / plan — explicit 4:3 (160×120 px) */}
              {(selectedQuote.photo_url || selectedQuote.plan_url) && (
                <div className="border-t pt-2">
                  <p className="text-xs font-medium text-gray-500 mb-2">Photos du modèle</p>
                  <div className="flex gap-3">
                    {selectedQuote.photo_url && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Photo</p>
                        <div className="w-[160px] h-[120px] bg-gray-50 rounded border overflow-hidden flex items-center justify-center">
                          <img src={selectedQuote.photo_url} alt="Photo" className="max-w-full max-h-full object-contain" />
                        </div>
                      </div>
                    )}
                    {selectedQuote.plan_url && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Plan</p>
                        <div className="w-[160px] h-[120px] bg-gray-50 rounded border overflow-hidden flex items-center justify-center">
                          <img src={selectedQuote.plan_url} alt="Plan" className="max-w-full max-h-full object-contain" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {loadingDetails && !selectedQuote.photo_url && !selectedQuote.plan_url && (
                <div className="flex items-center gap-2 text-xs text-gray-400 border-t pt-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Chargement des photos…
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 flex-wrap border-t">
                <Button size="sm" variant="outline" disabled={generatingPdfId === selectedQuote.id}
                  onClick={() => handleDownloadPdf(selectedQuote!)}>
                  {generatingPdfId === selectedQuote.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                  PDF
                </Button>
                <Button size="sm" variant="outline"
                  onClick={() => { const id = selectedQuote!.id; setSelectedQuote(null); setConfiguringQuoteId(id); }}>
                  <Pencil className="h-4 w-4 mr-1" />Modifier
                </Button>
                {selectedQuote.status === 'pending' && (
                  <Button size="sm" onClick={() => { handleValidate(selectedQuote!); setSelectedQuote(null); }}>
                    Valider (1 000 Rs)
                  </Button>
                )}
                {selectedQuote.status === 'approved' && (
                  Number(selectedQuote.boq_requested)
                    ? <Button size="sm" variant="outline" className="text-green-700 border-green-300"
                        onClick={() => { selectedQuote.purchase_report_id && navigate(`/pro/reports/${selectedQuote.purchase_report_id}`); setSelectedQuote(null); }}>
                        <ClipboardList className="h-3 w-3 mr-1" />Voir le rapport
                      </Button>
                    : <Button size="sm" variant="outline"
                        onClick={() => { const q = selectedQuote!; setSelectedQuote(null); setBoqConfirmQuote(q); }}>
                        <ClipboardList className="h-3 w-3 mr-1" />Créer Rapport d'Achat
                      </Button>
                )}
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  disabled={deletingId === selectedQuote.id}
                  onClick={() => { const q = selectedQuote!; setSelectedQuote(null); handleDelete(q); }}>
                  <Trash2 className="h-4 w-4 mr-1" />Supprimer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedQuote(null)}>
                  <X className="h-4 w-4 mr-1" />Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit via AdminConfigureModal */}
      <AdminConfigureModal
        open={configuringQuoteId !== null}
        onClose={() => setConfiguringQuoteId(null)}
        quoteId={configuringQuoteId ?? undefined}
        onSaved={() => { setConfiguringQuoteId(null); loadQuotes(); }}
      />

      {/* ── BOQ Confirmation dialog */}
      <Dialog open={!!boqConfirmQuote} onOpenChange={(open) => { if (!open && !boqLoading) setBoqConfirmQuote(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Créer Rapport d'Achat</DialogTitle>
            <DialogDescription>
              Vous allez générer un Rapport d'Achat pour le devis{" "}
              <strong>{boqConfirmQuote?.reference_number}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-orange-50 border border-orange-200 p-4 text-center">
            <p className="text-sm text-gray-600">Coût en crédits</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">1 500 Rs</p>
            <p className="text-xs text-gray-500 mt-1">seront déduits de votre solde</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setBoqConfirmQuote(null)} disabled={boqLoading}>
              Annuler
            </Button>
            <Button onClick={confirmBoqReport} disabled={boqLoading}>
              {boqLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer (1 500 Rs)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
