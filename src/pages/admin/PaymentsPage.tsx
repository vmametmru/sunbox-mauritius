import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { CreditCard } from 'lucide-react';

interface PaymentSettings {
  pdf_bank_details: string;
  pdf_terms: string;
  pdf_show_bank_details: string;
  pdf_show_terms: string;
}

const defaultSettings: PaymentSettings = {
  pdf_bank_details: '',
  pdf_terms: '',
  pdf_show_bank_details: 'false',
  pdf_show_terms: 'false',
};

export default function PaymentsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PaymentSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSettings('pdf')
      .then((result: Record<string, string>) => {
        if (result) setSettings({ ...defaultSettings, ...result });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      await api.updateSettingsBulk(
        Object.entries(settings).map(([key, value]) => ({ key, value: value ?? '', group: 'pdf' })),
      );
      toast({ title: 'Succès', description: 'Paramètres de paiement enregistrés.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Chargement…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-7 w-7 text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
          <p className="text-sm text-gray-500">Coordonnées bancaires et modalités de paiement affichées sur les devis PDF.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coordonnées bancaires</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-6 py-1">
            <div>
              <p className="font-medium text-sm">Afficher dans les devis PDF</p>
              <p className="text-sm text-gray-500">Ajoute un encart avec les coordonnées bancaires dans le bloc « Bon pour accord »</p>
            </div>
            <Switch
              checked={settings.pdf_show_bank_details === 'true'}
              onCheckedChange={(v) => setSettings({ ...settings, pdf_show_bank_details: v ? 'true' : 'false' })}
            />
          </div>

          {settings.pdf_show_bank_details === 'true' && (
            <div className="space-y-2">
              <Label>Coordonnées bancaires</Label>
              <Textarea
                rows={4}
                value={settings.pdf_bank_details}
                onChange={(e) => setSettings({ ...settings, pdf_bank_details: e.target.value })}
                placeholder={'Banque : MCB\nIBAN : MU12 MCBL 0000 0000 0000 0000 000\nBIC : MCBLMUMU\nTitulaire : Sunbox Ltd'}
              />
              <p className="text-xs text-gray-500">Ces informations apparaissent dans l'encart bancaire du PDF.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modalités de paiement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-6 py-1">
            <div>
              <p className="font-medium text-sm">Afficher les modalités dans les devis PDF</p>
              <p className="text-sm text-gray-500">Ajoute une ligne de modalités de paiement en bas du PDF</p>
            </div>
            <Switch
              checked={settings.pdf_show_terms === 'true'}
              onCheckedChange={(v) => setSettings({ ...settings, pdf_show_terms: v ? 'true' : 'false' })}
            />
          </div>

          {settings.pdf_show_terms === 'true' && (
            <div className="space-y-2">
              <Label>Texte des modalités</Label>
              <Textarea
                rows={3}
                value={settings.pdf_terms}
                onChange={(e) => setSettings({ ...settings, pdf_terms: e.target.value })}
                placeholder="60% à la commande, 30% sur avancement travaux, solde à la remise des clés."
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}
