import React, { useEffect, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Copy,
  Calculator,
  Package,
  Tag,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
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
import { useSiteSettings, calculateTTC } from '@/hooks/use-site-settings';

/* ======================================================
   TYPES
====================================================== */
interface Model {
  id: number;
  name: string;
  type: 'container' | 'pool';
  base_price: number;
}

interface Supplier {
  id: number;
  name: string;
}

interface BOQCategory {
  id: number;
  model_id: number;
  name: string;
  is_option: boolean;
  display_order: number;
  total_cost_ht: number;
  total_sale_price_ht: number;
  total_profit_ht: number;
}

interface BOQLine {
  id: number;
  category_id: number;
  description: string;
  quantity: number;
  unit: string;
  unit_cost_ht: number;
  supplier_id: number | null;
  supplier_name: string | null;
  margin_percent: number;
  display_order: number;
  total_cost_ht: number;
  sale_price_ht: number;
}

const emptyCategory: Partial<BOQCategory> = {
  name: '',
  is_option: false,
  display_order: 0,
};

const emptyLine: Partial<BOQLine> = {
  description: '',
  quantity: 1,
  unit: 'unité',
  unit_cost_ht: 0,
  supplier_id: null,
  margin_percent: 30,
  display_order: 0,
};

/* ======================================================
   COMPONENT
====================================================== */
export default function BOQPage() {
  const { toast } = useToast();
  const { data: siteSettings } = useSiteSettings();
  const vatRate = Number(siteSettings?.vat_rate) || 15;
  
  const [models, setModels] = useState<Model[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [categories, setCategories] = useState<BOQCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  const [categoryLines, setCategoryLines] = useState<Record<number, BOQLine[]>>({});
  
  // Modals
  const [editingCategory, setEditingCategory] = useState<Partial<BOQCategory> | null>(null);
  const [editingLine, setEditingLine] = useState<Partial<BOQLine> | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isLineDialogOpen, setIsLineDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Clone modal
  const [cloneSourceModelId, setCloneSourceModelId] = useState<number | null>(null);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);

  /* ======================================================
     LOAD DATA
  ====================================================== */
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedModelId) loadCategories();
  }, [selectedModelId]);

  const loadInitialData = async () => {
    try {
      const [modelsData, suppliersData] = await Promise.all([
        api.getModels(undefined, false),
        api.getSuppliers(true),
      ]);
      setModels(modelsData);
      setSuppliers(suppliersData);
      if (modelsData.length > 0) setSelectedModelId(modelsData[0].id);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const loadCategories = async () => {
    if (!selectedModelId) return;
    try {
      const data = await api.getBOQCategories(selectedModelId);
      setCategories(data);
      // Reset expanded categories when switching model
      setExpandedCategories([]);
      setCategoryLines({});
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const loadCategoryLines = async (categoryId: number) => {
    try {
      const data = await api.getBOQLines(categoryId);
      setCategoryLines(prev => ({ ...prev, [categoryId]: data }));
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  /* ======================================================
     CATEGORY CRUD
  ====================================================== */
  const openNewCategory = () => {
    if (!selectedModelId) return;
    setEditingCategory({ ...emptyCategory, model_id: selectedModelId });
    setIsCategoryDialogOpen(true);
  };

  const openEditCategory = (category: BOQCategory) => {
    setEditingCategory({ ...category });
    setIsCategoryDialogOpen(true);
  };

  const saveCategory = async () => {
    if (!editingCategory || !selectedModelId) return;
    try {
      setSaving(true);
      if (editingCategory.id) {
        await api.updateBOQCategory(editingCategory as { id: number; name: string });
        toast({ title: 'Succès', description: 'Catégorie mise à jour' });
      } else {
        await api.createBOQCategory({
          model_id: selectedModelId,
          name: editingCategory.name!,
          is_option: editingCategory.is_option,
          display_order: editingCategory.display_order,
        });
        toast({ title: 'Succès', description: 'Catégorie créée' });
      }
      setIsCategoryDialogOpen(false);
      loadCategories();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm('Supprimer cette catégorie et toutes ses lignes ?')) return;
    try {
      await api.deleteBOQCategory(id);
      toast({ title: 'Succès', description: 'Catégorie supprimée' });
      loadCategories();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  /* ======================================================
     LINE CRUD
  ====================================================== */
  const openNewLine = (categoryId: number) => {
    setEditingLine({ ...emptyLine, category_id: categoryId });
    setEditingCategoryId(categoryId);
    setIsLineDialogOpen(true);
  };

  const openEditLine = (line: BOQLine) => {
    setEditingLine({ ...line });
    setEditingCategoryId(line.category_id);
    setIsLineDialogOpen(true);
  };

  const saveLine = async () => {
    if (!editingLine || !editingCategoryId) return;
    try {
      setSaving(true);
      if (editingLine.id) {
        await api.updateBOQLine(editingLine as { id: number; description: string });
        toast({ title: 'Succès', description: 'Ligne mise à jour' });
      } else {
        await api.createBOQLine({
          category_id: editingCategoryId,
          description: editingLine.description!,
          quantity: editingLine.quantity,
          unit: editingLine.unit,
          unit_cost_ht: editingLine.unit_cost_ht,
          supplier_id: editingLine.supplier_id,
          margin_percent: editingLine.margin_percent,
          display_order: editingLine.display_order,
        });
        toast({ title: 'Succès', description: 'Ligne créée' });
      }
      setIsLineDialogOpen(false);
      loadCategoryLines(editingCategoryId);
      loadCategories(); // Refresh totals
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteLine = async (line: BOQLine) => {
    if (!confirm('Supprimer cette ligne ?')) return;
    try {
      await api.deleteBOQLine(line.id);
      toast({ title: 'Succès', description: 'Ligne supprimée' });
      loadCategoryLines(line.category_id);
      loadCategories(); // Refresh totals
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  /* ======================================================
     CLONE BOQ
  ====================================================== */
  const cloneBOQ = async () => {
    if (!selectedModelId || !cloneSourceModelId) return;
    try {
      setSaving(true);
      const result = await api.cloneBOQ(cloneSourceModelId, selectedModelId);
      toast({
        title: 'Succès',
        description: `${result.cloned_categories} catégories et ${result.cloned_lines} lignes clonées`,
      });
      setIsCloneDialogOpen(false);
      loadCategories();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  /* ======================================================
     EXPAND/COLLAPSE
  ====================================================== */
  const toggleCategory = (categoryId: number) => {
    if (expandedCategories.includes(categoryId)) {
      setExpandedCategories(prev => prev.filter(id => id !== categoryId));
    } else {
      setExpandedCategories(prev => [...prev, categoryId]);
      if (!categoryLines[categoryId]) {
        loadCategoryLines(categoryId);
      }
    }
  };

  /* ======================================================
     CALCULATIONS
  ====================================================== */
  // Base categories (non-options)
  const baseCategories = categories.filter(c => !c.is_option);
  const optionCategories = categories.filter(c => c.is_option);
  
  const totalBasePriceHT = baseCategories
    .reduce((sum, c) => sum + Number(c.total_sale_price_ht || 0), 0);

  const totalBaseCostHT = baseCategories
    .reduce((sum, c) => sum + Number(c.total_cost_ht || 0), 0);

  const totalBaseProfitHT = totalBasePriceHT - totalBaseCostHT;
  const totalBasePriceTTC = calculateTTC(totalBasePriceHT, vatRate);

  // Options
  const totalOptionsPriceHT = optionCategories
    .reduce((sum, c) => sum + Number(c.total_sale_price_ht || 0), 0);

  const totalOptionsCostHT = optionCategories
    .reduce((sum, c) => sum + Number(c.total_cost_ht || 0), 0);

  const totalOptionsProfitHT = totalOptionsPriceHT - totalOptionsCostHT;
  const totalOptionsPriceTTC = calculateTTC(totalOptionsPriceHT, vatRate);

  const formatPrice = (price: number) => `Rs ${Number(price).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  /* ======================================================
     RENDER CATEGORY CARD
  ====================================================== */
  const renderCategoryCard = (category: BOQCategory) => (
    <Card key={category.id}>
      <CardHeader
        className="cursor-pointer hover:bg-gray-50"
        onClick={() => toggleCategory(category.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {expandedCategories.includes(category.id) ? (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-500" />
            )}
            <CardTitle className="text-lg">{category.name}</CardTitle>
            {category.is_option && (
              <Badge variant="secondary">Option</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Coût HT: {formatPrice(category.total_cost_ht)}</p>
              <p className="text-sm text-green-600">Profit HT: {formatPrice(category.total_profit_ht)}</p>
              <p className="font-bold text-orange-600">Vente HT: {formatPrice(category.total_sale_price_ht)}</p>
              <p className="text-sm font-semibold text-blue-600">Vente TTC: {formatPrice(calculateTTC(category.total_sale_price_ht, vatRate))}</p>
            </div>
            
            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
              <Button size="sm" variant="ghost" onClick={() => openEditCategory(category)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteCategory(category.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      {expandedCategories.includes(category.id) && (
        <CardContent className="pt-0">
          <div className="mb-4">
            <Button size="sm" onClick={() => openNewLine(category.id)}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter une ligne
            </Button>
          </div>

          {categoryLines[category.id] && categoryLines[category.id].length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead className="text-right">Coût Unit. HT</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead className="text-right">Marge %</TableHead>
                  <TableHead className="text-right">Coût Total HT</TableHead>
                  <TableHead className="text-right">Prix Vente HT</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryLines[category.id].map(line => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium whitespace-pre-line">{line.description}</TableCell>
                    <TableCell className="text-right">{line.quantity}</TableCell>
                    <TableCell>{line.unit}</TableCell>
                    <TableCell className="text-right">{formatPrice(line.unit_cost_ht)}</TableCell>
                    <TableCell>{line.supplier_name || '-'}</TableCell>
                    <TableCell className="text-right">{line.margin_percent}%</TableCell>
                    <TableCell className="text-right">{formatPrice(line.total_cost_ht)}</TableCell>
                    <TableCell className="text-right font-semibold text-orange-600">
                      {formatPrice(line.sale_price_ht)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEditLine(line)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteLine(line)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 text-sm italic">Aucune ligne dans cette catégorie</p>
          )}
        </CardContent>
      )}
    </Card>
  );

  /* ======================================================
     RENDER
  ====================================================== */
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">BOQ - Bill of Quantities</h1>
          <p className="text-gray-500 mt-1">Gestion des prix de base et options par modèle (TVA: {vatRate}%)</p>
        </div>

        <div className="flex gap-2">
          <Select
            value={selectedModelId?.toString()}
            onValueChange={(v) => setSelectedModelId(Number(v))}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Sélectionner un modèle" />
            </SelectTrigger>
            <SelectContent>
              {models.map(m => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.name} ({m.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={openNewCategory} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" /> Catégorie
          </Button>

          <Button variant="outline" onClick={() => setIsCloneDialogOpen(true)}>
            <Copy className="h-4 w-4 mr-2" /> Cloner
          </Button>
        </div>
      </div>

      {/* BLOCK A: PRIX DE BASE (non-options) */}
      {selectedModelId && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Calculator className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">A. Prix de Base</h2>
          </div>
          
          {/* Summary cards for base prices */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Package className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Coût Total HT</p>
                    <p className="text-xl font-bold text-gray-700">{formatPrice(totalBaseCostHT)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Tag className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Profit HT</p>
                    <p className="text-xl font-bold text-green-600">{formatPrice(totalBaseProfitHT)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Calculator className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Prix Vente HT</p>
                    <p className="text-xl font-bold text-orange-600">{formatPrice(totalBasePriceHT)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calculator className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Prix Vente TTC</p>
                    <p className="text-xl font-bold text-blue-600">{formatPrice(totalBasePriceTTC)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Base categories list */}
          {baseCategories.map(category => renderCategoryCard(category))}

          {baseCategories.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500 italic">Aucune catégorie de base pour ce modèle.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* BLOCK B: OPTIONS */}
      {selectedModelId && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <Settings className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">B. Options</h2>
          </div>
          
          {/* Summary cards for options */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Package className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Coût Total HT</p>
                    <p className="text-xl font-bold text-gray-700">{formatPrice(totalOptionsCostHT)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Tag className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Profit HT</p>
                    <p className="text-xl font-bold text-green-600">{formatPrice(totalOptionsProfitHT)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Calculator className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Prix Vente HT</p>
                    <p className="text-xl font-bold text-orange-600">{formatPrice(totalOptionsPriceHT)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Calculator className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Prix Vente TTC</p>
                    <p className="text-xl font-bold text-purple-600">{formatPrice(totalOptionsPriceTTC)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Options categories list */}
          {optionCategories.map(category => renderCategoryCard(category))}

          {optionCategories.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500 italic">Aucune option pour ce modèle. Créez une catégorie avec "Option" activé.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {categories.length === 0 && selectedModelId && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">Aucune catégorie BOQ pour ce modèle.</p>
            <Button onClick={openNewCategory} className="mt-4 bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" /> Créer la première catégorie
            </Button>
          </CardContent>
        </Card>
      )}

      {/* CATEGORY DIALOG */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory?.id ? 'Modifier la Catégorie' : 'Nouvelle Catégorie'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory?.id 
                ? 'Modifiez les informations de la catégorie BOQ.'
                : 'Créez une nouvelle catégorie pour organiser les lignes BOQ.'}
            </DialogDescription>
          </DialogHeader>

          {editingCategory && (
            <div className="space-y-4">
              <div>
                <Label>Nom de la catégorie *</Label>
                <Input
                  value={editingCategory.name || ''}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, name: e.target.value })
                  }
                  placeholder="Ex: Fondations, Structure, Électricité..."
                />
              </div>

              <div>
                <Label>Ordre d'affichage</Label>
                <Input
                  type="number"
                  value={editingCategory.display_order || 0}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, display_order: Number(e.target.value) })
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingCategory.is_option || false}
                  onCheckedChange={(checked) =>
                    setEditingCategory({ ...editingCategory, is_option: checked })
                  }
                />
                <Label>Catégorie Option (visible dans les options du configurateur)</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={saveCategory}
                  disabled={saving || !editingCategory.name}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* LINE DIALOG */}
      <Dialog open={isLineDialogOpen} onOpenChange={setIsLineDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingLine?.id ? 'Modifier la Ligne' : 'Nouvelle Ligne'}
            </DialogTitle>
            <DialogDescription>
              {editingLine?.id
                ? 'Modifiez les détails de cette ligne BOQ.'
                : 'Ajoutez une nouvelle ligne à cette catégorie BOQ.'}
            </DialogDescription>
          </DialogHeader>

          {editingLine && (
            <div className="space-y-4">
              <div>
                <Label>Description *</Label>
                <Textarea
                  value={editingLine.description || ''}
                  onChange={(e) =>
                    setEditingLine({ ...editingLine, description: e.target.value })
                  }
                  placeholder="Ex: Location machine, Ciment, Main d'oeuvre..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantité</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingLine.quantity || 1}
                    onChange={(e) =>
                      setEditingLine({ ...editingLine, quantity: Number(e.target.value) })
                    }
                  />
                </div>

                <div>
                  <Label>Unité</Label>
                  <Select
                    value={editingLine.unit || 'unité'}
                    onValueChange={(v) => setEditingLine({ ...editingLine, unit: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unité">unité</SelectItem>
                      <SelectItem value="m²">m²</SelectItem>
                      <SelectItem value="m³">m³</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="tonne">tonne</SelectItem>
                      <SelectItem value="jour">jour</SelectItem>
                      <SelectItem value="heure">heure</SelectItem>
                      <SelectItem value="forfait">forfait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Coût Unitaire HT (Rs)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingLine.unit_cost_ht || 0}
                    onChange={(e) =>
                      setEditingLine({ ...editingLine, unit_cost_ht: Number(e.target.value) })
                    }
                  />
                </div>

                <div>
                  <Label>Marge (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingLine.margin_percent || 30}
                    onChange={(e) =>
                      setEditingLine({ ...editingLine, margin_percent: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Fournisseur</Label>
                <Select
                  value={editingLine.supplier_id ? editingLine.supplier_id.toString() : "_none"}
                  onValueChange={(v) =>
                    setEditingLine({ ...editingLine, supplier_id: v === "_none" ? null : Number(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Aucun</SelectItem>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview calculations */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-1">
                <p className="text-sm text-gray-600">
                  Coût Total HT: <span className="font-semibold">
                    {formatPrice((editingLine.quantity || 1) * (editingLine.unit_cost_ht || 0))}
                  </span>
                </p>
                <p className="text-sm text-orange-600">
                  Prix de Vente HT: <span className="font-semibold">
                    {formatPrice(
                      (editingLine.quantity || 1) *
                      (editingLine.unit_cost_ht || 0) *
                      (1 + (editingLine.margin_percent || 30) / 100)
                    )}
                  </span>
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsLineDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={saveLine}
                  disabled={saving || !editingLine.description}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CLONE DIALOG */}
      <Dialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cloner le BOQ d'un autre modèle</DialogTitle>
            <DialogDescription>
              Copiez toutes les catégories et lignes BOQ d'un modèle vers celui actuellement sélectionné.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Cette action copiera toutes les catégories et lignes BOQ d'un modèle source vers le modèle actuellement sélectionné.
            </p>

            <div>
              <Label>Modèle source</Label>
              <Select
                value={cloneSourceModelId ? cloneSourceModelId.toString() : undefined}
                onValueChange={(v) => setCloneSourceModelId(v ? Number(v) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un modèle source" />
                </SelectTrigger>
                <SelectContent>
                  {models
                    .filter(m => m.id !== selectedModelId)
                    .map(m => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name} ({m.type})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCloneDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={cloneBOQ}
                disabled={saving || !cloneSourceModelId}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {saving ? 'Clonage...' : 'Cloner le BOQ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
