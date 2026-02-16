import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Edit, Trash2, DollarSign, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

/* ======================================================
   TYPES
====================================================== */
interface PriceListItem {
  id: number;
  name: string;
  unit: string;
  unit_price: number;
  has_vat: boolean;
  supplier_id: number | null;
  supplier_name: string | null;
  display_order: number;
}

interface Supplier {
  id: number;
  name: string;
}

interface PriceListForm {
  id?: number;
  name: string;
  unit: string;
  unit_price: number;
  has_vat: boolean;
  supplier_id: number | null;
  display_order: number;
}

const UNITS = [
  'unité', 'jour', 'm²', 'm³', 'tonne', 'barre',
  'sac', 'forfait', 'planche', 'bouteille', 'kit', 'mètre', 'kg',
];

const emptyForm: PriceListForm = {
  name: '',
  unit: 'unité',
  unit_price: 0,
  has_vat: true,
  supplier_id: null,
  display_order: 0,
};

/* ======================================================
   COMPONENT
====================================================== */
export default function PoolBOQPriceListPage() {
  const { toast } = useToast();

  // Data
  const [items, setItems] = useState<PriceListItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog
  const [editing, setEditing] = useState<PriceListForm | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ======================================================
     LOAD DATA
  ====================================================== */
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [priceData, supplierData] = await Promise.all([
        api.getPoolBOQPriceList(),
        api.getSuppliers(false),
      ]);
      setItems(Array.isArray(priceData) ? priceData : []);
      setSuppliers(Array.isArray(supplierData) ? supplierData : []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     CRUD
  ====================================================== */
  const openNew = () => {
    const maxOrder = items.reduce((max, i) => Math.max(max, i.display_order), 0);
    setEditing({ ...emptyForm, display_order: maxOrder + 1 });
    setIsDialogOpen(true);
  };

  const openEdit = (item: PriceListItem) => {
    setEditing({
      id: item.id,
      name: item.name,
      unit: item.unit,
      unit_price: item.unit_price,
      has_vat: item.has_vat,
      supplier_id: item.supplier_id,
      display_order: item.display_order,
    });
    setIsDialogOpen(true);
  };

  const saveItem = async () => {
    if (!editing) return;

    try {
      setSaving(true);
      if (editing.id) {
        await api.updatePoolBOQPriceListItem({
          id: editing.id,
          name: editing.name,
          unit: editing.unit,
          unit_price: editing.unit_price,
          has_vat: editing.has_vat,
          supplier_id: editing.supplier_id,
          display_order: editing.display_order,
        });
        toast({ title: 'Succès', description: 'Article mis à jour' });
      } else {
        await api.createPoolBOQPriceListItem({
          name: editing.name,
          unit: editing.unit,
          unit_price: editing.unit_price,
          has_vat: editing.has_vat,
          supplier_id: editing.supplier_id,
          display_order: editing.display_order,
        });
        toast({ title: 'Succès', description: 'Article créé' });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: number) => {
    if (!confirm('Supprimer cet article ?')) return;

    try {
      await api.deletePoolBOQPriceListItem(id);
      toast({ title: 'Succès', description: 'Article supprimé' });
      loadData();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  /* ======================================================
     HELPERS
  ====================================================== */
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.display_order - b.display_order),
    [items]
  );

  const vatCount = items.filter(i => i.has_vat).length;
  const noVatCount = items.filter(i => !i.has_vat).length;

  const formatPrice = (price: number) =>
    `Rs ${price.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

  /* ======================================================
     RENDER
  ====================================================== */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Base de Prix Piscine</h1>
          <p className="text-muted-foreground">
            Gérez les prix unitaires des matériaux et services pour les BOQ piscines
          </p>
        </div>
        <Button onClick={openNew} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un Article
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avec TVA</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vatCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sans TVA</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{noVatCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Price List Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Chargement…</p>
          ) : sortedItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun article configuré</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead className="text-right">Prix Unitaire (Rs)</TableHead>
                  <TableHead>TVA</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.display_order}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPrice(item.unit_price)}
                    </TableCell>
                    <TableCell>
                      {item.has_vat ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">OUI</Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">NON</Badge>
                      )}
                    </TableCell>
                    <TableCell>{item.supplier_name || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? 'Modifier l\u2019Article' : 'Nouvel Article'}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Nom de l'article"
                />
              </div>

              <div className="space-y-2">
                <Label>Unité</Label>
                <Select
                  value={editing.unit}
                  onValueChange={val => setEditing({ ...editing, unit: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prix Unitaire (Rs)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editing.unit_price}
                  onChange={e =>
                    setEditing({ ...editing, unit_price: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.has_vat}
                  onCheckedChange={checked =>
                    setEditing({ ...editing, has_vat: checked })
                  }
                />
                <Label>TVA applicable</Label>
              </div>

              <div className="space-y-2">
                <Label>Fournisseur</Label>
                <Select
                  value={editing.supplier_id != null ? String(editing.supplier_id) : 'none'}
                  onValueChange={val =>
                    setEditing({ ...editing, supplier_id: val === 'none' ? null : Number(val) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ordre d&apos;affichage</Label>
                <Input
                  type="number"
                  min="0"
                  value={editing.display_order}
                  onChange={e =>
                    setEditing({ ...editing, display_order: parseInt(e.target.value, 10) || 0 })
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={saveItem}
                  disabled={saving || !editing.name.trim()}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
