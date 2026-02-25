import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Quote {
  id: number;
  reference_number: string;
  customer_name: string;
  total_price: number;
  status: string;
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
      await api.deductProCredits(1000, 'quote_validated', quote.id);
      await api.updateQuoteStatus(quote.id, 'approved');
      toast({ title: 'Succès', description: 'Devis validé et crédits déduits.' });
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
        <Button
          className="bg-orange-500 hover:bg-orange-600"
          onClick={async () => {
            if (!confirm('Créer un nouveau devis ? (500 Rs seront déduits)')) return;
            try {
              await api.deductProCredits(500, 'quote_created');
              toast({ title: 'Crédits déduits', description: '500 Rs déduits. Vous pouvez maintenant créer votre devis.' });
            } catch (err: any) {
              toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
            }
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Devis (500 Rs)
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : !quotes.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun devis pour le moment.</p>
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
                return (
                  <tr key={q.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm font-medium">{q.reference_number}</td>
                    <td className="px-4 py-3 text-sm">{q.customer_name}</td>
                    <td className="px-4 py-3 text-sm font-medium">Rs {q.total_price?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(q.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleValidate(q)}>
                          Valider (1 000 Rs)
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleBOQRequest(q)}>
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
    </div>
  );
}
