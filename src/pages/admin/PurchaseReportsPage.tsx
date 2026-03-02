import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ReportSummary {
  id: number;
  quote_reference: string;
  model_name: string;
  customer_name: string;
  status: 'in_progress' | 'completed';
  total_amount: number;
  created_at: string;
}

const fmt = (p: number) =>
  new Intl.NumberFormat('fr-MU', { style: 'decimal', minimumFractionDigits: 0 }).format(p) + ' Rs';

export default function PurchaseReportsPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast }  = useToast();
  const navigate   = useNavigate();
  const location   = useLocation();

  const isAdmin    = location.pathname.startsWith('/admin');
  const detailBase = isAdmin ? '/admin/reports' : '/pro/reports';

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await api.getPurchaseReports();
      setReports(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rapports d'Achat</h1>
          <p className="text-gray-500 mt-1">{reports.length} rapport(s) au total</p>
        </div>
        <Button variant="outline" onClick={loadReports}>
          <RefreshCw className="h-4 w-4 mr-2" />Actualiser
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {isAdmin
                ? "Aucun rapport d'achat. Ouvrez un devis approuvé et cliquez sur «\u00a0Rapport d'Achat\u00a0»."
                : "Aucun rapport d'achat. Validez un devis puis cliquez sur «\u00a0Rapport d'Achat (1\u00a0500\u00a0Rs)\u00a0»."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Devis</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Modèle</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Client</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Total</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Statut</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`${detailBase}/${r.id}`)}>
                  <td className="px-4 py-3 font-mono text-sm font-medium text-orange-600">
                    {r.quote_reference}
                  </td>
                  <td className="px-4 py-3 text-sm">{r.model_name}</td>
                  <td className="px-4 py-3 text-sm">{r.customer_name}</td>
                  <td className="px-4 py-3 text-sm font-medium">{fmt(r.total_amount)}</td>
                  <td className="px-4 py-3">
                    <Badge className={r.status === 'completed'
                      ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                      {r.status === 'completed' ? 'Terminé' : 'En cours'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(r.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline"
                      onClick={e => { e.stopPropagation(); navigate(`${detailBase}/${r.id}`); }}>
                      Ouvrir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
