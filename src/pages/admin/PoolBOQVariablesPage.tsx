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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { evaluatePoolVariables, PoolVariable, PoolDimensions } from '@/lib/pool-formulas';

/* ======================================================
   TYPES
====================================================== */
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

/* ======================================================
   COMPONENT
====================================================== */
export default function PoolBOQVariablesPage() {
  const { toast } = useToast();

  // Data
  const [variables, setVariables] = useState<PoolVariable[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog
  const [editing, setEditing] = useState<VariableForm | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Simulator shape and dimensions
  const [simulatorShape, setSimulatorShape] = useState<'Rectangulaire' | 'L' | 'T'>('Rectangulaire');
  const [longueur, setLongueur] = useState(8);
  const [largeur, setLargeur] = useState(4);
  const [profondeur, setProfondeur] = useState(1.5);
  // L-shape
  const [longueurLa, setLongueurLa] = useState(8);
  const [largeurLa, setLargeurLa] = useState(4);
  const [profondeurLa, setProfondeurLa] = useState(1.5);
  const [longueurLb, setLongueurLb] = useState(3);
  const [largeurLb, setLargeurLb] = useState(2);
  const [profondeurLb, setProfondeurLb] = useState(1.5);
  // T-shape
  const [longueurTa, setLongueurTa] = useState(8);
  const [largeurTa, setLargeurTa] = useState(4);
  const [profondeurTa, setProfondeurTa] = useState(1.5);
  const [longueurTb, setLongueurTb] = useState(4);
  const [largeurTb, setLargeurTb] = useState(3);
  const [profondeurTb, setProfondeurTb] = useState(1.5);

  /* ======================================================
     LOAD DATA
  ====================================================== */
  useEffect(() => {
    loadVariables();
  }, []);

  const loadVariables = async () => {
    try {
      setLoading(true);
      const data = await api.getPoolBOQVariables();
      setVariables(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     SIMULATOR
  ====================================================== */
  const simulatorDimensions = useMemo((): PoolDimensions => {
    if (simulatorShape === 'L') {
      return {
        longueur: longueurLa,
        largeur: largeurLa,
        profondeur: profondeurLa,
        longueur_la: longueurLa,
        largeur_la: largeurLa,
        profondeur_la: profondeurLa,
        longueur_lb: longueurLb,
        largeur_lb: largeurLb,
        profondeur_lb: profondeurLb,
      };
    }
    if (simulatorShape === 'T') {
      return {
        longueur: longueurTa,
        largeur: largeurTa,
        profondeur: profondeurTa,
        longueur_ta: longueurTa,
        largeur_ta: largeurTa,
        profondeur_ta: profondeurTa,
        longueur_tb: longueurTb,
        largeur_tb: largeurTb,
        profondeur_tb: profondeurTb,
      };
    }
    return { longueur, largeur, profondeur };
  }, [
    simulatorShape,
    longueur, largeur, profondeur,
    longueurLa, largeurLa, profondeurLa, longueurLb, largeurLb, profondeurLb,
    longueurTa, largeurTa, profondeurTa, longueurTb, largeurTb, profondeurTb,
  ]);

  const calculatedValues = useMemo(() => {
    return evaluatePoolVariables(simulatorDimensions, variables);
  }, [simulatorDimensions, variables]);

  /* ======================================================
     CRUD
  ====================================================== */
  const openNew = () => {
    const maxOrder = variables.reduce((max, v) => Math.max(max, v.display_order), 0);
    setEditing({ ...emptyVariable, display_order: maxOrder + 1 });
    setIsDialogOpen(true);
  };

  const openEdit = (v: PoolVariable) => {
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

  const RESERVED_NAMES = [
    'longueur', 'largeur', 'profondeur',
    'longueur_la', 'largeur_la', 'profondeur_la',
    'longueur_lb', 'largeur_lb', 'profondeur_lb',
    'longueur_ta', 'largeur_ta', 'profondeur_ta',
    'longueur_tb', 'largeur_tb', 'profondeur_tb',
  ];

  const saveVariable = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.formula.trim()) {
      toast({ title: 'Erreur', description: 'Le nom et la formule sont requis', variant: 'destructive' });
      return;
    }
    if (RESERVED_NAMES.includes(editing.name.trim())) {
      toast({ title: 'Erreur', description: 'Ce nom est réservé (dimension de la piscine)', variant: 'destructive' });
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
        await api.updatePoolBOQVariable({
          id: editing.id,
          name: editing.name,
          label: editing.label,
          unit: editing.unit,
          formula: editing.formula,
          display_order: editing.display_order,
        });
        toast({ title: 'Succès', description: 'Variable mise à jour' });
      } else {
        await api.createPoolBOQVariable({
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
      await api.deletePoolBOQVariable(id);
      toast({ title: 'Succès', description: 'Variable supprimée' });
      loadVariables();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  /* ======================================================
     HELPERS
  ====================================================== */
  const sortedVariables = useMemo(
    () => [...variables].sort((a, b) => a.display_order - b.display_order),
    [variables]
  );

  const availableVarHint = useMemo(() => {
    const dims = ['longueur', 'largeur', 'profondeur'];
    const lDims = ['longueur_la', 'largeur_la', 'profondeur_la', 'longueur_lb', 'largeur_lb', 'profondeur_lb'];
    const tDims = ['longueur_ta', 'largeur_ta', 'profondeur_ta', 'longueur_tb', 'largeur_tb', 'profondeur_tb'];
    const varNames = sortedVariables.map(v => v.name);
    return [...dims, ...lDims, ...tDims, ...varNames].join(', ');
  }, [sortedVariables]);

  const formatValue = (val: number | undefined) => {
    if (val === undefined || val === null) return '—';
    return Number.isInteger(val) ? val.toString() : val.toFixed(2);
  };

  /* ======================================================
     RENDER
  ====================================================== */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Variables de Calcul Piscine</h1>
        <p className="text-muted-foreground">
          Configurez les formules de calcul utilisées pour le BOQ des piscines
        </p>
      </div>

      {/* Simulator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Simulateur
          </CardTitle>
          <CardDescription>
            Testez les formules avec des dimensions personnalisées
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Shape selector */}
          <div className="space-y-2">
            <Label>Forme de piscine</Label>
            <Select value={simulatorShape} onValueChange={(v) => setSimulatorShape(v as 'Rectangulaire' | 'L' | 'T')}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Rectangulaire">Rectangulaire</SelectItem>
                <SelectItem value="L">En L</SelectItem>
                <SelectItem value="T">En T</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rectangular dimensions */}
          {simulatorShape === 'Rectangulaire' && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Longueur (m)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={longueur}
                  onChange={e => setLongueur(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Largeur (m)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={largeur}
                  onChange={e => setLargeur(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Profondeur (m)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={profondeur}
                  onChange={e => setProfondeur(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          )}

          {/* L-shape dimensions */}
          {simulatorShape === 'L' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-medium">Partie LA (piscine principale)</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Longueur LA (m)</Label>
                  <Input type="number" step="0.1" min="0" value={longueurLa}
                    onChange={e => setLongueurLa(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Largeur LA (m)</Label>
                  <Input type="number" step="0.1" min="0" value={largeurLa}
                    onChange={e => setLargeurLa(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Profondeur LA (m)</Label>
                  <Input type="number" step="0.1" min="0" value={profondeurLa}
                    onChange={e => setProfondeurLa(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-medium">Partie LB (bout qui dépasse)</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Longueur LB (m)</Label>
                  <Input type="number" step="0.1" min="0" value={longueurLb}
                    onChange={e => setLongueurLb(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Largeur LB (m)</Label>
                  <Input type="number" step="0.1" min="0" value={largeurLb}
                    onChange={e => setLargeurLb(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Profondeur LB (m)</Label>
                  <Input type="number" step="0.1" min="0" value={profondeurLb}
                    onChange={e => setProfondeurLb(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>
          )}

          {/* T-shape dimensions */}
          {simulatorShape === 'T' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-medium">Partie TA (piscine 1)</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Longueur TA (m)</Label>
                  <Input type="number" step="0.1" min="0" value={longueurTa}
                    onChange={e => setLongueurTa(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Largeur TA (m)</Label>
                  <Input type="number" step="0.1" min="0" value={largeurTa}
                    onChange={e => setLargeurTa(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Profondeur TA (m)</Label>
                  <Input type="number" step="0.1" min="0" value={profondeurTa}
                    onChange={e => setProfondeurTa(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-medium">Partie TB (piscine 2)</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Longueur TB (m)</Label>
                  <Input type="number" step="0.1" min="0" value={longueurTb}
                    onChange={e => setLongueurTb(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Largeur TB (m)</Label>
                  <Input type="number" step="0.1" min="0" value={largeurTb}
                    onChange={e => setLargeurTb(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Profondeur TB (m)</Label>
                  <Input type="number" step="0.1" min="0" value={profondeurTb}
                    onChange={e => setProfondeurTb(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>
          )}

          {sortedVariables.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variable</TableHead>
                  <TableHead>Formule</TableHead>
                  <TableHead className="text-right">Valeur calculée</TableHead>
                  <TableHead>Unité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVariables.map(v => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.label || v.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{v.formula}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatValue(calculatedValues[v.name])}
                    </TableCell>
                    <TableCell>{v.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Variables Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Variables</CardTitle>
            <CardDescription>
              Liste des variables de calcul pour les formules du BOQ piscine
            </CardDescription>
          </div>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une Variable
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Chargement…</p>
          ) : sortedVariables.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucune variable configurée</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Ordre</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Label</TableHead>
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
                    <TableCell>{v.unit}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground max-w-[300px] truncate">
                      {v.formula}
                    </TableCell>
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

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Modifier la Variable' : 'Nouvelle Variable'}</DialogTitle>
            <DialogDescription>
              {editing?.id
                ? 'Modifiez les propriétés de la variable de calcul'
                : 'Créez une nouvelle variable de calcul pour le BOQ piscine'}
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom (clé)</Label>
                <Input
                  placeholder="ex: surface_m2"
                  value={editing.name}
                  onChange={e =>
                    setEditing({
                      ...editing,
                      name: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Identifiant unique, sans espaces, en minuscules
                </p>
              </div>

              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  placeholder="ex: Surface (m²)"
                  value={editing.label}
                  onChange={e => setEditing({ ...editing, label: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Unité</Label>
                <Input
                  placeholder="ex: m², m³, m"
                  value={editing.unit}
                  onChange={e => setEditing({ ...editing, unit: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Formule</Label>
                <Textarea
                  placeholder="ex: longueur * largeur"
                  value={editing.formula}
                  onChange={e => setEditing({ ...editing, formula: e.target.value })}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Variables disponibles : {availableVarHint}
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

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={saveVariable} disabled={saving}>
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
