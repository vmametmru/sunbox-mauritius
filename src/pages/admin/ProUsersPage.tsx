import React, { useEffect, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  UserCheck,
  Database,
  RefreshCw,
  Key,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

/* ======================================================
   TYPES
====================================================== */
interface ProUser {
  id?: number;
  name: string;
  email: string;
  company_name: string;
  phone: string;
  is_active: boolean;
}

interface DbCredentials {
  db_host: string;
  db_name: string;
  db_user: string;
  db_pass: string;
  db_charset: string;
}

interface DbCheckResult {
  status: 'exists' | 'empty' | 'error' | 'no_credentials';
  message: string;
  table_count?: number;
}

const emptyUser = (): ProUser => ({
  name: '',
  email: '',
  company_name: '',
  phone: '',
  is_active: true,
});

const emptyDb = (): DbCredentials => ({
  db_host: 'localhost',
  db_name: '',
  db_user: '',
  db_pass: '',
  db_charset: 'utf8mb4',
});

/* ======================================================
   KEY GENERATION (browser Web Crypto — equivalent to
   `openssl rand -base64 32`)
====================================================== */
async function generateSecureKey(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // base64 encode
  return btoa(String.fromCharCode(...bytes));
}

/* ======================================================
   COMPONENT
====================================================== */
export default function ProUsersPage() {
  const { toast } = useToast();

  // List
  const [users, setUsers] = useState<ProUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editingUser, setEditingUser] = useState<ProUser | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // DB credentials inside the modal
  const [dbCreds, setDbCreds] = useState<DbCredentials>(emptyDb());
  const [dbLoading, setDbLoading] = useState(false);
  const [dbSaving, setDbSaving] = useState(false);
  const [dbCheck, setDbCheck] = useState<DbCheckResult | null>(null);
  const [dbChecking, setDbChecking] = useState(false);
  const [dbIniting, setDbIniting] = useState(false);

  // Security key panel
  const [generatedKey, setGeneratedKey] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);

  /* ====================================================
     LOAD
  ==================================================== */
  useEffect(() => { loadUsers(); }, []);

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

  /* ====================================================
     OPEN / CLOSE
  ==================================================== */
  const openNew = () => {
    setEditingUser(emptyUser());
    setDbCreds(emptyDb());
    setDbCheck(null);
    setGeneratedKey('');
    setKeyCopied(false);
    setIsDialogOpen(true);
  };

  const openEdit = async (user: ProUser) => {
    setEditingUser({ ...user });
    setDbCreds(emptyDb());
    setDbCheck(null);
    setGeneratedKey('');
    setKeyCopied(false);
    setIsDialogOpen(true);

    // Load stored DB credentials
    if (user.id) {
      setDbLoading(true);
      try {
        const stored = await api.getProUserDb(user.id);
        if (stored) {
          setDbCreds((prev) => ({ ...prev, ...stored, db_pass: '' }));
        }
      } catch {
        /* ignore */
      } finally {
        setDbLoading(false);
      }
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    setDbCheck(null);
  };

  /* ====================================================
     SAVE USER
  ==================================================== */
  const saveUser = async () => {
    if (!editingUser) return;
    try {
      setSaving(true);
      if (editingUser.id) {
        await api.updateProUser(editingUser as { id: number } & ProUser);
        toast({ title: 'Succès', description: 'Utilisateur pro mis à jour.' });
      } else {
        const res: any = await api.createProUser(editingUser);
        setEditingUser((prev) => prev ? { ...prev, id: res.id } : null);
        toast({ title: 'Succès', description: 'Utilisateur pro créé.' });
      }
      loadUsers();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  /* ====================================================
     SAVE DB CREDENTIALS
  ==================================================== */
  const saveDbCreds = async () => {
    if (!editingUser?.id) {
      toast({ title: 'Attention', description: "Enregistrez d'abord l'utilisateur pro.", variant: 'destructive' });
      return;
    }
    try {
      setDbSaving(true);
      const payload: any = {
        pro_user_id: editingUser.id,
        db_host: dbCreds.db_host,
        db_name: dbCreds.db_name,
        db_user: dbCreds.db_user,
        db_charset: dbCreds.db_charset,
      };
      if (dbCreds.db_pass) payload.db_pass = dbCreds.db_pass;
      await api.saveProUserDb(payload);
      setDbCreds((prev) => ({ ...prev, db_pass: '' }));
      setDbCheck(null);
      toast({ title: 'Succès', description: 'Identifiants DB enregistrés.' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setDbSaving(false);
    }
  };

  /* ====================================================
     CHECK DB
  ==================================================== */
  const checkDb = async () => {
    if (!editingUser?.id) return;
    setDbChecking(true);
    setDbCheck(null);
    try {
      const result = await api.checkProUserDb(editingUser.id);
      setDbCheck(result as DbCheckResult);
    } catch (err: any) {
      setDbCheck({ status: 'error', message: err.message });
    } finally {
      setDbChecking(false);
    }
  };

  /* ====================================================
     INIT DB
  ==================================================== */
  const initDb = async () => {
    if (!editingUser?.id) return;
    if (!confirm('Initialiser la base de données du professionnel ? Cette opération créera les tables nécessaires.')) return;
    setDbIniting(true);
    try {
      const result: any = await api.initProUserDb(editingUser.id);
      toast({ title: 'Succès', description: result.message || 'Base de données initialisée.' });
      // Re-check
      await checkDb();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setDbIniting(false);
    }
  };

  /* ====================================================
     GENERATE KEY
  ==================================================== */
  const handleGenerateKey = async () => {
    setGeneratingKey(true);
    setKeyCopied(false);
    try {
      const key = await generateSecureKey();
      setGeneratedKey(key);
    } finally {
      setGeneratingKey(false);
    }
  };

  const copyKey = async () => {
    if (!generatedKey) return;
    await navigator.clipboard.writeText(generatedKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2500);
  };

  /* ====================================================
     DELETE
  ==================================================== */
  const deleteUser = async (id: number) => {
    if (!confirm('Supprimer cet utilisateur pro et tous ses identifiants DB ?')) return;
    try {
      await api.deleteProUser(id);
      toast({ title: 'Succès', description: 'Utilisateur pro supprimé.' });
      loadUsers();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  /* ====================================================
     RENDER
  ==================================================== */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Utilisateurs Pro</h1>
          <p className="text-gray-500 mt-1">{users.length} professionnel{users.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadUsers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={openNew} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau pro
          </Button>
        </div>
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Chargement…
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Aucun utilisateur pro</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Nom</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Société</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Statut</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-sm">{u.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{u.email}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{u.company_name || '—'}</td>
                    <td className="px-6 py-3">
                      <Badge className={u.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                        {u.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => deleteUser(u.id!)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Edit / Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-orange-500" />
              {editingUser?.id ? 'Modifier l\'utilisateur pro' : 'Nouvel utilisateur pro'}
            </DialogTitle>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-6 pt-2">

              {/* ── Infos générales ───────────────────────────── */}
              <section className="space-y-4">
                <h3 className="font-semibold text-gray-700 border-b pb-1">Informations générales</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Nom *</Label>
                    <Input value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} placeholder="Prénom Nom" />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input type="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} placeholder="email@exemple.com" />
                  </div>
                  <div>
                    <Label>Société</Label>
                    <Input value={editingUser.company_name} onChange={(e) => setEditingUser({ ...editingUser, company_name: e.target.value })} placeholder="Nom de la société" />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input value={editingUser.phone} onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })} placeholder="+230 xxx xxxx" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={editingUser.is_active}
                    onCheckedChange={(v) => setEditingUser({ ...editingUser, is_active: v })}
                  />
                  <Label>Utilisateur actif</Label>
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveUser} disabled={saving || !editingUser.name || !editingUser.email} className="bg-orange-500 hover:bg-orange-600">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingUser.id ? 'Mettre à jour' : 'Créer'}
                  </Button>
                </div>
              </section>

              {/* ── Base de données ──────────────────────────── */}
              <section className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <Database className="h-4 w-4 text-orange-500" />
                  Base de données du professionnel
                </h3>

                {dbLoading ? (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /> Chargement des identifiants…
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Hôte DB</Label>
                      <Input value={dbCreds.db_host} onChange={(e) => setDbCreds({ ...dbCreds, db_host: e.target.value })} placeholder="localhost" />
                    </div>
                    <div>
                      <Label>Nom de la base</Label>
                      <Input value={dbCreds.db_name} onChange={(e) => setDbCreds({ ...dbCreds, db_name: e.target.value })} placeholder="nom_base" />
                    </div>
                    <div>
                      <Label>Utilisateur DB</Label>
                      <Input value={dbCreds.db_user} onChange={(e) => setDbCreds({ ...dbCreds, db_user: e.target.value })} placeholder="user_db" />
                    </div>
                    <div>
                      <Label>Mot de passe DB</Label>
                      <Input
                        type="password"
                        value={dbCreds.db_pass}
                        onChange={(e) => setDbCreds({ ...dbCreds, db_pass: e.target.value })}
                        placeholder={editingUser.id ? '(laisser vide = conserver)' : 'Mot de passe'}
                        autoComplete="new-password"
                      />
                    </div>
                    <div>
                      <Label>Charset</Label>
                      <Input value={dbCreds.db_charset} onChange={(e) => setDbCreds({ ...dbCreds, db_charset: e.target.value })} placeholder="utf8mb4" />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={saveDbCreds}
                    disabled={dbSaving || !editingUser.id || !dbCreds.db_host || !dbCreds.db_name || !dbCreds.db_user}
                  >
                    {dbSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Enregistrer les identifiants
                  </Button>

                  <Button
                    variant="outline"
                    onClick={checkDb}
                    disabled={dbChecking || !editingUser.id}
                    className="gap-2"
                  >
                    {dbChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                    Vérifier la base de données
                  </Button>
                </div>

                {/* DB check result */}
                {dbCheck && (
                  <div className={`flex items-start gap-3 rounded-lg p-3 text-sm ${
                    dbCheck.status === 'exists'         ? 'bg-green-50 text-green-800 border border-green-200' :
                    dbCheck.status === 'empty'          ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                    dbCheck.status === 'no_credentials' ? 'bg-gray-50 text-gray-600 border border-gray-200' :
                                                          'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {dbCheck.status === 'exists' && <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />}
                    {dbCheck.status === 'empty'  && <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
                    {dbCheck.status === 'error'  && <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
                    {dbCheck.status === 'no_credentials' && <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <p>{dbCheck.message}</p>
                      {dbCheck.status === 'empty' && (
                        <Button
                          size="sm"
                          className="mt-2 bg-orange-500 hover:bg-orange-600"
                          onClick={initDb}
                          disabled={dbIniting}
                        >
                          {dbIniting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
                          Initialiser la base de données
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* ── Clé de sécurité ──────────────────────────── */}
              <section className="space-y-3 border-t pt-4">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <Key className="h-4 w-4 text-orange-500" />
                  Clé de sécurité PRO_DB_ENCRYPTION_KEY
                </h3>
                <p className="text-sm text-gray-500">
                  Génère une clé aléatoire sécurisée (équivalent de&nbsp;
                  <code className="bg-gray-100 px-1 rounded text-xs">openssl rand -base64 32</code>)
                  à ajouter dans le fichier <code className="bg-gray-100 px-1 rounded text-xs">.env</code> du serveur.
                </p>

                <Button variant="outline" onClick={handleGenerateKey} disabled={generatingKey} className="gap-2">
                  {generatingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                  Générer la clé
                </Button>

                {generatedKey && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-gray-900 text-green-400 rounded px-3 py-2 text-xs font-mono break-all select-all">
                        {generatedKey}
                      </code>
                      <Button size="sm" variant="outline" onClick={copyKey} className="flex-shrink-0 gap-1">
                        {keyCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        {keyCopied ? 'Copié !' : 'Copier'}
                      </Button>
                    </div>
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      💡 <strong>Hint :</strong> Copiez cette valeur et ajoutez-la dans le fichier{' '}
                      <code className="font-mono">.env</code> de votre serveur :{' '}
                      <code className="font-mono">PRO_DB_ENCRYPTION_KEY={generatedKey}</code>
                    </p>
                  </div>
                )}
              </section>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
