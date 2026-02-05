import React, { useEffect, useState } from 'react';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Search,
  Copy
} from 'lucide-react';
import {
  Card,
  CardContent
} from '@/components/ui/card';
import {
  Button
} from '@/components/ui/button';
import {
  Input
} from '@/components/ui/input';
import {
  Badge
} from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Label
} from '@/components/ui/label';
import {
  Textarea
} from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Switch
} from '@/components/ui/switch';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Option {
  id?: number;
  model_id: number;
  category_id: number;
  name: string;
  description: string;
  price: number;
  is_active: boolean;
}

interface Category {
  id: number;
  name: string;
}

interface Model {
  id: number;
  name: string;
  type: 'container' | 'pool';
}

const emptyOption: Option = {
  model_id: 0,
  category_id: 0,
  name: '',
  description: '',
  price: 0,
  is_active: true
};

export default function OptionsPage() {
  const { toast } = useToast();
  const [models, setModels] = useState<Model[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [options, setOptions] = useState<Option[]>([]);

  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [editingOption, setEditingOption] = useState<Option | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copySourceModelId, setCopySourceModelId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedModelId) loadOptions();
  }, [selectedModelId]);

  const loadData = async () => {
    try {
      const [modelsData, categoriesData] = await Promise.all([
        api.getModels(undefined, false),
        api.getOptionCategories()
      ]);
      setModels(modelsData);
      setCategories(categoriesData);
      if (modelsData.length > 0) setSelectedModelId(modelsData[0].id);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const loadOptions = async () => {
    if (!selectedModelId) return;
    try {
      const data = await api.getModelOptions(selectedModelId);
      setOptions(data);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const openNewOption = () => {
    if (!selectedModelId) return;
    setEditingOption({ ...emptyOption, model_id: selectedModelId });
    setIsDialogOpen(true);
  };

  const openEditOption = (option: Option) => {
    setEditingOption({ ...option });
    setIsDialogOpen(true);
  };

  const saveOption = async () => {
    if (!editingOption) return;
    try {
      setSaving(true);
      if (editingOption.id) {
        await api.updateModelOption(editingOption);
        toast({ title: 'Succès', description: 'Option mise à jour' });
      } else {
        await api.createModelOption(editingOption);
        toast({ title: 'Succès', description: 'Option créée' });
      }
      setIsDialogOpen(false);
      loadOptions();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteOption = async (id: number) => {
    if (!confirm('Supprimer cette option ?')) return;
    try {
      await api.deleteModelOption(id);
      toast({ title: 'Succès', description: 'Option supprimée' });
      loadOptions();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const copyOptions = async () => {
    if (!selectedModelId || !copySourceModelId) return;
    try {
      await api.copyModelOptions(copySourceModelId, selectedModelId);
      toast({ title: 'Succès', description: 'Options copiées' });
      loadOptions();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const filteredOptions = options.filter(o => {
    const matchSearch = o.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'all' || o.category_id === Number(categoryFilter);
    return matchSearch && matchCat;
  });

  const groupedOptions = filteredOptions.reduce((acc, opt) => {
    const cat = categories.find(c => c.id === opt.category_id)?.name || 'Autre';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(opt);
    return acc;
  }, {} as Record<string, Option[]>);

  const formatPrice = (price: number) => `Rs ${Number(price).toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Options par Modèle</h1>
          <p className="text-gray-500 mt-1">Total : {options.length}</p>
        </div>

        <div className="flex gap-2">
          <Select value={selectedModelId?.toString()} onValueChange={(v) => setSelectedModelId(Number(v))}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Sélectionner un modèle" />
            </SelectTrigger>
            <SelectContent>
              {models.map(m => (
                <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={openNewOption} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" /> Nouvelle Option
          </Button>
        </div>
      </div>

      {/* COPY FROM ANOTHER MODEL */}
      {selectedModelId && (
        <div className="flex items-center gap-3">
          <Select value={copySourceModelId?.toString() || ''} onValueChange={v => setCopySourceModelId(Number(v))}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Copier les options depuis..." />
            </SelectTrigger>
            <SelectContent>
              {models
                .filter(m => m.id !== selectedModelId)
                .map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={copyOptions} disabled={!copySourceModelId}>
            <Copy className="w-4 h-4 mr-2" /> Copier
          </Button>
        </div>
      )}

      {/* SEARCH + FILTER */}
      <Card><CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <Input placeholder="Recherche..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Filtrer par catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.map(cat => <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      {/* LISTING */}
      {Object.entries(groupedOptions).map(([category, opts]) => (
        <Card key={category}><CardContent className="p-0">
          <div className="bg-gray-100 px-6 py-3 font-semibold border-b">{category}</div>
          <div className="divide-y">
            {opts.map(opt => (
              <div key={opt.id} className="px-6 py-3 flex justify-between items-center hover:bg-gray-50">
                <div>
                  <p className="font-medium">{opt.name}</p>
                  {opt.description && <p className="text-sm text-gray-500 whitespace-pre-line">{opt.description}</p>}
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-orange-600">{formatPrice(opt.price)}</span>
                  {!opt.is_active && <Badge variant="secondary">Inactif</Badge>}
                  <Button size="sm" variant="outline" onClick={() => openEditOption(opt)}><Edit className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteOption(opt.id!)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      ))}

      {/* DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingOption?.id ? 'Modifier' : 'Nouvelle'} Option</DialogTitle></DialogHeader>
          {editingOption && (
            <div className="space-y-4">
              <Label>Nom</Label>
              <Input value={editingOption.name} onChange={e => setEditingOption({ ...editingOption, name: e.target.value })} />

              <Label>Catégorie</Label>
              <Select value={String(editingOption.category_id)} onValueChange={v => setEditingOption({ ...editingOption, category_id: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Label>Prix (Rs)</Label>
              <Input type="number" value={editingOption.price} onChange={e => setEditingOption({ ...editingOption, price: Number(e.target.value) })} />

              <Label>Description</Label>
              <Textarea value={editingOption.description} onChange={e => setEditingOption({ ...editingOption, description: e.target.value })} rows={3} />

              <div className="flex items-center gap-2">
                <Switch checked={editingOption.is_active} onCheckedChange={v => setEditingOption({ ...editingOption, is_active: v })} />
                <Label>Option active</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                <Button onClick={saveOption} disabled={saving} className="bg-orange-500 hover:bg-orange-600">{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
