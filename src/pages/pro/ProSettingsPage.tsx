import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CreditCard, TrendingUp, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: number;
  name: string;
  email: string;
  company_name: string;
  address: string;
  vat_number: string;
  brn_number: string;
  phone: string;
  logo_url: string;
  sunbox_margin_percent: number;
  credits: number;
}

interface Transaction {
  id: number;
  amount: number;
  reason: string;
  balance_after: number;
  created_at: string;
}

const reasonLabels: Record<string, string> = {
  pack_purchase: 'Achat pack',
  quote_created: 'Devis créé',
  quote_validated: 'Devis validé',
  boq_requested: 'BOQ demandé',
  model_request: 'Demande modèle',
  production_deduction: 'Déduction production',
};

export default function ProSettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [saving, setSaving] = useState(false);
  const [buyingPack, setBuyingPack] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileData, creditsData] = await Promise.all([
        api.getProProfile(),
        api.getProCredits(),
      ]);
      setProfile(profileData);
      setTransactions(creditsData.transactions ?? []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const saveProfile = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      await api.updateProProfile({
        company_name: profile.company_name,
        address: profile.address,
        vat_number: profile.vat_number,
        brn_number: profile.brn_number,
        phone: profile.phone,
        sunbox_margin_percent: profile.sunbox_margin_percent,
      });
      toast({ title: 'Succès', description: 'Profil mis à jour.' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const buyPack = async () => {
    if (!profile) return;
    if (!confirm('Acheter un pack de 10 000 Rs de crédits ?')) return;
    try {
      setBuyingPack(true);
      const data = await api.buyProPack(profile.id);
      toast({ title: 'Pack acheté !', description: `Nouveau solde : ${data.credits.toLocaleString()} Rs` });
      loadData();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setBuyingPack(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setUploadingLogo(true);
      const r = await fetch('/api/upload_sketch.php', { method: 'POST', body: formData, credentials: 'include' });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || 'Upload échoué');
      await api.updateProProfile({ logo_url: j.url });
      setProfile((prev) => prev ? { ...prev, logo_url: j.url } : prev);
      toast({ title: 'Logo mis à jour' });
    } catch (err: any) {
      toast({ title: 'Erreur upload logo', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
    }
  };

  if (!profile) return <p className="text-gray-400">Chargement...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
        <p className="text-gray-500 mt-1">Gérez vos informations professionnelles</p>
      </div>

      {/* Credits */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <CreditCard className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-orange-600 font-medium">Crédits disponibles</p>
                <p className="text-2xl font-bold text-orange-700">{profile.credits.toLocaleString()} Rs</p>
              </div>
            </div>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={buyPack}
              disabled={buyingPack}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {buyingPack ? 'Achat...' : 'Acheter un pack (10 000 Rs)'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile form */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de l'entreprise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nom de l'entreprise</Label>
              <Input value={profile.company_name} onChange={(e) => setProfile({ ...profile, company_name: e.target.value })} />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={profile.phone ?? ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+230 xxx xxxx" />
            </div>
            <div className="md:col-span-2">
              <Label>Adresse</Label>
              <Input value={profile.address ?? ''} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
            </div>
            <div>
              <Label>Numéro TVA</Label>
              <Input value={profile.vat_number ?? ''} onChange={(e) => setProfile({ ...profile, vat_number: e.target.value })} />
            </div>
            <div>
              <Label>Numéro BRN</Label>
              <Input value={profile.brn_number ?? ''} onChange={(e) => setProfile({ ...profile, brn_number: e.target.value })} />
            </div>
            <div>
              <Label>Marge sur prix Sunbox (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={profile.sunbox_margin_percent}
                onChange={(e) => setProfile({ ...profile, sunbox_margin_percent: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Logo de l'entreprise</Label>
              {profile.logo_url && (
                <img src={profile.logo_url} alt="Logo" className="h-12 mb-2 border rounded bg-white" />
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploadingLogo ? 'Upload...' : 'Changer le logo'}
              </Button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={saveProfile} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction history */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des crédits</CardTitle>
        </CardHeader>
        <CardContent>
          {!transactions.length ? (
            <p className="text-gray-400 text-sm">Aucune transaction.</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{reasonLabels[tx.reason] ?? tx.reason}</p>
                    <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleString('fr-FR')}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} Rs
                    </p>
                    <p className="text-xs text-gray-400">Solde : {tx.balance_after.toLocaleString()} Rs</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
