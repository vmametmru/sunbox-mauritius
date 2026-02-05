import React, { useEffect, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

/* ======================================================
   TYPES
====================================================== */
interface Supplier {
  id?: number;
  name: string;
  city: string;
  phone: string;
  email: string;
  is_active: boolean;
}

const emptySupplier: Supplier = {
  name: '',
  city: '',
  phone: '',
  email: '',
  is_active: true,
};

/* ======================================================
   COMPONENT
====================================================== */
export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  /* ======================================================
     LOAD
  ====================================================== */
  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await api.getSuppliers(false);
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     CRUD
  ====================================================== */
  const openNewSupplier = () => {
    setEditingSupplier({ ...emptySupplier });
    setIsDialogOpen(true);
  };

  const openEditSupplier = (supplier: Supplier) => {
    setEditingSupplier({ ...supplier });
    setIsDialogOpen(true);
  };

  const saveSupplier = async () => {
    if (!editingSupplier) return;

    try {
      setSaving(true);
      if (editingSupplier.id) {
        await api.updateSupplier(editingSupplier as { id: number } & Supplier);
        toast({ title: 'Succès', description: 'Fournisseur mis à jour' });
      } else {
        await api.createSupplier(editingSupplier);
        toast({ title: 'Succès', description: 'Fournisseur créé' });
      }

      setIsDialogOpen(false);
      loadSuppliers();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteSupplier = async (id: number) => {
    if (!confirm('Supprimer ce fournisseur ?')) return;

    try {
      await api.deleteSupplier(id);
      toast({ title: 'Succès', description: 'Fournisseur supprimé' });
      loadSuppliers();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  /* ======================================================
     FILTER
  ====================================================== */
  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ======================================================
     RENDER
  ====================================================== */
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Fournisseurs</h1>
          <p className="text-gray-500 mt-1">{suppliers.length} fournisseurs au total</p>
        </div>
        <Button onClick={openNewSupplier} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Fournisseur
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un fournisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map(supplier => (
          <Card key={supplier.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-bold">{supplier.name}</h3>
                    {!supplier.is_active && <Badge variant="secondary">Inactif</Badge>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEditSupplier(supplier)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteSupplier(supplier.id!)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                {supplier.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {supplier.city}
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {supplier.phone}
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    {supplier.email}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CREATE / EDIT MODAL */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier?.id ? 'Modifier le Fournisseur' : 'Nouveau Fournisseur'}
            </DialogTitle>
          </DialogHeader>

          {editingSupplier && (
            <div className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Input
                  value={editingSupplier.name}
                  onChange={(e) =>
                    setEditingSupplier({ ...editingSupplier, name: e.target.value })
                  }
                  placeholder="Nom du fournisseur"
                />
              </div>

              <div>
                <Label>Ville</Label>
                <Input
                  value={editingSupplier.city}
                  onChange={(e) =>
                    setEditingSupplier({ ...editingSupplier, city: e.target.value })
                  }
                  placeholder="Ville"
                />
              </div>

              <div>
                <Label>Téléphone</Label>
                <Input
                  value={editingSupplier.phone}
                  onChange={(e) =>
                    setEditingSupplier({ ...editingSupplier, phone: e.target.value })
                  }
                  placeholder="+230 xxx xxxx"
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editingSupplier.email}
                  onChange={(e) =>
                    setEditingSupplier({ ...editingSupplier, email: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingSupplier.is_active}
                  onCheckedChange={(checked) =>
                    setEditingSupplier({
                      ...editingSupplier,
                      is_active: checked,
                    })
                  }
                />
                <Label>Fournisseur actif</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={saveSupplier}
                  disabled={saving || !editingSupplier.name}
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
