import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

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
      // update_quote_status already deducts 1 000 Rs internally — no separate deductProCredits call
      await api.updateQuoteStatus(quote.id, 'approved');
      toast({ title: 'Succès', description: 'Devis validé. 1 000 Rs déduits.' });
      loadQuotes();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const handleBOQRequest = async (quote: Quote) => {
    if (!confirm(`Demander le BOQ pour le devis ${quote.reference_number} ? (1 500 Rs seront déduits)`)) return;
    try {
      await api.deductProCredits(1500, 'boq_requested', quote.id);
      toast({ title: 'Succès', description: 'Demande BOQ enregistrée. Crédits déduits.' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
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
                        {isPending && (
                          <Button size="sm" variant="outline" onClick={() => handleValidate(q)}>
                            Valider (1 000 Rs)
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!isApproved}
                          title={!isApproved ? 'Validez le devis avant de demander le BOQ' : ''}
                          onClick={() => handleBOQRequest(q)}
                        >
                          BOQ (1 500 Rs)
                        </Button>
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
                {selectedQuote.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => { handleValidate(selectedQuote); setSelectedQuote(null); }}
                  >
                    Valider (1 000 Rs)
                  </Button>
                )}
                {selectedQuote.status === 'approved' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { handleBOQRequest(selectedQuote); setSelectedQuote(null); }}
                  >
                    BOQ (1 500 Rs)
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
