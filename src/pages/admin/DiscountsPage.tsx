import React, { useEffect, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Tag,
  Calendar,
  CheckCircle2,
  XCircle,
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

/* ======================================================
   TYPES
====================================================== */
interface Discount {
  id?: number;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  apply_to: 'base_price' | 'options' | 'both';
  start_date: string;
  end_date: string;
  is_active: boolean;
  model_ids: number[];
}

interface Model {
  id: number;
  name: string;
  type: 'container' | 'pool';
}

const today = () => new Date().toISOString().split('T')[0];

const emptyDiscount = (): Discount => ({
  name: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 0,
  apply_to: 'both',
  start_date: today(),
  end_date: today(),
  is_active: true,
  model_ids: [],
});

/* ======================================================
   HELPERS
====================================================== */
function isActive(d: Discount): boolean {
  if (!d.is_active) return false;
  const now = today();
  return d.start_date <= now && d.end_date >= now;
}

function applyToLabel(v: string) {
  if (v === 'base_price') return 'Prix de base HT';
  if (v === 'options') return 'Options HT';
  return 'Prix de base + Options HT';
}

/* ======================================================
   COMPONENT
====================================================== */
export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  /* ======================================================
     LOAD
  ====================================================== */
  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const [discountsData, modelsData] = await Promise.all([
        api.getDiscounts(),
        api.getModels(undefined, false, false),
      ]);
      setDiscounts(Array.isArray(discountsData) ? discountsData : []);
      setModels(Array.isArray(modelsData) ? modelsData : []);
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
    setEditingDiscount(emptyDiscount());
    setIsDialogOpen(true);
  };

  const openEdit = (d: Discount) => {
    setEditingDiscount({ ...d, model_ids: Array.isArray(d.model_ids) ? [...d.model_ids] : [] });
    setIsDialogOpen(true);
  };

  const save = async () => {
    if (!editingDiscount) return;
    try {
      setSaving(true);
      if (editingDiscount.id) {
        await api.updateDiscount(editingDiscount as any);
        toast({ title: 'Succès', description: 'Remise mise à jour' });
      } else {
        await api.createDiscount(editingDiscount);
        toast({ title: 'Succès', description: 'Remise créée' });
      }
      setIsDialogOpen(false);
      load();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Supprimer cette remise ?')) return;
    try {
      await api.deleteDiscount(id);
      toast({ title: 'Succès', description: 'Remise supprimée' });
      load();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  /* ======================================================
     MODEL CHECKBOX TOGGLE
  ====================================================== */
  const toggleModel = (modelId: number) => {
    if (!editingDiscount) return;
    const ids = editingDiscount.model_ids.map(Number).includes(modelId)
      ? editingDiscount.model_ids.filter((id) => Number(id) !== modelId)
      : [...editingDiscount.model_ids.map(Number), modelId];
    setEditingDiscount({ ...editingDiscount, model_ids: ids });
  };

  /* ======================================================
     RENDER
  ====================================================== */
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Remises</h1>
          <p className="text-gray-500 mt-1">{discounts.length} remise(s) au total</p>
        </div>
        <Button onClick={openNew} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Remise
        </Button>
      </div>

      {loading ? (
        <div className="text-gray-500">Chargement…</div>
      ) : discounts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Tag className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Aucune remise définie. Cliquez sur "Nouvelle Remise" pour commencer.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {discounts.map((d) => {
            const active = isActive(d);
            const associatedModels = models.filter((m) =>
              Array.isArray(d.model_ids) && d.model_ids.map(Number).includes(m.id)
            );
            return (
              <Card key={d.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg leading-tight truncate">{d.name}</h3>
                      {d.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{d.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {active ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-orange-500">
                      {d.discount_type === 'percentage'
                        ? `${d.discount_value}%`
                        : `Rs ${Number(d.discount_value).toLocaleString()}`}
                    </Badge>
                    <Badge variant="outline">{applyToLabel(d.apply_to)}</Badge>
                    {!d.is_active && <Badge variant="secondary">Inactif</Badge>}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>
                      {d.start_date} → {d.end_date}
                    </span>
                  </div>

                  {associatedModels.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {associatedModels.map((m) => (
                        <Badge
                          key={m.id}
                          className={m.type === 'container' ? 'bg-blue-500' : 'bg-cyan-500'}
                        >
                          {m.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Applicable à tous les modèles</p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => remove(d.id!)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDiscount?.id ? 'Modifier la Remise' : 'Nouvelle Remise'}
            </DialogTitle>
          </DialogHeader>

          {editingDiscount && (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <Label>Nom de la remise</Label>
                <Input
                  value={editingDiscount.name}
                  onChange={(e) =>
                    setEditingDiscount({ ...editingDiscount, name: e.target.value })
                  }
                  placeholder="Ex: Promo été 2026"
                />
              </div>

              {/* Description */}
              <div>
                <Label>Description (optionnelle)</Label>
                <Textarea
                  value={editingDiscount.description}
                  onChange={(e) =>
                    setEditingDiscount({ ...editingDiscount, description: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Type */}
                <div>
                  <Label>Type de remise</Label>
                  <Select
                    value={editingDiscount.discount_type}
                    onValueChange={(v: any) =>
                      setEditingDiscount({ ...editingDiscount, discount_type: v })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                      <SelectItem value="fixed">Montant fixe (Rs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Value */}
                <div>
                  <Label>
                    Valeur{' '}
                    {editingDiscount.discount_type === 'percentage' ? '(%)' : '(Rs)'}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step={editingDiscount.discount_type === 'percentage' ? '0.1' : '1'}
                    value={editingDiscount.discount_value}
                    onChange={(e) =>
                      setEditingDiscount({
                        ...editingDiscount,
                        discount_value: Number(e.target.value),
                      })
                    }
                  />
                </div>

                {/* Apply to */}
                <div className="col-span-2">
                  <Label>Appliquer sur</Label>
                  <Select
                    value={editingDiscount.apply_to}
                    onValueChange={(v: any) =>
                      setEditingDiscount({ ...editingDiscount, apply_to: v })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base_price">Prix de base HT uniquement</SelectItem>
                      <SelectItem value="options">Options HT uniquement</SelectItem>
                      <SelectItem value="both">Prix de base HT + Options HT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Start date */}
                <div>
                  <Label>Date de début</Label>
                  <Input
                    type="date"
                    value={editingDiscount.start_date}
                    onChange={(e) =>
                      setEditingDiscount({ ...editingDiscount, start_date: e.target.value })
                    }
                  />
                </div>

                {/* End date */}
                <div>
                  <Label>Date de fin</Label>
                  <Input
                    type="date"
                    value={editingDiscount.end_date}
                    onChange={(e) =>
                      setEditingDiscount({ ...editingDiscount, end_date: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingDiscount.is_active}
                  onCheckedChange={(v) =>
                    setEditingDiscount({ ...editingDiscount, is_active: v })
                  }
                />
                <Label>Remise active</Label>
              </div>

              {/* Model associations */}
              <div>
                <Label className="mb-2 block">
                  Modèles associés{' '}
                  <span className="text-gray-400 font-normal">
                    (laisser vide = applicable à tous)
                  </span>
                </Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-56 overflow-y-auto">
                  {models.length === 0 && (
                    <p className="text-sm text-gray-500">Aucun modèle disponible.</p>
                  )}
                  {['container', 'pool'].map((type) => {
                    const group = models.filter((m) => m.type === type);
                    if (group.length === 0) return null;
                    return (
                      <div key={type}>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                          {type === 'container' ? 'Containers' : 'Piscines'}
                        </p>
                        {group.map((m) => (
                          <div key={m.id} className="flex items-center gap-2 py-0.5">
                            <Checkbox
                              id={`model-${m.id}`}
                              checked={editingDiscount.model_ids.map(Number).includes(m.id)}
                              onCheckedChange={() => toggleModel(m.id)}
                            />
                            <label
                              htmlFor={`model-${m.id}`}
                              className="text-sm cursor-pointer select-none"
                            >
                              {m.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={save}
                  disabled={saving}
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
