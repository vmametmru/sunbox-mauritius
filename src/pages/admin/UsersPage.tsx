import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Users,
  CreditCard,
  Building2,
  TrendingUp,
  Globe,
  Upload,
  FolderOpen,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
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
  model_request_cost?: number;
  credits?: number;
  is_active?: boolean;
  domain?: string;
  api_token?: string;
  logo_url?: string;
  db_name?: string;
}

interface VersionStatus {
  checking: boolean;
  files_up_to_date: boolean;
  db_up_to_date: boolean;
  current_file_version: string | null;
  current_db_version: string | null;
  latest_file_version: string;
  latest_db_version: string;
  domain_configured: boolean;
  db_configured: boolean;
  db_error?: string;
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
  model_request_cost: 5000,
  domain: '',
  logo_url: '',
  db_name: '',
  is_active: true,
};

const defaultVersionStatus: VersionStatus = {
  checking: false,
  files_up_to_date: false,
  db_up_to_date: false,
  current_file_version: null,
  current_db_version: null,
  latest_file_version: '1.2.0',
  latest_db_version: '1.2.0',
  domain_configured: false,
  db_configured: false,
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [initializingDb, setInitializingDb] = useState(false);
  const [provisionStatus, setProvisionStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [allModels, setAllModels] = useState<{ id: number; name: string; type: string }[]>([]);
  const [enabledModelIds, setEnabledModelIds] = useState<Set<number>>(new Set());
  const [loadingModels, setLoadingModels] = useState(false);
  const [versionStatuses, setVersionStatuses] = useState<Map<number, VersionStatus>>(new Map());
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const API_BASE = 'https://sunbox-mauritius.com/api';

  /* ======================================================
     VERSION CHECKING
  ====================================================== */
  const checkUserVersion = useCallback(async (userId: number) => {
    setVersionStatuses(prev => {
      const next = new Map(prev);
      next.set(userId, { ...(prev.get(userId) ?? defaultVersionStatus), checking: true });
      return next;
    });
    try {
      const data = await api.checkProVersions(userId);
      setVersionStatuses(prev => {
        const next = new Map(prev);
        next.set(userId, { checking: false, ...data });
        return next;
      });
    } catch {
      setVersionStatuses(prev => {
        const next = new Map(prev);
        next.set(userId, { ...defaultVersionStatus, checking: false });
        return next;
      });
    }
  }, []);

  useEffect(() => {
    loadUsers();
    api.getModels(undefined, true).then((data: any) => {
      const list = Array.isArray(data) ? data : (data?.models ?? []);
      setAllModels(list.map((m: any) => ({ id: Number(m.id), name: m.name, type: m.type })));
    }).catch((err: any) => {
      console.error('Erreur chargement modèles:', err);
    });
  }, []);

  /* ======================================================
     LOAD
  ====================================================== */
  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getProUsers();
      const list: ProUser[] = Array.isArray(data) ? data : [];
      setUsers(list);
      // Check versions for all users that have a domain configured
      list.forEach(u => {
        if (u.id && u.domain) checkUserVersion(u.id);
      });
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
    setEnabledModelIds(new Set(allModels.map(m => m.id)));
    setIsDialogOpen(true);
  };

  const openEditUser = (user: ProUser) => {
    setEditingUser({ ...user, password: '' });
    setProvisionStatus(null);
    const allIds = new Set(allModels.map(m => m.id));
    setEnabledModelIds(allIds);
    if (user.id) {
      // Load version status for this user if not already loaded
      if (!versionStatuses.has(user.id) && user.domain) {
        checkUserVersion(user.id);
      }
      setLoadingModels(true);
      api.getProModelOverrides(user.id).then((overrides: any) => {
        const list = Array.isArray(overrides) ? overrides : [];
        setEnabledModelIds(prev => {
          const next = new Set(prev);
          for (const ov of list) {
            const mid = Number(ov.model_id);
            if (!Number(ov.is_enabled)) next.delete(mid);
            else next.add(mid);
          }
          return next;
        });
      }).catch((err: any) => {
        console.error('Erreur chargement des overrides modèles:', err);
      }).finally(() => setLoadingModels(false));
    }
    setIsDialogOpen(true);
  };

  const saveUser = async () => {
    if (!editingUser) return;
    try {
      setSaving(true);
      let userId: number;
      if (editingUser.id) {
        await api.updateProUser(editingUser as { id: number } & ProUser);
        userId = editingUser.id;
        toast({ title: 'Succès', description: 'Utilisateur mis à jour.' });
      } else {
        if (!editingUser.password) {
          toast({ title: 'Erreur', description: 'Le mot de passe est requis.', variant: 'destructive' });
          return;
        }
        const result = await api.createProUser(editingUser as { name: string; email: string; password: string; company_name: string });
        userId = Number(result.user_id ?? result.id);
        if (!userId) throw new Error('ID utilisateur manquant dans la réponse du serveur.');
        toast({ title: 'Succès', description: 'Utilisateur professionnel créé.' });
      }
      if (allModels.length > 0 && userId) {
        await Promise.all(
          allModels.map(m =>
            api.setProModelEnabled(userId, m.id, enabledModelIds.has(m.id))
          )
        );
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

  const deployProSite = async (userId: number) => {
    setDeploying(true);
    setProvisionStatus(null);
    try {
      const data = await api.deployProSite(userId);
      const errors = data.errors ?? [];
      const debugInfo = data.debug ? ` [${(data.debug as string[]).join(' | ')}]` : '';
      if (data.deployed) {
        setProvisionStatus({
          ok: true,
          message: `✅ Fichiers déployés dans ${data.site_dir}${errors.length ? ' — Avertissements: ' + errors.join(', ') : ''}`,
        });
        toast({ title: 'Site déployé', description: `URL: ${data.site_url}` });
        // Refresh version status
        checkUserVersion(userId);
      } else {
        setProvisionStatus({ ok: false, message: `❌ Échec: ${errors.join(', ') || 'Erreur inconnue'}${debugInfo}` });
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
      if (data.schema_initialized) {
        setProvisionStatus({
          ok: true,
          message: `✅ Base de données mise à jour — BD: ${data.db_name} (v${data.schema_version ?? '?'})${errors.length ? ' — Avertissements: ' + errors.join(', ') : ''}`,
        });
        toast({ title: 'Base de données initialisée', description: data.db_name });
        // Refresh version status
        checkUserVersion(userId);
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

/** Status chip showing file/DB version state. Defined outside component for stable reference. */
function VersionChip({ ok, checking, label }: { ok: boolean; checking: boolean; label: string }) {
  if (checking) return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
      <RefreshCw className="h-3 w-3 animate-spin" />{label}
    </span>
  );
  return ok ? (
    <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
      <CheckCircle2 className="h-3 w-3" />{label}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
      <AlertTriangle className="h-3 w-3" />{label}
    </span>
  );
}

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
          {filteredUsers.map((user) => {
            const vs = user.id ? versionStatuses.get(user.id) : undefined;
            return (
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

                  {/* Version status chips — shown in card when domain is configured */}
                  {user.domain && vs && (
                    <div className="flex gap-3 pt-1">
                      <VersionChip
                        checking={vs.checking}
                        ok={vs.files_up_to_date}
                        label="Fichiers"
                      />
                      {user.db_name && (
                        <VersionChip
                          checking={vs.checking}
                          ok={vs.db_up_to_date}
                          label="BD"
                        />
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
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
                  </div>
                </CardContent>
              </Card>
            );
          })}

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
                  Domaine sur lequel le site pro sera déployé.
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
                <div>
                  <Label>Coût demande modèle (Rs)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={editingUser.model_request_cost ?? 5000}
                    onChange={(e) => setEditingUser({ ...editingUser, model_request_cost: parseFloat(e.target.value) || 5000 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Crédits déduits à chaque demande de nouveau modèle (défaut : 5 000 Rs).
                  </p>
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

              {/* Model Selection */}
              <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">
                  🏠 Modèles disponibles sur le site pro
                </p>
                <p className="text-xs text-gray-500">
                  Cochez les modèles à afficher sur le site du professionnel.
                </p>
                {loadingModels ? (
                  <p className="text-xs text-gray-400">Chargement des modèles...</p>
                ) : allModels.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucun modèle actif trouvé.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-1">
                    {allModels.map(model => (
                      <label
                        key={model.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 rounded px-2 py-1"
                      >
                        <input
                          type="checkbox"
                          checked={enabledModelIds.has(model.id)}
                          onChange={() =>
                            setEnabledModelIds(prev => {
                              const next = new Set(prev);
                              if (next.has(model.id)) next.delete(model.id);
                              else next.add(model.id);
                              return next;
                            })
                          }
                          className="rounded"
                        />
                        <span className="text-sm">
                          {model.name}
                          <span className="ml-1 text-xs text-gray-400">
                            ({model.type === 'container' ? 'Conteneur' : 'Piscine'})
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* DB Config */}
              <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  🗄️ Base de données du site professionnel
                </p>
                <p className="text-xs text-gray-500">
                  Créez d'abord la base de données manuellement dans cPanel, puis renseignez son nom ici.
                  Les identifiants du serveur Sunbox seront utilisés pour s'y connecter.
                </p>
                <div>
                  <Label>Nom de la base de données</Label>
                  <Input
                    value={editingUser?.db_name ?? ''}
                    onChange={(e) => setEditingUser(editingUser ? { ...editingUser, db_name: e.target.value } : editingUser)}
                    placeholder="mauriti2_pro_poolbuilder"
                  />
                </div>
              </div>

              {/* Site Deployment — version-aware */}
              {editingUser.id && editingUser.domain && (() => {
                const vs = versionStatuses.get(editingUser.id!);
                return (
                  <div className="border rounded-lg p-4 space-y-3 bg-blue-50">
                    <p className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                      🚀 Déploiement du site professionnel
                    </p>

                    <div className="space-y-1">
                      <p className="text-xs text-gray-600">
                        📁 Répertoire :{' '}
                        <code className="bg-white border rounded px-1">
                          sunbox-mauritius.com/pros/{editingUser.domain}
                        </code>
                      </p>
                      {editingUser.db_name && (
                        <p className="text-xs text-gray-600">
                          🗄️ Base de données :{' '}
                          <code className="bg-white border rounded px-1">{editingUser.db_name}</code>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      {/* File deployment row */}
                      {vs?.checking ? (
                        <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Vérification des versions...
                        </div>
                      ) : vs?.files_up_to_date ? (
                        <div className="flex items-center gap-2 text-sm text-green-700 py-1">
                          <CheckCircle2 className="h-4 w-4" />
                          Fichiers à jour
                          {vs.current_file_version && (
                            <span className="text-xs text-gray-400">(v{vs.current_file_version})</span>
                          )}
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={deploying}
                          onClick={() => deployProSite(editingUser.id!)}
                          className="text-blue-700 border-blue-300 hover:bg-blue-100 justify-start w-full"
                        >
                          <FolderOpen className="h-4 w-4 mr-2" />
                          {deploying ? 'Déploiement en cours...' : (
                            vs?.current_file_version
                              ? `Mettre à jour les fichiers (v${vs.current_file_version} → v${vs.latest_file_version})`
                              : 'Déployer les fichiers du site'
                          )}
                        </Button>
                      )}

                      {/* DB row */}
                      {editingUser.db_name && (
                        vs?.checking ? null : vs?.db_up_to_date ? (
                          <div className="flex items-center gap-2 text-sm text-green-700 py-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Base de données à jour
                            {vs.current_db_version && (
                              <span className="text-xs text-gray-400">(v{vs.current_db_version})</span>
                            )}
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={initializingDb}
                            onClick={() => initProDb(editingUser.id!)}
                            className="text-green-700 border-green-300 hover:bg-green-100 justify-start w-full"
                          >
                            <Database className="h-4 w-4 mr-2" />
                            {initializingDb ? 'Mise à jour en cours...' : (
                              vs?.current_db_version
                                ? `Mettre à jour la BD (v${vs.current_db_version} → v${vs.latest_db_version})`
                                : 'Créer les tables dans la base de données'
                            )}
                          </Button>
                        )
                      )}

                      {/* Refresh versions button */}
                      {editingUser.id && !vs?.checking && (
                        <button
                          type="button"
                          onClick={() => checkUserVersion(editingUser.id!)}
                          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mt-1"
                        >
                          <RefreshCw className="h-3 w-3" /> Vérifier les versions
                        </button>
                      )}
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
                );
              })()}

              {/* Show deploy section for new users without ID, or users without domain */}
              {editingUser.id && !editingUser.domain && (
                <p className="text-xs text-amber-600">
                  ⚠️ Renseignez le domaine ci-dessus avant de déployer.
                </p>
              )}
              {!editingUser.id && (
                <p className="text-xs text-amber-600">
                  ⚠️ Enregistrez d'abord l'utilisateur pour activer le déploiement.
                </p>
              )}

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
