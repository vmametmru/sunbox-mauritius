import React, { useEffect, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
  Layers,
  GripVertical,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

/* ======================================================
   LUCIDE ICON LIST (subset available for type icons)
====================================================== */
const ICON_OPTIONS = [
  'Box', 'Building2', 'Home', 'Warehouse', 'Store', 'Tent',
  'TreePine', 'Waves', 'Fence', 'Layers', 'Grid', 'LayoutDashboard',
  'Hammer', 'Wrench', 'Package', 'Blocks', 'Sofa', 'Utensils',
  'Star', 'Sparkles', 'Sun', 'Wind', 'Droplets', 'Leaf',
];

/* ======================================================
   TYPE
====================================================== */
interface ModelType {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon_name: string;
  display_order: number;
  is_active: boolean;
}

const emptyType: Omit<ModelType, 'id'> = {
  slug: '',
  name: '',
  description: null,
  icon_name: 'Box',
  display_order: 0,
  is_active: true,
};

/* ======================================================
   SLUG GENERATION HELPER
====================================================== */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/* ======================================================
   COMPONENT
====================================================== */
const ModelTypesPage: React.FC = () => {
  const { toast } = useToast();
  const [types, setTypes] = useState<ModelType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog state: null = closed, 'create' or ModelType for edit
  const [dialog, setDialog] = useState<null | 'create' | ModelType>(null);
  const [form, setForm] = useState<Omit<ModelType, 'id'>>(emptyType);
  const [slugManual, setSlugManual] = useState(false);

  /* ---- load ---- */
  const load = async () => {
    setIsLoading(true);
    try {
      const data = await api.getModelTypes(false);
      setTypes(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* ---- open dialog ---- */
  const openCreate = () => {
    setForm({ ...emptyType, display_order: types.length });
    setSlugManual(false);
    setDialog('create');
  };

  const openEdit = (t: ModelType) => {
    setForm({
      slug: t.slug,
      name: t.name,
      description: t.description,
      icon_name: t.icon_name,
      display_order: t.display_order,
      is_active: t.is_active,
    });
    setSlugManual(true);
    setDialog(t);
  };

  const closeDialog = () => {
    setDialog(null);
    setForm(emptyType);
    setSlugManual(false);
  };

  /* ---- form helpers ---- */
  const handleNameChange = (name: string) => {
    setForm(prev => ({
      ...prev,
      name,
      slug: slugManual ? prev.slug : slugify(name),
    }));
  };

  /* ---- save ---- */
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Erreur', description: 'Le nom est obligatoire.', variant: 'destructive' });
      return;
    }
    if (!form.slug.trim()) {
      toast({ title: 'Erreur', description: 'Le slug est obligatoire.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (dialog === 'create') {
        await api.createModelType(form);
        toast({ title: 'Succès', description: `Type "${form.name}" créé.` });
      } else {
        await api.updateModelType({ id: (dialog as ModelType).id, ...form });
        toast({ title: 'Succès', description: `Type "${form.name}" mis à jour.` });
      }
      await load();
      closeDialog();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  /* ---- toggle active ---- */
  const handleToggleActive = async (t: ModelType) => {
    try {
      await api.updateModelType({ id: t.id, is_active: !t.is_active });
      setTypes(prev => prev.map(x => x.id === t.id ? { ...x, is_active: !x.is_active } : x));
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  /* ---- delete ---- */
  const handleDelete = async (t: ModelType) => {
    if (!confirm(`Supprimer le type "${t.name}" ? Cette action est irréversible.`)) return;
    try {
      await api.deleteModelType(t.id);
      toast({ title: 'Supprimé', description: `Type "${t.name}" supprimé.` });
      await load();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  /* ======================================================
     RENDER
  ====================================================== */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-7 w-7 text-orange-500" />
            Types de Solutions
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez les types de solutions personnalisées (ex : Kiosques, Decking, Murs…).
            Chaque type partage la même base de prix et les mêmes variables BOQ.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 gap-2">
          <Plus className="h-4 w-4" />
          Nouveau type
        </Button>
      </div>

      {/* Info box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4 pb-3">
          <p className="text-sm text-blue-800">
            <strong>Fonctionnement :</strong> Chaque type créé ici apparaîtra automatiquement comme un bloc
            dans la page d&apos;accueil et dans la page &ldquo;Nos Solutions&rdquo;.
            Les modèles de ce type utiliseront la <strong>Base de prix personnalisée</strong>,
            les <strong>Variables personnalisées</strong> et le <strong>Modèle BOQ personnalisé</strong>
            (configurables dans le menu Paramètres).
          </p>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : types.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <Layers className="h-16 w-16 text-gray-300" />
            <p className="text-muted-foreground">
              Aucun type personnalisé — créez votre premier type en cliquant sur &ldquo;Nouveau type&rdquo;.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Types configurés ({types.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500">
                  <th className="py-2 px-4 text-left w-8"></th>
                  <th className="py-2 px-4 text-left">Nom</th>
                  <th className="py-2 px-4 text-left hidden sm:table-cell">Slug</th>
                  <th className="py-2 px-4 text-left hidden md:table-cell">Description</th>
                  <th className="py-2 px-4 text-center">Actif</th>
                  <th className="py-2 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {types.map(t => (
                  <tr key={t.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-4 text-gray-400">
                      <GripVertical className="h-4 w-4" />
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.name}</span>
                        {!t.is_active && <Badge variant="secondary" className="text-xs">Inactif</Badge>}
                      </div>
                    </td>
                    <td className="py-2 px-4 hidden sm:table-cell">
                      <code className="text-xs bg-gray-100 px-1 py-0.5 rounded text-gray-700">{t.slug}</code>
                    </td>
                    <td className="py-2 px-4 hidden md:table-cell text-gray-500 max-w-xs truncate">
                      {t.description || <span className="italic">—</span>}
                    </td>
                    <td className="py-2 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(t)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title={t.is_active ? 'Désactiver' : 'Activer'}
                      >
                        {t.is_active
                          ? <Eye className="h-4 w-4 text-green-600" />
                          : <EyeOff className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="py-2 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(t)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(t)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      {dialog !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">
                {dialog === 'create' ? 'Créer un nouveau type' : `Modifier "${(dialog as ModelType).name}"`}
              </h2>
              <Button variant="ghost" size="icon" onClick={closeDialog}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <Label htmlFor="mt-name">Nom du type <span className="text-red-500">*</span></Label>
                <Input
                  id="mt-name"
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Ex: Kiosques, Decking, Murs en béton…"
                  className="mt-1"
                  autoFocus
                />
              </div>

              {/* Slug */}
              <div>
                <Label htmlFor="mt-slug">
                  Slug (identifiant unique){' '}
                  <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-400 ml-2">(généré automatiquement)</span>
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="mt-slug"
                    value={form.slug}
                    onChange={e => {
                      setSlugManual(true);
                      setForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }));
                    }}
                    placeholder="ex: kiosk"
                    className="font-mono text-sm"
                    disabled={dialog !== 'create'}
                    aria-describedby={dialog !== 'create' ? 'slug-locked-hint' : undefined}
                  />
                  {dialog === 'create' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSlugManual(false); setForm(prev => ({ ...prev, slug: slugify(prev.name) })); }}
                      className="text-xs whitespace-nowrap"
                    >
                      ↺ Regénérer
                    </Button>
                  )}
                </div>
                {dialog !== 'create' && (
                  <p id="slug-locked-hint" className="text-xs text-amber-600 mt-1">⚠ Le slug ne peut pas être modifié après la création (clé des modèles associés).</p>
                )}
              </div>

              {/* Icon */}
              <div>
                <Label>Icône</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ICON_OPTIONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, icon_name: icon }))}
                      className={`px-2 py-1 rounded border text-xs transition-colors ${
                        form.icon_name === icon
                          ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium'
                          : 'border-gray-200 hover:border-gray-400 text-gray-600'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="mt-desc">Description <span className="text-gray-400 text-xs">(optionnel)</span></Label>
                <Textarea
                  id="mt-desc"
                  value={form.description ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value || null }))}
                  placeholder="Courte description affichée dans le bloc public…"
                  rows={2}
                  className="mt-1"
                />
              </div>

              {/* Display order */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mt-order">Ordre d&apos;affichage</Label>
                  <Input
                    id="mt-order"
                    type="number"
                    min="0"
                    value={form.display_order}
                    onChange={e => setForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch
                    id="mt-active"
                    checked={form.is_active}
                    onCheckedChange={v => setForm(prev => ({ ...prev, is_active: v }))}
                  />
                  <Label htmlFor="mt-active">Actif</Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 pb-5 border-t pt-4">
              <Button variant="outline" onClick={closeDialog} disabled={saving}>Annuler</Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600 gap-2"
              >
                {saving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Sauvegarde…</>
                  : <><Save className="h-4 w-4" /> Sauvegarder</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelTypesPage;
