import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, FileText, Cpu, ArrowRight, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Credits {
  credits: number;
  model_request_cost?: number;
  total_quotes?: number;
  total_model_requests?: number;
  transactions: Array<{
    id: number;
    amount: number;
    reason: string;
    balance_after: number;
    created_at: string;
  }>;
}

/** Only model requests (paid) and credit top-ups are shown in the transaction block. */
const VISIBLE_REASONS = new Set(['model_request', 'pack_purchase']);

const reasonLabels: Record<string, string> = {
  pack_purchase:  'Crédit ajouté',
  model_request:  'Demande modèle',
};

const isSemiProSite = typeof window !== 'undefined' && !!(window as any).__SEMI_PRO_SITE__;

export default function ProDashboardPage() {
  const [credits, setCredits] = useState<Credits | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isSemiProSite) { setLoading(false); return; }
    (async () => {
      try {
        const data = await api.getProCredits();
        setCredits(data);
      } catch (err: any) {
        toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const modelCost = credits?.model_request_cost ?? 5000;

  const visibleTransactions = credits?.transactions?.filter(
    (tx) => VISIBLE_REASONS.has(tx.reason)
  ) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 mt-1">Bienvenue sur votre portail professionnel Sunbox</p>
      </div>

      {/* Credits, model-request count — pro-only */}
      {!isSemiProSite && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Crédits disponibles</p>
                <p className="text-3xl font-bold text-orange-700 mt-1">
                  {loading ? '...' : `${(credits?.credits ?? 0).toLocaleString()} Rs`}
                </p>
              </div>
              <CreditCard className="h-10 w-10 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Mes devis</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  {loading ? '...' : (credits?.total_quotes ?? '—')}
                </p>
              </div>
              <FileText className="h-10 w-10 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Demandes modèles</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  {loading ? '...' : (credits?.total_model_requests ?? '—')}
                </p>
              </div>
              <Cpu className="h-10 w-10 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/pro/quotes">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Créer un devis</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {!isSemiProSite && (
              <>
                <Link to="/pro/model-request">
                  <Button variant="outline" className="w-full justify-between mt-2">
                    <span className="flex items-center gap-2"><Cpu className="h-4 w-4" /> Demander un modèle</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-orange-600 font-medium">
                        {loading ? '…' : `${modelCost.toLocaleString()} Rs`}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Button>
                </Link>
                <Link to="/pro/settings">
                  <Button variant="outline" className="w-full justify-between mt-2">
                    <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Acheter un pack crédits</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent transactions — pro-only */}
        {!isSemiProSite && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dernières transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-400 text-sm">Chargement...</p>
            ) : !visibleTransactions.length ? (
              <p className="text-gray-400 text-sm">Aucune transaction pour le moment.</p>
            ) : (
              <div className="space-y-3">
                {visibleTransactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                    <div>
                      <p className="text-gray-700 font-medium">{reasonLabels[tx.reason] ?? tx.reason}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={tx.amount > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} Rs
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}
