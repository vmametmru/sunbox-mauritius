import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  Home,
  Droplets,
  X,
  Expand,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Model {
  id?: number;
  name: string;
  type: 'container' | 'pool';
  description: string;
  base_price: number;
  dimensions: string;
  bedrooms?: number;
  bathrooms?: number;
  image_url: string;
  plan_url?: string;
  features: string[];
  is_active: boolean;
}

const emptyModel: Model = {
  name: '',
  type: 'container',
  description: '',
  base_price: 0,
  dimensions: '',
  bedrooms: 0,
  bathrooms: 0,
  image_url: '',
  plan_url: '',
  features: [],
  is_active: true,
};

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [featuresInput, setFeaturesInput] = useState('');
  const [modalImage, setModalImage] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const data = await api.getModels(undefined, false);
      setModels(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const openNewModel = () => {
    setEditingModel({ ...emptyModel });
    setFeaturesInput('');
    setIsDialogOpen(true);
  };

  const openEditModel = (model: Model) => {
    setEditingModel({ ...model });
    const features = typeof model.features === 'string'
      ? JSON.parse(model.features)
      : model.features;
    setFeaturesInput(Array.isArray(features) ? features.join('\n') : '');
    setIsDialogOpen(true);
  };

  const saveModel = async () => {
    if (!editingModel) return;

    try {
      setSaving(true);
      const modelData = {
        ...editingModel,
        features: featuresInput.split('\n').filter(f => f.trim()),
      };

      if (editingModel.id) {
        await api.updateModel(modelData);
        toast({ title: 'Succès', description: 'Modèle mis à jour' });
      } else {
        await api.createModel(modelData);
        toast({ title: 'Succès', description: 'Modèle créé' });
      }

      setIsDialogOpen(false);
      loadModels();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteModel = async (id: number) => {
    if (!confirm('Supprimer ce modèle ?')) return;

    try {
      await api.deleteModel(id);
      toast({ title: 'Succès', description: 'Modèle supprimé' });
      loadModels();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const filteredModels = models.filter(m => {
    const matchName = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'all' || m.type === typeFilter;
    return matchName && matchType;
  });

  const formatPrice = (price: number) => `Rs ${Number(price).toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Modèles</h1>
          <p className="text-gray-500 mt-1">{models.length} modèles au total</p>
        </div>
        <Button onClick={openNewModel} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Modèle
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un modèle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="container">Containers</SelectItem>
                <SelectItem value="pool">Piscines</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModels.map(model => (
          <Card key={model.id} className="overflow-hidden">
            <div className="relative aspect-video bg-gray-100">
              {model.image_url ? (
                <img
                  src={model.image_url}
                  alt={model.name}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setModalImage(model.image_url)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {model.type === 'container' ? <Home className="h-16 w-16 text-gray-300" /> : <Droplets className="h-16 w-16 text-gray-300" />}
                </div>
              )}
              {model.plan_url && (
                <div className="absolute bottom-2 left-2 bg-white/70 rounded shadow p-1">
                  <img
                    src={model.plan_url}
                    alt="Plan"
                    className="w-12 h-12 object-contain cursor-pointer"
                    onClick={() => setModalImage(model.plan_url)}
                  />
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-2">
                <Badge className={model.type === 'container' ? 'bg-blue-500' : 'bg-cyan-500'}>
                  {model.type === 'container' ? 'Container' : 'Piscine'}
                </Badge>
                {!model.is_active && <Badge variant="secondary">Inactif</Badge>}
              </div>
            </div>
            <CardContent className="p-4">
              <h3 className="font-bold text-lg">{model.name}</h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{model.description}</p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xl font-bold text-orange-600">{formatPrice(model.base_price)}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/configure?id=${model.id}`)}>
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEditModel(model)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteModel(model.id!)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Image modal */}
      {modalImage && (
        <Dialog open={!!modalImage} onOpenChange={() => setModalImage(null)}>
          <DialogContent className="max-w-4xl">
            <img src={modalImage} alt="Agrandissement" className="w-full h-auto object-contain" />
          </DialogContent>
        </Dialog>
      )}

      {/* Create/Edit Model dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingModel?.id ? 'Modifier le Modèle' : 'Nouveau Modèle'}</DialogTitle>
          </DialogHeader>

          {editingModel && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nom</Label>
                  <Input
                    value={editingModel.name}
                    onChange={(e) => setEditingModel({ ...editingModel, name: e.target.value })}
                    placeholder="Studio 20'"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={editingModel.type}
                    onValueChange={(v: 'container' | 'pool') => setEditingModel({ ...editingModel, type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="container">Container</SelectItem>
                      <SelectItem value="pool">Piscine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prix de base (Rs)</Label>
                  <Input
                    type="number"
                    value={editingModel.base_price}
                    onChange={(e) => setEditingModel({ ...editingModel, base_price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Dimensions</Label>
                  <Input
                    value={editingModel.dimensions}
                    onChange={(e) => setEditingModel({ ...editingModel, dimensions: e.target.value })}
                    placeholder="6m x 2.4m"
                  />
                </div>
                {editingModel.type === 'container' && (
                  <>
                    <div>
                      <Label>Chambres</Label>
                      <Input
                        type="number"
                        value={editingModel.bedrooms || 0}
                        onChange={(e) => setEditingModel({ ...editingModel, bedrooms: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Salles de bain</Label>
                      <Input
                        type="number"
                        value={editingModel.bathrooms || 0}
                        onChange={(e) => setEditingModel({ ...editingModel, bathrooms: Number(e.target.value) })}
                      />
                    </div>
                  </>
                )}
                <div className="col-span-2">
                  <Label>Image principale (URL)</Label>
                  <Input
                    value={editingModel.image_url}
                    onChange={(e) => setEditingModel({ ...editingModel, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="col-span-2">
                  <Label>Plan (URL)</Label>
                  <Input
                    value={editingModel.plan_url || ''}
                    onChange={(e) => setEditingModel({ ...editingModel, plan_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editingModel.description}
                    onChange={(e) => setEditingModel({ ...editingModel, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Caractéristiques (une par ligne)</Label>
                  <Textarea
                    value={featuresInput}
                    onChange={(e) => setFeaturesInput(e.target.value)}
                    rows={4}
                    placeholder="Isolation thermique\nFenêtres double vitrage\n..."
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <Switch
                    checked={editingModel.is_active}
                    onCheckedChange={(checked) => setEditingModel({ ...editingModel, is_active: checked })}
                  />
                  <Label>Modèle actif</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                <Button onClick={saveModel} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
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
