import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, FileText, Cpu, ArrowRight, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Credits {
  credits: number;
  transactions: Array<{
    id: number;
    amount: number;
    reason: string;
    balance_after: number;
    created_at: string;
  }>;
}

const reasonLabels: Record<string, string> = {
  pack_purchase: 'Achat pack',
  quote_created: 'Devis créé',
  quote_validated: 'Devis validé',
  boq_requested: 'BOQ demandé',
  model_request: 'Demande modèle',
  production_deduction: 'Déduction production',
};

export default function ProDashboardPage() {
  const [credits, setCredits] = useState<Credits | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 mt-1">Bienvenue sur votre portail professionnel Sunbox</p>
      </div>

      {/* Credits card */}
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
                <p className="text-3xl font-bold text-gray-800 mt-1">—</p>
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
                <p className="text-3xl font-bold text-gray-800 mt-1">—</p>
              </div>
              <Cpu className="h-10 w-10 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

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
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">500 Rs</Badge>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Button>
            </Link>
            <Link to="/pro/model-request">
              <Button variant="outline" className="w-full justify-between mt-2">
                <span className="flex items-center gap-2"><Cpu className="h-4 w-4" /> Demander un modèle</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">3 000 Rs</Badge>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Button>
            </Link>
            <Link to="/pro/settings">
              <Button variant="outline" className="w-full justify-between mt-2">
                <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Acheter un pack crédits</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-500 text-white">10 000 Rs</Badge>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dernières transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-400 text-sm">Chargement...</p>
            ) : !credits?.transactions?.length ? (
              <p className="text-gray-400 text-sm">Aucune transaction pour le moment.</p>
            ) : (
              <div className="space-y-2">
                {credits.transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{reasonLabels[tx.reason] ?? tx.reason}</span>
                    <span className={tx.amount > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} Rs
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
