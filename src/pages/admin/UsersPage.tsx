import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Users,
  CreditCard,
  Building2,
  TrendingUp,
  Download,
  Copy,
  RefreshCw,
  Globe,
  KeyRound,
  Upload,
  FolderOpen,
  Database,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

/* ======================================================
   TYPES
====================================================== */
interface ProUser {
  id?: number;
  name: string;
  email: string;
  password?: string;
  company_name: string;
  address?: string;
  vat_number?: string;
  brn_number?: string;
  phone?: string;
  sunbox_margin_percent?: number;
  credits?: number;
  is_active?: boolean;
  domain?: string;
  api_token?: string;
  logo_url?: string;
}

const emptyUser: ProUser = {
  name: '',
  email: '',
  password: '',
  company_name: '',
  address: '',
  vat_number: '',
  brn_number: '',
  phone: '',
  sunbox_margin_percent: 0,
  domain: '',
  logo_url: '',
  is_active: true,
};

/** Convert domain to DB slug (mirrors PHP proDbSlug). */
function domainToSlug(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[^a-z0-9.]/g, '_')
    .replace(/\./g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/* ======================================================
   COMPONENT
====================================================== */
export default function UsersPage() {
  const [users, setUsers] = useState<ProUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<ProUser | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [buyingPack, setBuyingPack] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [initializingDb, setInitializingDb] = useState(false);
  const [provisionStatus, setProvisionStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const API_BASE = 'https://sunbox-mauritius.com/api';

  useEffect(() => {
    loadUsers();
  }, []);

  /* ======================================================
     LOAD
  ====================================================== */
  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getProUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     CRUD
  ====================================================== */
  const openNewUser = () => {
    setEditingUser({ ...emptyUser });
    setProvisionStatus(null);
    setIsDialogOpen(true);
  };

  const openEditUser = (user: ProUser) => {
    setEditingUser({ ...user, password: '' });
    setProvisionStatus(null);
    setIsDialogOpen(true);
  };

  const saveUser = async () => {
    if (!editingUser) return;
    try {
      setSaving(true);
      if (editingUser.id) {
        await api.updateProUser(editingUser as { id: number } & ProUser);
        toast({ title: 'Succès', description: 'Utilisateur mis à jour.' });
      } else {
        if (!editingUser.password) {
          toast({ title: 'Erreur', description: 'Le mot de passe est requis.', variant: 'destructive' });
          return;
        }
        await api.createProUser(editingUser as { name: string; email: string; password: string; company_name: string });
        toast({ title: 'Succès', description: 'Utilisateur professionnel créé.' });
      }
      setIsDialogOpen(false);
      loadUsers();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm('Supprimer cet utilisateur professionnel ?')) return;
    try {
      await api.deleteProUser(id);
      toast({ title: 'Succès', description: 'Utilisateur supprimé.' });
      loadUsers();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const buyPackForUser = async (userId: number, userName: string) => {
    if (!confirm(`Ajouter 10 000 Rs de crédits à ${userName} ?`)) return;
    try {
      setBuyingPack(userId);
      const data = await api.buyProPack(userId);
      toast({ title: 'Pack ajouté', description: `Nouveau solde : ${data.credits?.toLocaleString()} Rs` });
      loadUsers();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setBuyingPack(null);
    }
  };

  const regenerateToken = async (userId: number) => {
    if (!confirm('Régénérer le token API ? L\'ancien token sera immédiatement invalidé.')) return;
    try {
      setRegenerating(userId);
      const data = await api.regenerateProToken(userId);
      toast({ title: 'Token régénéré', description: 'Le nouveau token a été généré.' });
      setUsers(users.map((u) => u.id === userId ? { ...u, api_token: data.api_token } : u));
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setRegenerating(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `${label} copié` });
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingUser) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setUploadingLogo(true);
      const r = await fetch('/api/upload_sketch.php', { method: 'POST', body: formData, credentials: 'include' });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || 'Upload échoué');
      setEditingUser((prev) => prev ? { ...prev, logo_url: j.url } : prev);
      toast({ title: 'Logo uploadé' });
    } catch (err: any) {
      toast({ title: 'Erreur upload logo', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const downloadZip = (userId: number) => {
    window.open(`${API_BASE}/download_pro_zip.php?user_id=${userId}`, '_blank');
  };

  const deployProSite = async (userId: number) => {
    setDeploying(true);
    setProvisionStatus(null);
    try {
      const data = await api.deployProSite(userId);
      const errors = data.errors ?? [];
      if (data.deployed) {
        setProvisionStatus({
          ok: true,
          message: `✅ Fichiers déployés dans ${data.site_dir}${errors.length ? ' — Avertissements: ' + errors.join(', ') : ''}`,
        });
        toast({ title: 'Site déployé', description: `URL: ${data.site_url}` });
      } else {
        setProvisionStatus({ ok: false, message: '❌ Échec: ' + (errors.join(', ') || 'Erreur inconnue') });
      }
    } catch (err: any) {
      setProvisionStatus({ ok: false, message: '❌ ' + err.message });
    } finally {
      setDeploying(false);
    }
  };

  const initProDb = async (userId: number) => {
    setInitializingDb(true);
    setProvisionStatus(null);
    try {
      const data = await api.initProDb(userId);
      const errors = data.errors ?? [];
      const parts = [];
      if (data.db_created) parts.push('BD créée');
      if (data.schema_initialized) parts.push('tables créées');
      if (!data.db_created && data.schema_initialized) parts.push('tables mises à jour (BD existante)');
      if (parts.length > 0) {
        setProvisionStatus({
          ok: true,
          message: `✅ ${parts.join(', ')} — BD: ${data.db_name}${errors.length ? ' — Avertissements: ' + errors.join(', ') : ''}`,
        });
        toast({ title: 'Base de données initialisée', description: data.db_name });
      } else {
        setProvisionStatus({ ok: false, message: '❌ ' + (errors.join(', ') || 'Erreur inconnue') });
      }
    } catch (err: any) {
      setProvisionStatus({ ok: false, message: '❌ ' + err.message });
    } finally {
      setInitializingDb(false);
    }
  };

  /* ======================================================
     FILTER
  ====================================================== */
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.domain ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ======================================================
     RENDER
  ====================================================== */
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Utilisateurs Professionnels</h1>
          <p className="text-gray-500 mt-1">{users.length} utilisateur(s) professionnel(s)</p>
        </div>
        <Button onClick={openNewUser} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Professionnel
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un utilisateur, domaine..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {user.logo_url ? (
                      <img
                        src={user.logo_url}
                        alt="Logo"
                        className="w-10 h-10 object-contain rounded-lg border bg-white flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold">{user.name}</h3>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      {!user.is_active && <Badge variant="secondary">Inactif</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEditUser(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteUser(user.id!)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-1 text-sm text-gray-600">
                  {user.company_name && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      {user.company_name}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-orange-600">
                      {(user.credits ?? 0).toLocaleString()} Rs
                    </span>
                  </div>
                  {user.domain && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span className="text-blue-600">{user.domain}</span>
                    </div>
                  )}
                </div>

                {/* API Token */}
                {user.api_token && (
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <KeyRound className="h-3 w-3" /> Token API
                    </p>
                    <div className="flex items-center gap-1">
                      <code className="text-xs text-gray-700 flex-1 truncate bg-white border rounded px-2 py-1">
                        {user.api_token}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => copyToClipboard(user.api_token!, 'Token')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-orange-600"
                        onClick={() => regenerateToken(user.id!)}
                        disabled={regenerating === user.id}
                      >
                        <RefreshCw className={`h-3 w-3 ${regenerating === user.id ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                    onClick={() => buyPackForUser(user.id!, user.name)}
                    disabled={buyingPack === user.id}
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    {buyingPack === user.id ? 'Ajout...' : 'Pack +10 000 Rs'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    onClick={() => downloadZip(user.id!)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Télécharger ZIP
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredUsers.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Aucun utilisateur professionnel trouvé.</p>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUser?.id ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur professionnel'}
            </DialogTitle>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nom *</Label>
                  <Input
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    placeholder="Nom complet"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <Label>{editingUser.id ? 'Nouveau mot de passe (laisser vide = inchangé)' : 'Mot de passe *'}</Label>
                <Input
                  type="password"
                  value={editingUser.password ?? ''}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  placeholder={editingUser.id ? 'Laisser vide pour ne pas changer' : '••••••••'}
                />
              </div>

              <div>
                <Label>Nom de l'entreprise *</Label>
                <Input
                  value={editingUser.company_name}
                  onChange={(e) => setEditingUser({ ...editingUser, company_name: e.target.value })}
                  placeholder="Nom de la société"
                />
              </div>

              <div>
                <Label>Domaine du site pro</Label>
                <Input
                  value={editingUser.domain ?? ''}
                  onChange={(e) => setEditingUser({ ...editingUser, domain: e.target.value })}
                  placeholder="poolbuilder.mu"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Domaine sur lequel le site pro sera déployé. Utilisé pour valider les requêtes API.
                </p>
              </div>

              <div>
                <Label>Logo de l'entreprise</Label>
                <div className="flex items-center gap-3 mt-1">
                  {editingUser.logo_url && (
                    <img
                      src={editingUser.logo_url}
                      alt="Logo actuel"
                      className="h-14 max-w-[120px] object-contain border rounded bg-white p-1"
                    />
                  )}
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {uploadingLogo ? 'Upload...' : editingUser.logo_url ? 'Changer le logo' : 'Choisir un logo'}
                    </Button>
                    {editingUser.logo_url && (
                      <button
                        type="button"
                        onClick={() => setEditingUser({ ...editingUser, logo_url: '' })}
                        className="ml-2 text-xs text-red-500 hover:underline"
                      >
                        Supprimer
                      </button>
                    )}
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG ou WEBP</p>
                  </div>
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>

              <div>
                <Label>Adresse</Label>
                <Input
                  value={editingUser.address ?? ''}
                  onChange={(e) => setEditingUser({ ...editingUser, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Numéro TVA</Label>
                  <Input
                    value={editingUser.vat_number ?? ''}
                    onChange={(e) => setEditingUser({ ...editingUser, vat_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Numéro BRN</Label>
                  <Input
                    value={editingUser.brn_number ?? ''}
                    onChange={(e) => setEditingUser({ ...editingUser, brn_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    value={editingUser.phone ?? ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    placeholder="+230 xxx xxxx"
                  />
                </div>
                <div>
                  <Label>Marge Sunbox (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={editingUser.sunbox_margin_percent ?? 0}
                    onChange={(e) => setEditingUser({ ...editingUser, sunbox_margin_percent: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {editingUser.id && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingUser.is_active ?? true}
                    onCheckedChange={(checked) => setEditingUser({ ...editingUser, is_active: checked })}
                  />
                  <Label>Compte actif</Label>
                </div>
              )}

              {/* Site Deployment */}
              <div className="border rounded-lg p-4 space-y-3 bg-blue-50">
                <p className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                  🚀 Déploiement du site professionnel
                </p>

                {editingUser.domain ? (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-600">
                      📁 Répertoire :{' '}
                      <code className="bg-white border rounded px-1">
                        sunbox-mauritius.com/pros/{editingUser.domain}
                      </code>
                    </p>
                    <p className="text-xs text-gray-600">
                      🗄️ Base de données :{' '}
                      <code className="bg-white border rounded px-1">
                        mauriti2_sunbox_mauritius_{domainToSlug(editingUser.domain)}
                      </code>
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600">
                    ⚠️ Renseignez le domaine ci-dessus avant de déployer.
                  </p>
                )}

                {!editingUser.id && (
                  <p className="text-xs text-amber-600">
                    ⚠️ Enregistrez d'abord l'utilisateur pour activer le déploiement.
                  </p>
                )}

                <div className="grid grid-cols-1 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!editingUser.id || !editingUser.domain || deploying}
                    onClick={() => deployProSite(editingUser.id!)}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100 justify-start"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    {deploying ? 'Déploiement en cours...' : 'Déployer les fichiers du site du professionnel'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!editingUser.id || !editingUser.domain || initializingDb}
                    onClick={() => initProDb(editingUser.id!)}
                    className="text-green-700 border-green-300 hover:bg-green-100 justify-start"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    {initializingDb ? 'Initialisation en cours...' : 'Créer la Base de données et créer les tables'}
                  </Button>
                </div>

                {provisionStatus && (
                  <div
                    className={`text-xs p-2 rounded border ${
                      provisionStatus.ok
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    {provisionStatus.message}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={saveUser}
                  disabled={saving || !editingUser.name || !editingUser.email || !editingUser.company_name}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
