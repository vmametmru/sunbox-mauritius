import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, MessageSquare, Loader2, AlertCircle, Home } from 'lucide-react';
import { api } from '@/lib/api';
import { useQuote } from '@/contexts/QuoteContext';
import type { Model } from '@/contexts/QuoteContext';

type ActionType = 'approve' | 'reject' | 'changes' | null;
type PageState = 'loading' | 'confirm' | 'submitting' | 'done' | 'error';

export default function QuoteActionPage() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSelectedModel, setCustomerDetails } = useQuote();

  const [quote, setQuote] = useState<any>(null);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [doneAction, setDoneAction] = useState<ActionType>(null);
  const [error, setError] = useState('');

  const token = searchParams.get('token') || '';
  const autoAction = searchParams.get('action') as ActionType;

  useEffect(() => {
    if (!quoteId) { setError('Lien invalide'); setPageState('error'); return; }
    loadQuote();
  }, [quoteId]);

  const loadQuote = async () => {
    setPageState('loading');
    try {
      // Try token-based fetch first, fallback to ID (for admin previews without token)
      let result;
      if (token) {
        result = await api.getQuoteByToken(token);
      } else {
        result = await api.getQuote(parseInt(quoteId!));
      }
      setQuote(result);
      setPageState('confirm');
    } catch (err: any) {
      setError(err.message || 'Devis introuvable');
      setPageState('error');
    }
  };

  const handleAction = async (action: ActionType) => {
    if (!action) return;

    if (action === 'changes') {
      await submitStatus('revision_requested');
      // Pre-load model in QuoteContext and redirect to configurator
      if (quote?.model_id) {
        const model: Model = {
          id:          Number(quote.model_id),
          name:        quote.model_name || '',
          type:        (quote.model_type as 'container' | 'pool') || 'container',
          description: '',
          base_price:  Number(quote.base_price || 0),
          surface_m2:  0,
          image_url:   quote.photo_url || '',
          plan_url:    quote.plan_url  || '',
        };
        setSelectedModel(model);
        setCustomerDetails({
          customerName:    quote.customer_name  || '',
          customerEmail:   quote.customer_email || '',
          customerPhone:   quote.customer_phone || '',
          customerAddress: quote.customer_address || '',
        });
        navigate('/configure');
      } else {
        setDoneAction('changes');
        setPageState('done');
      }
      return;
    }

    await submitStatus(action === 'approve' ? 'approved' : 'rejected');
    setDoneAction(action);
    setPageState('done');
  };

  const submitStatus = async (status: string) => {
    setPageState('submitting');
    try {
      if (token) {
        await api.updateQuoteStatusByToken(token, status as any);
      } else {
        await api.updateQuoteStatus(parseInt(quoteId!), status as any);
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de mettre à jour le statut');
      setPageState('error');
      throw err;
    }
  };

  // Auto-trigger action from URL param (links in PDF)
  useEffect(() => {
    if (autoAction && pageState === 'confirm' && quote) {
      handleAction(autoAction);
    }
  }, [autoAction, pageState, quote]);

  const formatPrice = (p: number) =>
    new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(p) + ' Rs';

  // ── LOADING ─────────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Chargement du devis…</p>
        </div>
      </div>
    );
  }

  // ── ERROR ────────────────────────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Lien invalide</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
            <Home className="h-4 w-4" /> Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // ── SUBMITTING ───────────────────────────────────────────────────────────────
  if (pageState === 'submitting') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Enregistrement de votre réponse…</p>
        </div>
      </div>
    );
  }

  // ── DONE ─────────────────────────────────────────────────────────────────────
  if (pageState === 'done') {
    const config: Record<string, { icon: React.ReactNode; title: string; message: string; color: string }> = {
      approve: {
        icon: <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />,
        title: 'Devis approuvé !',
        message: 'Merci ! Votre approbation a été enregistrée. Notre équipe vous contactera prochainement pour la suite.',
        color: 'green',
      },
      reject: {
        icon: <XCircle className="h-20 w-20 text-red-400 mx-auto mb-6" />,
        title: 'Devis refusé',
        message: 'Votre refus a été enregistré. N\'hésitez pas à nous contacter si vous souhaitez discuter d\'une autre proposition.',
        color: 'red',
      },
      changes: {
        icon: <MessageSquare className="h-20 w-20 text-blue-500 mx-auto mb-6" />,
        title: 'Modifications demandées',
        message: 'Votre demande de modification a été enregistrée. Notre équipe vous contactera pour discuter des changements souhaités.',
        color: 'blue',
      },
    };
    const c = config[doneAction || 'approve'];

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          {c.icon}
          <h1 className="text-2xl font-bold text-gray-800 mb-3">{c.title}</h1>
          <p className="text-gray-500 mb-2">Devis : <strong className="text-gray-700">{quote?.reference_number}</strong></p>
          <p className="text-gray-500 mb-6">{c.message}</p>
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
            <Home className="h-4 w-4" /> Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // ── CONFIRM ──────────────────────────────────────────────────────────────────
  const modelTitle = quote.is_free_quote ? (quote.quote_title || 'Devis') : (quote.model_name || 'Devis');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1A365D] text-white py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="inline-block bg-orange-500 text-white text-xs font-bold tracking-widest px-3 py-1 rounded mb-3">DEVIS</div>
          <h1 className="text-2xl font-bold">{modelTitle}</h1>
          <p className="text-blue-200 text-sm mt-1">Réf. {quote.reference_number} • {new Date(quote.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Quote summary */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Récapitulatif</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Client</span>
              <span className="font-medium">{quote.customer_name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Modèle / Titre</span>
              <span className="font-medium">{modelTitle}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Total HT</span>
              <span className="font-semibold text-[#1A365D]">{formatPrice(Number(quote.total_price))}</span>
            </div>
            {quote.valid_until && (
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Valable jusqu'au</span>
                <span className="font-medium">{new Date(quote.valid_until).toLocaleDateString('fr-FR')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-2">Votre réponse</h2>
          <p className="text-gray-500 text-sm mb-6">Sélectionnez une option pour répondre à ce devis.</p>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => handleAction('approve')}
              className="flex items-center gap-4 p-4 bg-green-50 border-2 border-green-200 hover:border-green-400 hover:bg-green-100 rounded-xl transition-colors group"
            >
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-green-800">Approuver le devis</div>
                <div className="text-sm text-green-600">Je confirme et approuve ce devis</div>
              </div>
            </button>

            <button
              onClick={() => handleAction('changes')}
              className="flex items-center gap-4 p-4 bg-blue-50 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-100 rounded-xl transition-colors group"
            >
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-blue-800">Demander des modifications</div>
                <div className="text-sm text-blue-600">
                  {quote.model_id ? 'Je souhaite modifier les options du configurateur' : 'Je souhaite des ajustements'}
                </div>
              </div>
            </button>

            <button
              onClick={() => handleAction('reject')}
              className="flex items-center gap-4 p-4 bg-red-50 border-2 border-red-200 hover:border-red-400 hover:bg-red-100 rounded-xl transition-colors group"
            >
              <div className="w-12 h-12 bg-red-400 rounded-full flex items-center justify-center flex-shrink-0">
                <XCircle className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-red-700">Rejeter le devis</div>
                <div className="text-sm text-red-500">Je ne souhaite pas donner suite</div>
              </div>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          Sunbox Mauritius — Pour toute question, contactez-nous directement.
        </p>
      </div>
    </div>
  );
}
