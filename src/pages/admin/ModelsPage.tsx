import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  Home,
  Droplets,
  Settings
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
  container_20ft_count?: number;
  container_40ft_count?: number;
  pool_shape?: 'Rectangulaire' | 'T' | 'L';
  has_overflow?: boolean;
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
  container_20ft_count: 0,
  container_40ft_count: 0,
  pool_shape: 'Rectangulaire',
  has_overflow: false,
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

  return (
    <div className="space-y-6">
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
                    <div>
                      <Label>Conteneurs 20'</Label>
                      <Input
                        type="number"
                        value={editingModel.container_20ft_count || 0}
                        onChange={(e) => setEditingModel({ ...editingModel, container_20ft_count: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Conteneurs 40'</Label>
                      <Input
                        type="number"
                        value={editingModel.container_40ft_count || 0}
                        onChange={(e) => setEditingModel({ ...editingModel, container_40ft_count: Number(e.target.value) })}
                      />
                    </div>
                  </>
                )}

                {editingModel.type === 'pool' && (
                  <>
                    <div>
                      <Label>Forme</Label>
                      <Select
                        value={editingModel.pool_shape || 'Rectangulaire'}
                        onValueChange={(v) => setEditingModel({ ...editingModel, pool_shape: v as any })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Rectangulaire">Rectangulaire</SelectItem>
                          <SelectItem value="T">T Shape</SelectItem>
                          <SelectItem value="L">L Shape</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingModel.has_overflow || false}
                        onCheckedChange={(v) => setEditingModel({ ...editingModel, has_overflow: v })}
                      />
                      <Label>Avec débordement</Label>
                    </div>
                  </>
                )}

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
