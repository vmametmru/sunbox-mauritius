import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { useToast } from '@/hooks/use-toast';
import { evaluateModularVariables, ModularVariable, ModularDimensions } from '@/lib/modular-formulas';

interface VariableForm {
  id?: number;
  name: string;
  label: string;
  unit: string;
  formula: string;
  display_order: number;
}

const emptyVariable: VariableForm = {
  name: '',
  label: '',
  unit: '',
  formula: '',
  display_order: 0,
};

const RESERVED_NAMES = ['longueur', 'largeur', 'nombre_etages'];

export default function ModularBOQVariablesPage() {
  const { toast } = useToast();

  const [variables, setVariables] = useState<ModularVariable[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<VariableForm | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Simulator dimensions
  const [longueur, setLongueur]           = useState(10);
  const [largeur, setLargeur]             = useState(8);
  const [nombreEtages, setNombreEtages]   = useState(1);

  useEffect(() => {
    loadVariables();
  }, []);

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

  const simulatorDimensions = useMemo((): ModularDimensions => ({
    longueur,
    largeur,
    nombre_etages: nombreEtages,
  }), [longueur, largeur, nombreEtages]);

  const calculatedValues = useMemo(
    () => evaluateModularVariables(simulatorDimensions, variables),
    [simulatorDimensions, variables]
  );

  const sortedVariables = useMemo(
    () => [...variables].sort((a, b) => a.display_order - b.display_order),
    [variables]
  );

  const availableVarHint = useMemo(() => {
    const base = ['longueur', 'largeur', 'nombre_etages'];
    return [...base, ...sortedVariables.map(v => v.name)].join(', ');
  }, [sortedVariables]);

  const openNew = () => {
    const maxOrder = variables.reduce((max, v) => Math.max(max, v.display_order), 0);
    setEditing({ ...emptyVariable, display_order: maxOrder + 1 });
    setIsDialogOpen(true);
  };

  const openEdit = (v: ModularVariable) => {
    setEditing({
      id: v.id,
      name: v.name,
      label: v.label,
      unit: v.unit,
      formula: v.formula,
      display_order: v.display_order,
    });
    setIsDialogOpen(true);
  };

  const saveVariable = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.formula.trim()) {
      toast({ title: 'Erreur', description: 'Le nom et la formule sont requis', variant: 'destructive' });
      return;
    }
    if (RESERVED_NAMES.includes(editing.name.trim())) {
      toast({ title: 'Erreur', description: 'Ce nom est réservé (dimension de base)', variant: 'destructive' });
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
          id: editing.id,
          name: editing.name,
          label: editing.label,
          unit: editing.unit,
          formula: editing.formula,
          display_order: editing.display_order,
        });
        toast({ title: 'Succès', description: 'Variable mise à jour' });
      } else {
        await api.createModularBOQVariable({
          name: editing.name,
          label: editing.label,
          unit: editing.unit,
          formula: editing.formula,
          display_order: editing.display_order,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Variables de Calcul — Maisons Modulaires</h1>
        <p className="text-muted-foreground">
          Configurez les formules de calcul utilisées pour le BOQ des maisons modulaires.
          Les dimensions de base sont : <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">longueur</code>,{' '}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">largeur</code>,{' '}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">nombre_etages</code>.
        </p>
      </div>

      {/* Simulator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Simulateur
          </CardTitle>
          <CardDescription>Testez les formules avec des dimensions personnalisées</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Longueur (m)</Label>
              <Input
                type="number"
                min="1"
                step="0.1"
                value={longueur}
                onChange={e => setLongueur(parseFloat(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label>Largeur (m)</Label>
              <Input
                type="number"
                min="1"
                step="0.1"
                value={largeur}
                onChange={e => setLargeur(parseFloat(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre d&apos;étages</Label>
              <Input
                type="number"
                min="1"
                max="10"
                step="1"
                value={nombreEtages}
                onChange={e => setNombreEtages(parseInt(e.target.value, 10) || 1)}
              />
            </div>
          </div>

          {/* Results */}
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

      {/* Variables Table */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Variables configurées</h2>
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

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? 'Modifier la Variable' : 'Nouvelle Variable'}
            </DialogTitle>
            <DialogDescription>
              Variables disponibles dans les formules : {availableVarHint}
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
                  Variables de base : longueur, largeur, nombre_etages.
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
