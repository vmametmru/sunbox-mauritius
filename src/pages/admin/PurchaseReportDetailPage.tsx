import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Printer, CheckCircle, Package, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ReportItem {
  id: number;
  category_name: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  is_ordered: boolean;
  display_order: number;
}

interface SupplierGroup {
  supplier_name: string;
  items: ReportItem[];
  subtotal: number;
}

interface PurchaseReport {
  id: number;
  quote_id: number;
  quote_reference: string;
  model_name: string;
  customer_name: string;
  status: 'in_progress' | 'completed';
  total_amount: number;
  created_at: string;
  groups: SupplierGroup[];
}

const fmt = (p: number) =>
  new Intl.NumberFormat('fr-MU', { style: 'decimal', minimumFractionDigits: 0 }).format(p) + ' Rs';

export default function PurchaseReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { toast } = useToast();

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
        return {
          ...prev,
          groups: prev.groups.map(g => ({
            ...g,
            items: g.items.map(item =>
              item.id === itemId ? { ...item, is_ordered: !item.is_ordered } : item
            ),
          })),
        };
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

  const allItems     = report.groups.flatMap(g => g.items);
  const orderedCount = allItems.filter(i => i.is_ordered).length;
  const totalCount   = allItems.length;

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #purchase-report-print, #purchase-report-print * { visibility: visible; }
          #purchase-report-print { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between no-print">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate(backPath)}>
              <ArrowLeft className="h-4 w-4 mr-2" />Rapports d'Achat
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rapport d'Achat</h1>
              <p className="text-sm text-gray-500 font-mono">{report.quote_reference}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => loadReport(report.id)}>
              <RefreshCw className="h-4 w-4 mr-2" />Actualiser
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />Imprimer / PDF
            </Button>
            {report.status === 'in_progress' && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700"
                onClick={markCompleted} disabled={updating}>
                <CheckCircle className="h-4 w-4 mr-2" />Marquer Terminé
              </Button>
            )}
          </div>
        </div>

        <div id="purchase-report-print">
          {/* Meta card */}
          <Card className="mb-4">
            <CardContent className="p-4">
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
            </CardContent>
          </Card>

          {/* Supplier groups */}
          {report.groups.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-400">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Aucun article. Le modèle n'a peut-être pas de BOQ défini.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {report.groups.map(group => (
                <Card key={group.supplier_name}>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-gray-800">
                        🏢 {group.supplier_name}
                      </CardTitle>
                      <span className="text-sm font-bold text-orange-600">
                        Sous-total : {fmt(group.subtotal)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-gray-500 w-10 no-print">✓</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-500">Catégorie</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-500">Description</th>
                            <th className="px-4 py-2 text-right font-medium text-gray-500">Qté</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-500">Unité</th>
                            <th className="px-4 py-2 text-right font-medium text-gray-500">P.U.</th>
                            <th className="px-4 py-2 text-right font-medium text-gray-500">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {group.items.map(item => (
                            <tr key={item.id}
                              className={item.is_ordered ? 'bg-green-50' : 'hover:bg-gray-50'}>
                              <td className="px-4 py-2 no-print">
                                <Checkbox
                                  checked={item.is_ordered}
                                  onCheckedChange={() => toggleItem(item.id)}
                                />
                              </td>
                              <td className="px-4 py-2 text-gray-600 text-xs">{item.category_name}</td>
                              <td className="px-4 py-2 font-medium">
                                {item.is_ordered
                                  ? <span className="line-through text-gray-400">{item.description}</span>
                                  : item.description}
                              </td>
                              <td className="px-4 py-2 text-right">{item.quantity}</td>
                              <td className="px-4 py-2 text-gray-500">{item.unit}</td>
                              <td className="px-4 py-2 text-right">{fmt(item.unit_price)}</td>
                              <td className="px-4 py-2 text-right font-medium">{fmt(item.total_price)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Grand total */}
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-800">TOTAL GÉNÉRAL</span>
                    <span className="text-2xl font-bold text-orange-600">{fmt(report.total_amount)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Généré le {new Date(report.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
