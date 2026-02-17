import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  ArrowLeft,
  CheckCircle, 
  XCircle,
  Mail,
  Phone,
  MapPin,
  Copy,
  Edit,
  Settings,
  Trash2,
  ExternalLink,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useParams } from 'react-router-dom';
import AdminConfigureModal from '@/components/AdminConfigureModal';
import { useSiteSettings, calculateTTC } from '@/hooks/use-site-settings';

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Admin Configure Modal state for editing model-based quotes
  const [showConfigureModal, setShowConfigureModal] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  // Get VAT rate from site settings
  const { data: siteSettings } = useSiteSettings();
  const vatRate = Number(siteSettings?.vat_rate) || 15;

  useEffect(() => {
    if (id) {
      loadQuote(parseInt(id));
    }
  }, [id]);

  const loadQuote = async (quoteId: number) => {
    setLoading(true);
    try {
      const result = await api.getQuote(quoteId);
      setQuote(result);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!quote) return;
    try {
      await api.updateQuoteStatus(quote.id, status as any);
      toast({ title: 'Succès', description: 'Statut mis à jour' });
      setQuote({ ...quote, status });

      // Send email notification for status changes
      if (status === 'approved' || status === 'rejected') {
        try {
          if (!quote.customer_email) {
            toast({ 
              title: 'Avertissement', 
              description: 'Email client manquant - notification non envoyée',
              variant: 'default'
            });
            return;
          }

          const templateKey = status === 'approved' ? 'quote_approved' : 'quote_rejected';
          const emailData: Record<string, any> = {
            customer_name: quote.customer_name,
            reference: quote.reference_number,
            model_name: quote.model_name,
            total_price: formatPrice(quote.total_price),
          };
          
          if (status === 'rejected') {
            emailData.rejection_reason = 'Veuillez nous contacter pour plus de détails.';
          }
          
          await api.sendTemplateEmail({
            to: quote.customer_email,
            template_key: templateKey,
            data: emailData
          });
          
          const message = status === 'approved'
            ? 'Le client a été notifié de l\'approbation'
            : 'Le client a été notifié du refus';
          toast({ title: 'Email envoyé', description: message });
        } catch (emailErr: any) {
          console.error('Email error:', emailErr);
          toast({ 
            title: 'Avertissement', 
            description: 'Statut mis à jour mais l\'email n\'a pas pu être envoyé',
            variant: 'default'
          });
        }

        // When approving, also generate and open the PDF devis
        if (status === 'approved') {
          try {
            const tpl = await api.getDefaultPdfTemplate('devis');
            if (tpl) {
              const pdfResult = await api.renderPdfHtml(tpl.id, quote.id);
              if (pdfResult?.html) {
                openPdfInNewWindow(pdfResult.html, quote.reference_number);
                toast({ title: 'PDF généré', description: 'Le PDF du devis a été ouvert dans un nouvel onglet' });
              }
            }
          } catch (pdfErr: any) {
            console.error('PDF generation error:', pdfErr);
          }
        }
      }
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const deleteQuote = async () => {
    if (!quote) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce devis ? Cette action est irréversible.')) return;
    
    try {
      await api.deleteQuote(quote.id);
      toast({ title: 'Succès', description: 'Devis supprimé' });
      navigate('/admin/quotes');
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const isFreeQuote = (q: any): boolean => {
    return q.is_free_quote === true || q.is_free_quote === 1 || q.is_free_quote === '1';
  };

  const openPdfInNewWindow = (html: string, reference: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Devis ${reference} - Sunbox Mauritius</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { margin: 0; padding: 10mm; font-family: Arial, sans-serif; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${html}</body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownloadPdf = async () => {
    if (!quote) return;
    try {
      const tpl = await api.getDefaultPdfTemplate('devis');
      if (!tpl) {
        toast({ 
          title: 'Pas de template', 
          description: 'Créez un template PDF dans la section PDF Templates pour générer un PDF.',
          variant: 'destructive' 
        });
        return;
      }

      const result = await api.renderPdfHtml(tpl.id, quote.id);
      if (!result?.html) {
        toast({ title: 'Erreur', description: 'Erreur lors de la génération du PDF', variant: 'destructive' });
        return;
      }

      openPdfInNewWindow(result.html, quote.reference_number);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const handleEditQuote = () => {
    if (!quote) return;
    if (isFreeQuote(quote)) {
      navigate(`/admin/quotes/new?edit=${quote.id}`);
    } else {
      setShowConfigureModal(true);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-MU', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(price) + ' Rs';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-purple-100 text-purple-800',
    };
    const labels: Record<string, string> = {
      pending: 'En attente',
      approved: 'Approuvé',
      rejected: 'Rejeté',
      completed: 'Terminé',
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{labels[status] || status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">Devis introuvable</p>
        <Button variant="link" onClick={() => navigate('/admin/quotes')} className="mt-2">
          Retour aux devis
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/quotes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-orange-500" />
              Détails du Devis
            </h1>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadQuote(parseInt(id!))}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Reference & Status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Référence</p>
              <p className="text-xl font-mono font-bold text-blue-600">{quote.reference_number}</p>
            </div>
            {getStatusBadge(quote.status)}
          </div>
        </CardContent>
      </Card>

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Informations Client</CardTitle>
            {quote.contact_id && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/admin/contacts?contact=${quote.contact_id}`)}
                className="text-orange-600 hover:text-orange-700"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Voir le contact
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">{quote.customer_name}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <a href={`mailto:${quote.customer_email}`} className="hover:text-orange-600">
                {quote.customer_email}
              </a>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <a href={`tel:${quote.customer_phone}`} className="hover:text-orange-600">
                {quote.customer_phone}
              </a>
            </div>
            {quote.customer_address && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>{quote.customer_address}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quote Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Détails du Devis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg divide-y">
            <div className="flex justify-between p-3">
              <span className="text-gray-600">Modèle</span>
              <span className="font-medium">{quote.model_name}</span>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-gray-600">Type</span>
              <span className="font-medium capitalize">{quote.model_type}</span>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-gray-600">Prix de base</span>
              <span className="font-medium">{formatPrice(quote.base_price)}</span>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-gray-600">Options</span>
              <span className="font-medium">{formatPrice(quote.options_total)}</span>
            </div>
            <div className="flex justify-between p-3">
              <span className="font-bold">Total HT</span>
              <span className="font-bold text-lg">{formatPrice(quote.total_price)}</span>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-gray-600">TVA ({vatRate}%)</span>
              <span className="font-medium">{formatPrice(calculateTTC(quote.total_price, vatRate) - quote.total_price)}</span>
            </div>
            <div className="flex justify-between p-3 bg-orange-50">
              <span className="font-bold">Total TTC</span>
              <span className="font-bold text-orange-600 text-lg">{formatPrice(calculateTTC(quote.total_price, vatRate))}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      {quote?.options && quote.options.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Options Sélectionnées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {quote.options.map((opt: any, idx: number) => (
                <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{opt.option_name}</span>
                  <span className="font-medium text-sm">{formatPrice(opt.option_price)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message */}
      {quote.customer_message && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Message du client</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="bg-gray-50 p-3 rounded-lg text-gray-600 text-sm">{quote.customer_message}</p>
          </CardContent>
        </Card>
      )}

      {/* Validity */}
      {quote.valid_until && (
        <p className="text-sm text-gray-500">
          Devis valable jusqu'au: {new Date(quote.valid_until).toLocaleDateString('fr-FR')}
        </p>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-2">
            {/* Quote status flow: pending → approved/rejected → completed */}
            {quote.status === 'pending' && (
              <>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => updateStatus('approved')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approuver
                </Button>
                <Button 
                  variant="outline" 
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => updateStatus('rejected')}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeter
                </Button>
              </>
            )}
            {quote.status === 'approved' && (
              <Button 
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => updateStatus('completed')}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Marquer Terminé
              </Button>
            )}
            {(quote.status === 'approved' || quote.status === 'rejected' || quote.status === 'completed') && (
              <Button 
                variant="outline"
                onClick={() => updateStatus('pending')}
              >
                Remettre en attente
              </Button>
            )}

            {/* Edit & Clone buttons */}
            <Button 
              variant="outline"
              onClick={handleEditQuote}
              title={isFreeQuote(quote) ? "Modifier le devis libre" : "Ouvrir le configurateur"}
            >
              {isFreeQuote(quote) ? (
                <Edit className="h-4 w-4 mr-2" />
              ) : (
                <Settings className="h-4 w-4 mr-2" />
              )}
              {isFreeQuote(quote) ? 'Modifier' : 'Configurer'}
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate(`/admin/quotes/new?clone=${quote.id}`)}
            >
              <Copy className="h-4 w-4 mr-2" />
              Cloner
            </Button>
            <Button 
              variant="outline"
              onClick={handleDownloadPdf}
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button 
              variant="outline"
              className="text-red-600 hover:bg-red-50 ml-auto"
              onClick={deleteQuote}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin Configure Modal for editing model-based quotes */}
      <AdminConfigureModal
        open={showConfigureModal}
        onClose={() => setShowConfigureModal(false)}
        quoteId={quote.id}
        onSaved={() => loadQuote(parseInt(id!))}
      />
    </div>
  );
}
