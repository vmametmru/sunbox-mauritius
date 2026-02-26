import React, { useEffect, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Users,
  ShieldCheck,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  id?: number;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'sales';
  is_active?: boolean;
  password?: string;
  last_login?: string | null;
  created_at?: string;
}

const emptyUser: AdminUser = {
  email: '',
  name: '',
  role: 'sales',
  is_active: true,
  password: '',
};

const roleLabels: Record<string, string> = {
  admin: 'Administrateur',
  manager: 'Manager',
  sales: 'Commercial',
};

const roleBadgeClass: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  sales: 'bg-green-100 text-green-700',
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const openNewUser = () => {
    setEditingUser({ ...emptyUser });
    setIsDialogOpen(true);
  };

  const openEditUser = (user: AdminUser) => {
    setEditingUser({ ...user, password: '' });
    setIsDialogOpen(true);
  };

  const saveUser = async () => {
    if (!editingUser) return;
    try {
      setSaving(true);
      if (editingUser.id) {
        await api.updateUser({
          id: editingUser.id,
          email: editingUser.email,
          name: editingUser.name,
          role: editingUser.role,
          is_active: editingUser.is_active,
          password: editingUser.password || undefined,
        });
        toast({ title: 'Succès', description: 'Utilisateur mis à jour.' });
      } else {
        if (!editingUser.password) {
          toast({ title: 'Erreur', description: 'Le mot de passe est requis.', variant: 'destructive' });
          return;
        }
        await api.createUser({
          email: editingUser.email,
          name: editingUser.name,
          password: editingUser.password,
          role: editingUser.role,
          is_active: editingUser.is_active,
        });
        toast({ title: 'Succès', description: 'Utilisateur créé.' });
      }
      setIsDialogOpen(false);
      loadUsers();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user: AdminUser) => {
    if (!user.id) return;
    if (!confirm(`Supprimer l'utilisateur "${user.name}" ?`)) return;
    try {
      await api.deleteUser(user.id);
      toast({ title: 'Succès', description: 'Utilisateur supprimé.' });
      loadUsers();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-orange-500" />
            Utilisateurs
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gérez les comptes utilisateurs de l'administration
          </p>
        </div>
        <Button onClick={openNewUser} className="bg-orange-500 hover:bg-orange-600 gap-2">
          <Plus className="h-4 w-4" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher..."
          className="pl-9"
        />
      </div>

      {/* List */}
      {loading ? (
        <p className="text-gray-400 text-sm">Chargement...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm">Aucun utilisateur trouvé.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      {user.last_login && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Dernière connexion :{' '}
                          {new Date(user.last_login).toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadgeClass[user.role] ?? ''}`}
                    >
                      {roleLabels[user.role] ?? user.role}
                    </span>
                    <Badge variant={user.is_active ? 'default' : 'secondary'}>
                      {user.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditUser(user)}
                        className="text-gray-500 hover:text-orange-600"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteUser(user)}
                        className="text-gray-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit / Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser?.id ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
            </DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 mt-2">
              <div>
                <Label>Nom complet</Label>
                <Input
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  placeholder="Jean Dupont"
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  placeholder="jean@sunbox-mauritius.com"
                />
              </div>

              <div>
                <Label>
                  Mot de passe
                  {editingUser.id && (
                    <span className="text-xs text-gray-400 ml-1">(laisser vide = inchangé)</span>
                  )}
                </Label>
                <Input
                  type="password"
                  value={editingUser.password ?? ''}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  placeholder={editingUser.id ? '••••••••' : 'Mot de passe'}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <Label>Rôle</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(val) =>
                    setEditingUser({ ...editingUser, role: val as AdminUser['role'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrateur</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="sales">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingUser.is_active ?? true}
                  onCheckedChange={(checked) =>
                    setEditingUser({ ...editingUser, is_active: checked })
                  }
                />
                <Label>Compte actif</Label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={saveUser}
                  disabled={saving || !editingUser.name || !editingUser.email}
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
