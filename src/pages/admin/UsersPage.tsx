import React, { useEffect, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Users,
  CreditCard,
  Building2,
  TrendingUp,
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
  is_active: true,
};

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
  const { toast } = useToast();

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
    setIsDialogOpen(true);
  };

  const openEditUser = (user: ProUser) => {
    setEditingUser({ ...user, password: '' });
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

  /* ======================================================
     FILTER
  ====================================================== */
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
              placeholder="Rechercher un utilisateur..."
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
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

                <div className="mt-3 space-y-1 text-sm text-gray-600">
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
                </div>

                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-orange-600 border-orange-300 hover:bg-orange-50"
                    onClick={() => buyPackForUser(user.id!, user.name)}
                    disabled={buyingPack === user.id}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {buyingPack === user.id ? 'Ajout...' : 'Ajouter pack (10 000 Rs)'}
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
