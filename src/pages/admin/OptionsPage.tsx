import React, { useEffect, useState } from 'react';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Search
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Option {
  id?: number;
  name: string;
  category: string;
  price: number;
  description: string;
  product_type: 'container' | 'pool' | 'both';
  is_active: boolean;
}

const emptyOption: Option = {
  name: '',
  category: '',
  price: 0,
  description: '',
  product_type: 'both',
  is_active: true,
};

const categories = [
  'Finitions',
  'Électricité',
  'Plomberie',
  'Climatisation',
  'Sécurité',
  'Extérieur',
  'Équipements',
  'Accessoires',
];

export default function OptionsPage() {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingOption, setEditingOption] = useState<Option | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      setLoading(true);
      const result = await api.getOptions();
      if (result.success) {
        setOptions(result.data || []);
      }
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openNewOption = () => {
    setEditingOption({ ...emptyOption });
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
        await api.updateOption(editingOption);
        toast({ title: 'Succès', description: 'Option mise à jour' });
      } else {
        await api.createOption(editingOption);
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
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette option ?')) return;
    
    try {
      await api.deleteOption(id);
      toast({ title: 'Succès', description: 'Option supprimée' });
      loadOptions();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const filteredOptions = options.filter(o => {
    const matchesSearch = o.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || o.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const groupedOptions = filteredOptions.reduce((acc, opt) => {
    const cat = opt.category || 'Autre';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(opt);
    return acc;
  }, {} as Record<string, Option[]>);

  const formatPrice = (price: number) => `Rs ${Number(price).toLocaleString()}`;

  const uniqueCategories = [...new Set(options.map(o => o.category))].filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Options</h1>
          <p className="text-gray-500 mt-1">{options.length} options au total</p>
        </div>
        <Button onClick={openNewOption} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Option
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher une option..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {uniqueCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Options by Category */}
      {Object.entries(groupedOptions).map(([category, opts]) => (
        <Card key={category}>
          <CardContent className="p-0">
            <div className="bg-gray-50 px-6 py-3 border-b">
              <h3 className="font-semibold text-gray-900">{category}</h3>
            </div>
            <div className="divide-y">
              {opts.map((option) => (
                <div key={option.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{option.name}</span>
                      {!option.is_active && (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {option.product_type === 'container' ? 'Container' : 
                         option.product_type === 'pool' ? 'Piscine' : 'Tous'}
                      </Badge>
                    </div>
                    {option.description && (
                      <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-orange-600">{formatPrice(option.price)}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditOption(option)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteOption(option.id!)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {Object.keys(groupedOptions).length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucune option trouvée</p>
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingOption?.id ? 'Modifier l\'Option' : 'Nouvelle Option'}
            </DialogTitle>
          </DialogHeader>
          
          {editingOption && (
            <div className="space-y-4">
              <div>
                <Label>Nom de l'option</Label>
                <Input
                  value={editingOption.name}
                  onChange={(e) => setEditingOption({ ...editingOption, name: e.target.value })}
                  placeholder="Ex: Climatisation"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Catégorie</Label>
                  <Select 
                    value={editingOption.category} 
                    onValueChange={(v) => setEditingOption({ ...editingOption, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Prix (Rs)</Label>
                  <Input
                    type="number"
                    value={editingOption.price}
                    onChange={(e) => setEditingOption({ ...editingOption, price: Number(e.target.value) })}
                  />
                </div>
              </div>
              
              <div>
                <Label>Type de produit</Label>
                <Select 
                  value={editingOption.product_type} 
                  onValueChange={(v: 'container' | 'pool' | 'both') => setEditingOption({ ...editingOption, product_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Tous (Container & Piscine)</SelectItem>
                    <SelectItem value="container">Container uniquement</SelectItem>
                    <SelectItem value="pool">Piscine uniquement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingOption.description}
                  onChange={(e) => setEditingOption({ ...editingOption, description: e.target.value })}
                  rows={2}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingOption.is_active}
                  onCheckedChange={(checked) => setEditingOption({ ...editingOption, is_active: checked })}
                />
                <Label>Option active</Label>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={saveOption} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
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
