import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Calculator, Ruler } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { api } from '@/lib/api';
import type { ModelType, ModelTypeDimension } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { evaluateModularVariables, ModularVariable } from '@/lib/modular-formulas';

/* ─────────────────────────────── Types ─────────────────────────────────── */

interface VariableForm {
  id?: number;
  name: string;
  label: string;
  unit: string;
  formula: string;
  display_order: number;
}

interface DimForm {
  id?: number;
  slug: string;
  label: string;
  unit: string;
  min_value: number;
  max_value: number;
  step: number;
  default_value: number;
  display_order: number;
}

const emptyVariable: VariableForm = {
  name: '', label: '', unit: '', formula: '', display_order: 0,
};

const emptyDim: DimForm = {
  slug: '', label: '', unit: 'm', min_value: 0, max_value: 1000, step: 0.5, default_value: 1, display_order: 0,
};

/* ─────────────────────────────── Component ─────────────────────────────── */

export default function ModularBOQVariablesPage() {
  const { toast } = useToast();

  /* ── Custom model types ── */
  const [customTypes, setCustomTypes]   = useState<ModelType[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>('');

  /* ── Dimensions for selected type ── */
  const [typeDimensions, setTypeDimensions] = useState<ModelTypeDimension[]>([]);
  const [loadingDims, setLoadingDims]       = useState(false);
  const [dimDialog, setDimDialog]           = useState<null | 'create' | 'edit'>(null);
  const [editingDim, setEditingDim]         = useState<DimForm | null>(null);
  const [savingDim, setSavingDim]           = useState(false);

  /* ── Simulator ── */
  const [simValues, setSimValues] = useState<Record<string, number>>({});

  /* ── Formula variables ── */
  const [variables, setVariables]   = useState<ModularVariable[]>([]);
  const [loading, setLoading]       = useState(true);
  const [editing, setEditing]       = useState<VariableForm | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving]         = useState(false);

  /* ─────────────────── Load custom types on mount ──────────────────────── */
  useEffect(() => {
    api.getModelTypes(false).then((types: any) => {
      const t = (Array.isArray(types) ? types : []) as ModelType[];
      setCustomTypes(t);
      if (t.length > 0) setSelectedSlug(t[0].slug);
    }).catch(() => {});
    loadVariables();
  }, []);

  /* ─────────────────── Load dimensions when type changes ──────────────────*/
  useEffect(() => {
    if (!selectedSlug) { setTypeDimensions([]); return; }
    setLoadingDims(true);
    api.getModelTypeDimensions(selectedSlug)
      .then((dims: any) => {
        const d = (Array.isArray(dims) ? dims : []) as ModelTypeDimension[];
        setTypeDimensions(d);
        // Init simulator with default values
        const init: Record<string, number> = {};
        for (const dim of d) init[dim.slug] = dim.default_value ?? 1;
        setSimValues(init);
      })
      .catch(() => setTypeDimensions([]))
      .finally(() => setLoadingDims(false));
  }, [selectedSlug]);

  /* ─────────────────── Load formula variables ──────────────────────────── */
  const loadVariables = async () => {
    try {
      setLoading(true);
      const data = await api.getModularBOQVariables();
      setVariables(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────── Simulator ──────────────────────────────────────── */
  const sortedVariables = useMemo(
    () => [...variables].sort((a, b) => a.display_order - b.display_order),
    [variables]
  );

  const calculatedValues = useMemo(
    () => evaluateModularVariables(simValues, variables),
    [simValues, variables]
  );

  /* ─────────────────── All reserved names (dims from all types) ────────── */
  const reservedNames = useMemo(() => typeDimensions.map(d => d.slug), [typeDimensions]);

  const availableVarHint = useMemo(() => {
    return [...reservedNames, ...sortedVariables.map(v => v.name)].join(', ');
  }, [reservedNames, sortedVariables]);

  /* ─────────────────── Dimension CRUD ─────────────────────────────────── */
  const openNewDim = () => {
    const maxOrder = typeDimensions.reduce((m, d) => Math.max(m, d.display_order), 0);
    setEditingDim({ ...emptyDim, display_order: maxOrder + 1 });
    setDimDialog('create');
  };

  const openEditDim = (d: ModelTypeDimension) => {
    setEditingDim({
      id: d.id, slug: d.slug, label: d.label, unit: d.unit,
      min_value: d.min_value, max_value: d.max_value, step: d.step,
      default_value: d.default_value, display_order: d.display_order,
    });
    setDimDialog('edit');
  };

  const saveDim = async () => {
    if (!editingDim || !selectedSlug) return;
    if (!editingDim.label.trim()) {
      toast({ title: 'Erreur', description: 'Le libellé est requis', variant: 'destructive' });
      return;
    }
    if (dimDialog === 'create' && !editingDim.slug.trim()) {
      toast({ title: 'Erreur', description: 'L\'identifiant est requis', variant: 'destructive' });
      return;
    }
    try {
      setSavingDim(true);
      if (dimDialog === 'edit' && editingDim.id) {
        await api.updateModelTypeDimension({
          id: editingDim.id,
          label: editingDim.label, unit: editingDim.unit,
          min_value: editingDim.min_value, max_value: editingDim.max_value,
          step: editingDim.step, default_value: editingDim.default_value,
          display_order: editingDim.display_order,
        });
        toast({ title: 'Succès', description: 'Dimension mise à jour' });
      } else {
        await api.createModelTypeDimension({
          model_type_slug: selectedSlug,
          slug: editingDim.slug, label: editingDim.label, unit: editingDim.unit,
          min_value: editingDim.min_value, max_value: editingDim.max_value,
          step: editingDim.step, default_value: editingDim.default_value,
          display_order: editingDim.display_order,
        });
        toast({ title: 'Succès', description: 'Dimension créée' });
      }
      setDimDialog(null);
      // Reload dimensions
      const d = await api.getModelTypeDimensions(selectedSlug);
      const dims = (Array.isArray(d) ? d : []) as ModelTypeDimension[];
      setTypeDimensions(dims);
      const init: Record<string, number> = {};
      for (const dim of dims) init[dim.slug] = dim.default_value ?? 1;
      setSimValues(init);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSavingDim(false);
    }
  };

  const deleteDim = async (id: number) => {
    if (!confirm('Supprimer cette dimension ?')) return;
    try {
      await api.deleteModelTypeDimension(id);
      toast({ title: 'Succès', description: 'Dimension supprimée' });
      const d = await api.getModelTypeDimensions(selectedSlug);
      const dims = (Array.isArray(d) ? d : []) as ModelTypeDimension[];
      setTypeDimensions(dims);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  /* ─────────────────── Variable CRUD ──────────────────────────────────── */
  const openNew = () => {
    const maxOrder = variables.reduce((max, v) => Math.max(max, v.display_order), 0);
    setEditing({ ...emptyVariable, display_order: maxOrder + 1 });
    setIsDialogOpen(true);
  };

  const openEdit = (v: ModularVariable) => {
    setEditing({
      id: v.id, name: v.name, label: v.label, unit: v.unit,
      formula: v.formula, display_order: v.display_order,
    });
    setIsDialogOpen(true);
  };

  const saveVariable = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.formula.trim()) {
      toast({ title: 'Erreur', description: 'Le nom et la formule sont requis', variant: 'destructive' });
      return;
    }
    if (reservedNames.includes(editing.name.trim())) {
      toast({ title: 'Erreur', description: 'Ce nom est réservé (identifiant de dimension)', variant: 'destructive' });
      return;
    }
    const duplicate = variables.find(v => v.name === editing.name.trim() && v.id !== editing.id);
    if (duplicate) {
      toast({ title: 'Erreur', description: 'Une variable avec ce nom existe déjà', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      if (editing.id) {
        await api.updateModularBOQVariable({
          id: editing.id, name: editing.name, label: editing.label,
          unit: editing.unit, formula: editing.formula, display_order: editing.display_order,
        });
        toast({ title: 'Succès', description: 'Variable mise à jour' });
      } else {
        await api.createModularBOQVariable({
          name: editing.name, label: editing.label, unit: editing.unit,
          formula: editing.formula, display_order: editing.display_order,
        });
        toast({ title: 'Succès', description: 'Variable créée' });
      }
      setIsDialogOpen(false);
      loadVariables();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteVariable = async (id: number) => {
    if (!confirm('Supprimer cette variable ?')) return;
    try {
      await api.deleteModularBOQVariable(id);
      toast({ title: 'Succès', description: 'Variable supprimée' });
      loadVariables();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const formatValue = (val: number | undefined) => {
    if (val === undefined || val === null) return '—';
    return Number.isInteger(val) ? val.toString() : val.toFixed(2);
  };

  /* ─────────────────── Render ─────────────────────────────────────────── */

  const selectedType = customTypes.find(t => t.slug === selectedSlug);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Variables de Calcul</h1>
        <p className="text-muted-foreground">
          Configurez les <strong>dimensions</strong> saisies par le client et les <strong>formules de calcul</strong>
          {' '}utilisées pour le BOQ des types de solutions personnalisés.
        </p>
      </div>

      {/* ── Dimensions par type ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Dimensions par type de modèle
          </CardTitle>
          <CardDescription>
            Définissez les dimensions que le client devra saisir pour chaque type personnalisé
            (ex. Longueur + Hauteur pour un mur, Longueur + Largeur pour un kiosque).
            Ces identifiants deviennent disponibles dans les formules de calcul ci-dessous.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Type selector */}
          {customTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Aucun type personnalisé configuré. Créez-en un dans{' '}
              <a href="#/admin/model-types" className="underline text-orange-600">Types de Solutions</a>.
            </p>
          ) : (
            <div className="flex items-center gap-3">
              <Label className="whitespace-nowrap">Type de modèle</Label>
              <Select value={selectedSlug} onValueChange={setSelectedSlug}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Sélectionner un type…" />
                </SelectTrigger>
                <SelectContent>
                  {customTypes.map(t => (
                    <SelectItem key={t.slug} value={t.slug}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dimensions table */}
          {selectedSlug && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Dimensions pour <strong>{selectedType?.name ?? selectedSlug}</strong>
                  {' '}({typeDimensions.length} configurée{typeDimensions.length !== 1 ? 's' : ''})
                </p>
                <Button size="sm" onClick={openNewDim} className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="h-4 w-4 mr-1" /> Ajouter
                </Button>
              </div>

              {loadingDims ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Chargement…</p>
              ) : typeDimensions.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-lg">
                  <Ruler className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune dimension configurée pour ce type.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cliquez sur "Ajouter" pour définir les dimensions à saisir par le client.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Identifiant</TableHead>
                      <TableHead>Libellé</TableHead>
                      <TableHead>Unité</TableHead>
                      <TableHead>Min</TableHead>
                      <TableHead>Max</TableHead>
                      <TableHead>Pas</TableHead>
                      <TableHead>Défaut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...typeDimensions].sort((a, b) => a.display_order - b.display_order).map(d => (
                      <TableRow key={d.id}>
                        <TableCell>{d.display_order}</TableCell>
                        <TableCell className="font-mono text-sm text-orange-700">{d.slug}</TableCell>
                        <TableCell>{d.label}</TableCell>
                        <TableCell>{d.unit || '—'}</TableCell>
                        <TableCell>{d.min_value}</TableCell>
                        <TableCell>{d.max_value}</TableCell>
                        <TableCell>{d.step}</TableCell>
                        <TableCell>{d.default_value}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEditDim(d)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteDim(d.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Simulator ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Simulateur
          </CardTitle>
          <CardDescription>
            Testez les formules avec des valeurs de dimensions pour le type sélectionné
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {typeDimensions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Configurez des dimensions ci-dessus pour utiliser le simulateur.
            </p>
          ) : (
            <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${Math.min(typeDimensions.length, 4)}, minmax(0, 1fr))` }}>
              {[...typeDimensions].sort((a, b) => a.display_order - b.display_order).map(dim => (
                <div key={dim.slug} className="space-y-2">
                  <Label>{dim.label}{dim.unit ? ` (${dim.unit})` : ''}</Label>
                  <Input
                    type="number"
                    min={dim.min_value}
                    max={dim.max_value}
                    step={dim.step}
                    value={simValues[dim.slug] ?? dim.default_value}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      setSimValues(prev => ({ ...prev, [dim.slug]: isNaN(v) ? 0 : v }));
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {variables.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {sortedVariables.map(v => (
                <div key={v.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-mono text-blue-700">{v.name}</p>
                  <p className="text-sm text-gray-700">{v.label}</p>
                  <p className="text-lg font-bold text-blue-800">
                    {formatValue(calculatedValues[v.name])}
                    {v.unit && <span className="text-xs font-normal ml-1 text-gray-500">{v.unit}</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Variables Table ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Variables de calcul configurées</h2>
        <Button onClick={openNew} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une Variable
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Chargement…</p>
          ) : sortedVariables.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucune variable configurée</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Nom (identifiant)</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead>Formule</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVariables.map(v => (
                  <TableRow key={v.id}>
                    <TableCell>{v.display_order}</TableCell>
                    <TableCell className="font-mono text-sm">{v.name}</TableCell>
                    <TableCell>{v.label}</TableCell>
                    <TableCell>{v.unit || '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-600">{v.formula}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(v)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteVariable(v.id)}>
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

      {/* ── Dimension Dialog ── */}
      <Dialog open={dimDialog !== null} onOpenChange={open => { if (!open) setDimDialog(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dimDialog === 'create' ? 'Nouvelle dimension' : 'Modifier la dimension'}
            </DialogTitle>
            <DialogDescription>
              {dimDialog === 'create'
                ? `Dimension pour le type "${selectedType?.name ?? selectedSlug}"`
                : `Modification de "${editingDim?.label}"`}
            </DialogDescription>
          </DialogHeader>

          {editingDim && (
            <div className="space-y-4">
              {dimDialog === 'create' && (
                <div className="space-y-2">
                  <Label>Identifiant *</Label>
                  <Input
                    value={editingDim.slug}
                    onChange={e => setEditingDim({ ...editingDim, slug: e.target.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                    placeholder="ex: longueur, hauteur, largeur"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Identifiant unique utilisé dans les formules. Lettres minuscules, chiffres et underscore.
                  </p>
                </div>
              )}
              {dimDialog === 'edit' && (
                <div className="space-y-1">
                  <Label>Identifiant</Label>
                  <p className="font-mono text-sm bg-gray-50 border rounded px-3 py-2 text-gray-700">{editingDim.slug}</p>
                  <p className="text-xs text-amber-600">⚠ L'identifiant ne peut pas être modifié (référencé dans les formules).</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Libellé *</Label>
                <Input
                  value={editingDim.label}
                  onChange={e => setEditingDim({ ...editingDim, label: e.target.value })}
                  placeholder="ex: Longueur, Hauteur, Nombre d'étages"
                />
              </div>

              <div className="space-y-2">
                <Label>Unité</Label>
                <Input
                  value={editingDim.unit}
                  onChange={e => setEditingDim({ ...editingDim, unit: e.target.value })}
                  placeholder="ex: m, cm, (vide si sans unité)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valeur min</Label>
                  <Input type="number" value={editingDim.min_value}
                    onChange={e => setEditingDim({ ...editingDim, min_value: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Valeur max</Label>
                  <Input type="number" value={editingDim.max_value}
                    onChange={e => setEditingDim({ ...editingDim, max_value: parseFloat(e.target.value) || 1000 })} />
                </div>
                <div className="space-y-2">
                  <Label>Pas (step)</Label>
                  <Input type="number" step="0.01" value={editingDim.step}
                    onChange={e => setEditingDim({ ...editingDim, step: parseFloat(e.target.value) || 0.5 })} />
                </div>
                <div className="space-y-2">
                  <Label>Valeur par défaut</Label>
                  <Input type="number" step="0.01" value={editingDim.default_value}
                    onChange={e => setEditingDim({ ...editingDim, default_value: parseFloat(e.target.value) || 1 })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ordre d&apos;affichage</Label>
                <Input type="number" min="0" value={editingDim.display_order}
                  onChange={e => setEditingDim({ ...editingDim, display_order: parseInt(e.target.value, 10) || 0 })} />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDimDialog(null)}>Annuler</Button>
                <Button onClick={saveDim} disabled={savingDim || !editingDim.label.trim()}
                  className="bg-orange-500 hover:bg-orange-600">
                  {savingDim ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Variable Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? 'Modifier la Variable' : 'Nouvelle Variable'}
            </DialogTitle>
            <DialogDescription>
              Variables disponibles dans les formules : {availableVarHint || '(configurez des dimensions d\'abord)'}
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom (identifiant) *</Label>
                <Input
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                  placeholder="ex: surface_plancher_m2"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Identifiant unique utilisé dans les formules. Lettres minuscules, chiffres et underscore uniquement.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Libellé *</Label>
                <Input
                  value={editing.label}
                  onChange={e => setEditing({ ...editing, label: e.target.value })}
                  placeholder="ex: Surface Plancher M2"
                />
              </div>

              <div className="space-y-2">
                <Label>Unité</Label>
                <Input
                  value={editing.unit}
                  onChange={e => setEditing({ ...editing, unit: e.target.value })}
                  placeholder="ex: m², m³, m"
                />
              </div>

              <div className="space-y-2">
                <Label>Formule *</Label>
                <Textarea
                  value={editing.formula}
                  onChange={e => setEditing({ ...editing, formula: e.target.value })}
                  placeholder="ex: longueur * largeur"
                  className="font-mono text-sm"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Supports : +, -, *, /, parenthèses, CEIL(), FLOOR(), ROUND(), IF(cond, a, b).
                  Dimensions disponibles : {reservedNames.join(', ') || '(aucune configurée pour ce type)'}.
                </p>
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
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                <Button
                  onClick={saveVariable}
                  disabled={saving || !editing.name.trim() || !editing.formula.trim()}
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
