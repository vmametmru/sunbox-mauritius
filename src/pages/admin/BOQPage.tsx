import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Settings,
  Image as ImageIcon,
  Waves
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
import {
  evaluatePoolVariables,
  evaluateFormula,
  getDefaultPoolBOQTemplate,
  getDefaultPoolBOQOptionsTemplate,
  type PoolVariable,
  type PoolDimensions,
} from '@/lib/pool-formulas';

const DEFAULT_MARGIN_PERCENT = 30;

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

interface CategoryImage {
  id: number;
  url: string;
}

interface PriceListItem {
  id: number;
  name: string;
  unit: string;
  unit_price: number;
}

interface BOQCategory {
  id: number;
  model_id: number;
  parent_id: number | null;
  name: string;
  is_option: boolean;
  display_order: number;
  image_id: number | null;
  image_url: string | null;
  total_cost_ht: number;
  total_sale_price_ht: number;
  total_profit_ht: number;
}

interface BOQLine {
  id: number;
  category_id: number;
  description: string;
  quantity: number;
  quantity_formula: string | null;
  unit: string;
  unit_cost_ht: number;
  unit_cost_formula: string | null;
  price_list_id: number | null;
  price_list_name: string | null;
  price_list_unit_price: number | null;
  supplier_id: number | null;
  supplier_name: string | null;
  margin_percent: number;
  display_order: number;
  total_cost_ht: number;
  sale_price_ht: number;
}

const emptyCategory: Partial<BOQCategory> = {
  name: '',
  parent_id: null,
  is_option: false,
  display_order: 0,
  image_id: null,
  image_url: null,
};

const emptyLine: Partial<BOQLine> = {
  description: '',
  quantity: 1,
  quantity_formula: null,
  unit: 'unité',
  unit_cost_ht: 0,
  unit_cost_formula: null,
  price_list_id: null,
  supplier_id: null,
  margin_percent: DEFAULT_MARGIN_PERCENT,
  display_order: 0,
};

/* ======================================================
   COMPONENT
====================================================== */
export default function BOQPage() {
  const { toast } = useToast();
  const { data: siteSettings } = useSiteSettings();
  const vatRate = Number(siteSettings?.vat_rate) || 15;
  const [searchParams] = useSearchParams();
  
  const [models, setModels] = useState<Model[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [categories, setCategories] = useState<BOQCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  const [categoryLines, setCategoryLines] = useState<Record<number, BOQLine[]>>({});
  const [categoryImages, setCategoryImages] = useState<CategoryImage[]>([]);
  
  // Modals
  const [editingCategory, setEditingCategory] = useState<Partial<BOQCategory> | null>(null);
  const [editingLine, setEditingLine] = useState<Partial<BOQLine> | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isLineDialogOpen, setIsLineDialogOpen] = useState(false);
  const [isImageSelectorOpen, setIsImageSelectorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Clone modal
  const [cloneSourceModelId, setCloneSourceModelId] = useState<number | null>(null);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);

  // Line dialog: pricing mode and search
  const [pricingMode, setPricingMode] = useState<'manual' | 'pricelist'>('manual');
  const [priceListSearch, setPriceListSearch] = useState('');

  // Pool-specific state
  const [poolDimensions, setPoolDimensions] = useState<PoolDimensions>({
    longueur: 8,
    largeur: 4,
    profondeur: 1.5,
  });
  const [poolVariables, setPoolVariables] = useState<PoolVariable[]>([]);
  const [priceListItems, setPriceListItems] = useState<PriceListItem[]>([]);

  const selectedModel = models.find(m => m.id === selectedModelId);
  const isPoolModel = selectedModel?.type === 'pool';

  // Calculate pool variable values
  const poolVarContext = useMemo(() => {
    if (!isPoolModel || poolVariables.length === 0) return {};
    return evaluatePoolVariables(poolDimensions, poolVariables);
  }, [isPoolModel, poolDimensions, poolVariables]);

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
      const [modelsData, suppliersData, categoryImagesData] = await Promise.all([
        api.getModels(undefined, false),
        api.getSuppliers(true),
        api.getCategoryImages(),
      ]);
      setModels(modelsData);
      setSuppliers(suppliersData);
      setCategoryImages(Array.isArray(categoryImagesData) ? categoryImagesData : []);

      // Load pool BOQ data
      try {
        const [poolVarsData, priceListData] = await Promise.all([
          api.getPoolBOQVariables(),
          api.getPoolBOQPriceList(),
        ]);
        setPoolVariables(Array.isArray(poolVarsData) ? poolVarsData : []);
        setPriceListItems(Array.isArray(priceListData) ? priceListData : []);
      } catch {
        // Tables may not exist yet, ignore
      }
      
      // Check for model param in URL, otherwise use first model
      const modelParam = searchParams.get('model');
      const modelIdFromUrl = modelParam ? parseInt(modelParam, 10) : null;
      const validModelFromUrl = modelIdFromUrl && modelsData.some((m: Model) => m.id === modelIdFromUrl);
      
      if (validModelFromUrl) {
        setSelectedModelId(modelIdFromUrl);
      } else if (modelsData.length > 0) {
        setSelectedModelId(modelsData[0].id);
      }
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
        await api.updateBOQCategory({
          id: editingCategory.id,
          name: editingCategory.name!,
          parent_id: editingCategory.parent_id,
          is_option: editingCategory.is_option,
          display_order: editingCategory.display_order,
          image_id: editingCategory.image_id,
        });
        toast({ title: 'Succès', description: 'Catégorie mise à jour' });
      } else {
        await api.createBOQCategory({
          model_id: selectedModelId,
          name: editingCategory.name!,
          parent_id: editingCategory.parent_id,
          is_option: editingCategory.is_option,
          display_order: editingCategory.display_order,
          image_id: editingCategory.image_id,
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

  const selectCategoryImage = (image: CategoryImage | null) => {
    if (editingCategory) {
      setEditingCategory({
        ...editingCategory,
        image_id: image?.id || null,
        image_url: image?.url || null,
      });
    }
    setIsImageSelectorOpen(false);
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
    setPricingMode('manual');
    setPriceListSearch('');
    setIsLineDialogOpen(true);
  };

  const openEditLine = (line: BOQLine) => {
    setEditingLine({ ...line });
    setEditingCategoryId(line.category_id);
    setPricingMode(line.price_list_id ? 'pricelist' : 'manual');
    setPriceListSearch('');
    setIsLineDialogOpen(true);
  };

  const saveLine = async () => {
    if (!editingLine || !editingCategoryId) return;
    try {
      setSaving(true);
      if (editingLine.id) {
        await api.updateBOQLine({
          id: editingLine.id,
          description: editingLine.description!,
          quantity: editingLine.quantity,
          quantity_formula: editingLine.quantity_formula,
          unit: editingLine.unit,
          unit_cost_ht: editingLine.unit_cost_ht,
          unit_cost_formula: editingLine.unit_cost_formula,
          price_list_id: pricingMode === 'pricelist' ? editingLine.price_list_id : null,
          supplier_id: editingLine.supplier_id,
          margin_percent: editingLine.margin_percent,
          display_order: editingLine.display_order,
        });
        toast({ title: 'Succès', description: 'Ligne mise à jour' });
      } else {
        await api.createBOQLine({
          category_id: editingCategoryId,
          description: editingLine.description!,
          quantity: editingLine.quantity,
          quantity_formula: editingLine.quantity_formula,
          unit: editingLine.unit,
          unit_cost_ht: editingLine.unit_cost_ht,
          unit_cost_formula: editingLine.unit_cost_formula,
          price_list_id: pricingMode === 'pricelist' ? editingLine.price_list_id : null,
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
     GENERATE POOL BOQ FROM TEMPLATE
  ====================================================== */
  const generatePoolBOQ = async () => {
    if (!selectedModelId || !isPoolModel) return;
    const confirmMessage = categories.length > 0
      ? 'ATTENTION: Des catégories existent déjà pour ce modèle.\n\nGénérer le BOQ piscine va AJOUTER de nouvelles catégories, sous-catégories et lignes (cela créera des DOUBLONS si vous avez déjà généré le modèle).\n\nPour éviter les doublons, supprimez d\'abord toutes les catégories existantes.\n\nContinuer ?'
      : 'Générer le BOQ piscine à partir du modèle par défaut ?\nCela va créer toutes les catégories, sous-catégories et lignes avec les formules et prix.';
    if (!confirm(confirmMessage)) return;
    try {
      setSaving(true);
      const baseTemplate = getDefaultPoolBOQTemplate();
      const optionsTemplate = getDefaultPoolBOQOptionsTemplate();
      const allTemplates = [...baseTemplate, ...optionsTemplate];

      // Build a lookup map: price_list_name -> price_list_item
      const priceMap: Record<string, { id: number; unit_price: number; unit: string }> = {};
      for (const p of priceListItems) {
        priceMap[p.name] = { id: p.id, unit_price: p.unit_price, unit: p.unit };
      }

      let createdCategories = 0;
      let createdLines = 0;

      for (const cat of allTemplates) {
        // Create the parent category
        const catResult = await api.createBOQCategory({
          model_id: selectedModelId,
          name: cat.name,
          is_option: cat.is_option,
          display_order: cat.display_order,
          parent_id: null,
        });
        const parentCatId = catResult.id;
        createdCategories++;

        // Create sub-categories and their lines
        for (const subCat of cat.subcategories) {
          const subCatResult = await api.createBOQCategory({
            model_id: selectedModelId,
            name: subCat.name,
            is_option: cat.is_option,
            display_order: subCat.display_order,
            parent_id: parentCatId,
          });
          const subCatId = subCatResult.id;
          createdCategories++;

          // Create lines for this sub-category
          for (const [i, line] of subCat.lines.entries()) {
            const priceItem = priceMap[line.price_list_name];
            await api.createBOQLine({
              category_id: subCatId,
              description: line.description,
              quantity: line.quantity,
              quantity_formula: line.quantity_formula,
              unit: priceItem ? priceItem.unit : line.unit,
              unit_cost_ht: priceItem ? priceItem.unit_price : 0,
              price_list_id: priceItem ? priceItem.id : null,
              margin_percent: DEFAULT_MARGIN_PERCENT,
              display_order: i + 1,
            });
            createdLines++;
          }
        }
      }

      toast({
        title: 'Succès',
        description: `BOQ piscine généré : ${createdCategories} catégories et ${createdLines} lignes créées`,
      });
      const loadedCategories = await api.getBOQCategories(selectedModelId);
      setCategories(loadedCategories);
      
      // Auto-expand all top-level categories to show subcategories
      const topCats = loadedCategories.filter((c: any) => !c.parent_id);
      setExpandedCategories(topCats.map((c: any) => c.id));
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
  // Top-level categories only (no parent)
  const topLevelCategories = categories.filter(c => !c.parent_id);
  
  // Get sub-categories for a given parent
  const getSubCategories = (parentId: number) =>
    categories.filter(c => c.parent_id === parentId);

  // Base categories (non-options, top-level)
  const baseCategories = topLevelCategories.filter(c => !c.is_option);
  const optionCategories = topLevelCategories.filter(c => c.is_option);

  // Sum includes sub-category totals (already aggregated since each sub-cat is its own row)
  const allBaseCategories = categories.filter(c => !c.is_option);
  
  const totalBasePriceHT = allBaseCategories
    .reduce((sum, c) => sum + Number(c.total_sale_price_ht || 0), 0);

  const totalBaseCostHT = allBaseCategories
    .reduce((sum, c) => sum + Number(c.total_cost_ht || 0), 0);

  const totalBaseProfitHT = totalBasePriceHT - totalBaseCostHT;
  const totalBasePriceTTC = calculateTTC(totalBasePriceHT, vatRate);

  // Options
  const allOptionCategories = categories.filter(c => c.is_option);
  const totalOptionsPriceHT = allOptionCategories
    .reduce((sum, c) => sum + Number(c.total_sale_price_ht || 0), 0);

  const totalOptionsCostHT = allOptionCategories
    .reduce((sum, c) => sum + Number(c.total_cost_ht || 0), 0);

  const totalOptionsProfitHT = totalOptionsPriceHT - totalOptionsCostHT;
  const totalOptionsPriceTTC = calculateTTC(totalOptionsPriceHT, vatRate);

  const formatPrice = (price: number) => `Rs ${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  /* ======================================================
     RENDER LINES TABLE
  ====================================================== */
  const renderLinesTable = (categoryId: number) => {
    const lines = categoryLines[categoryId];
    if (!lines || lines.length === 0) {
      return <p className="text-gray-500 text-sm italic">Aucune ligne dans cette catégorie</p>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            {isPoolModel && <TableHead>Formule</TableHead>}
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
          {lines.map(line => {
            // For pool models with formulas, calculate dynamic quantity
            const dynamicQty = isPoolModel && line.quantity_formula
              ? evaluateFormula(line.quantity_formula, poolVarContext)
              : line.quantity;
            // For pool models with unit cost formula, calculate dynamic unit cost
            const dynamicUnitCost = isPoolModel && line.unit_cost_formula
              ? evaluateFormula(line.unit_cost_formula, poolVarContext)
              : null;
            const effectiveUnitCost = dynamicUnitCost !== null
              ? dynamicUnitCost
              : (line.price_list_id && line.price_list_unit_price
                ? Number(line.price_list_unit_price)
                : line.unit_cost_ht);
            const hasDynamicCalc = isPoolModel && (line.quantity_formula || line.unit_cost_formula);
            const dynTotalCost = dynamicQty * effectiveUnitCost;
            const dynSalePrice = dynTotalCost * (1 + line.margin_percent / 100);

            return (
              <TableRow key={line.id}>
                <TableCell className="font-medium whitespace-pre-line">
                  {line.description}
                  {line.price_list_name && (
                    <span className="block text-xs text-blue-500">📋 {line.price_list_name}</span>
                  )}
                </TableCell>
                {isPoolModel && (
                  <TableCell className="text-xs text-gray-500 font-mono max-w-[200px] truncate" title={line.quantity_formula || ''}>
                    {line.quantity_formula || '-'}
                  </TableCell>
                )}
                <TableCell className="text-right">
                  {isPoolModel && line.quantity_formula ? (
                    <span title={`Formule: ${line.quantity_formula}`}>
                      {dynamicQty.toFixed(2)}
                    </span>
                  ) : (
                    line.quantity
                  )}
                </TableCell>
                <TableCell>{line.unit}</TableCell>
                <TableCell className="text-right">
                  {isPoolModel && line.unit_cost_formula ? (
                    <span title={`Formule: ${line.unit_cost_formula}`}>
                      {formatPrice(effectiveUnitCost)}
                    </span>
                  ) : (
                    formatPrice(effectiveUnitCost)
                  )}
                </TableCell>
                <TableCell>{line.supplier_name || '-'}</TableCell>
                <TableCell className="text-right">{line.margin_percent}%</TableCell>
                <TableCell className="text-right">
                  {hasDynamicCalc
                    ? formatPrice(dynTotalCost)
                    : formatPrice(line.total_cost_ht)
                  }
                </TableCell>
                <TableCell className="text-right font-semibold text-orange-600">
                  {hasDynamicCalc
                    ? formatPrice(dynSalePrice)
                    : formatPrice(line.sale_price_ht)
                  }
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
            );
          })}
        </TableBody>
      </Table>
    );
  };

  /* ======================================================
     RENDER CATEGORY CARD
  ====================================================== */
  const renderCategoryCard = (category: BOQCategory) => {
    const subCategories = getSubCategories(category.id);
    const hasSubCategories = subCategories.length > 0;

    // Sum totals including sub-categories
    const subTotalCost = subCategories.reduce((s, sc) => s + Number(sc.total_cost_ht || 0), 0);
    const subTotalSale = subCategories.reduce((s, sc) => s + Number(sc.total_sale_price_ht || 0), 0);
    const combinedCostHT = Number(category.total_cost_ht || 0) + subTotalCost;
    const combinedSaleHT = Number(category.total_sale_price_ht || 0) + subTotalSale;
    const combinedProfitHT = combinedSaleHT - combinedCostHT;

    return (
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
              {hasSubCategories && (
                <Badge variant="default" className="bg-blue-600 text-xs">
                  {subCategories.length} sous-catégorie{subCategories.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Coût HT: {formatPrice(combinedCostHT)}</p>
                <p className="text-sm text-green-600">Profit HT: {formatPrice(combinedProfitHT)}</p>
                <p className="font-bold text-orange-600">Vente HT: {formatPrice(combinedSaleHT)}</p>
                <p className="text-sm font-semibold text-blue-600">Vente TTC: {formatPrice(calculateTTC(combinedSaleHT, vatRate))}</p>
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
            {/* Parent category's own lines */}
            {!hasSubCategories && (
              <>
                <div className="mb-4">
                  <Button size="sm" onClick={() => openNewLine(category.id)}>
                    <Plus className="h-4 w-4 mr-1" /> Ajouter une ligne
                  </Button>
                </div>
                {renderLinesTable(category.id)}
              </>
            )}

            {/* Sub-categories */}
            {hasSubCategories && (
              <div className="space-y-4">
                {subCategories.map(subCat => (
                  <div key={subCat.id} className="border rounded-lg p-4 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleCategory(subCat.id)}>
                        {expandedCategories.includes(subCat.id) ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                        <h4 className="font-semibold text-gray-700">{subCat.name}</h4>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <span className="text-gray-500">Coût: {formatPrice(subCat.total_cost_ht)}</span>
                          <span className="text-orange-600 ml-3 font-semibold">Vente: {formatPrice(subCat.total_sale_price_ht)}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEditCategory(subCat)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteCategory(subCat.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {expandedCategories.includes(subCat.id) && (
                      <>
                        <div className="mb-3">
                          <Button size="sm" variant="outline" onClick={() => openNewLine(subCat.id)}>
                            <Plus className="h-3 w-3 mr-1" /> Ajouter une ligne
                          </Button>
                        </div>
                        {renderLinesTable(subCat.id)}
                      </>
                    )}
                  </div>
                ))}

                {/* Button to add sub-category */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingCategory({
                      ...emptyCategory,
                      model_id: selectedModelId!,
                      parent_id: category.id,
                      is_option: category.is_option,
                    });
                    setIsCategoryDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Ajouter une sous-catégorie
                </Button>
              </div>
            )}

            {/* If no sub-categories and no lines yet, also show add sub-cat button */}
            {!hasSubCategories && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-500"
                  onClick={() => {
                    setEditingCategory({
                      ...emptyCategory,
                      model_id: selectedModelId!,
                      parent_id: category.id,
                      is_option: category.is_option,
                    });
                    setIsCategoryDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Ajouter une sous-catégorie
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

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

          {isPoolModel && (
            <Button
              onClick={generatePoolBOQ}
              disabled={saving}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Waves className="h-4 w-4 mr-2" /> {categories.length > 0 ? 'Régénérer BOQ Piscine' : 'Générer BOQ Piscine'}
            </Button>
          )}
        </div>
      </div>

      {/* POOL DIMENSIONS PANEL */}
      {isPoolModel && selectedModelId && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Waves className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-lg">Dimensions de la Piscine (Simulation)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label>Longueur (m)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  value={poolDimensions.longueur}
                  onChange={(e) => setPoolDimensions(prev => ({ ...prev, longueur: Number(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label>Largeur (m)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  value={poolDimensions.largeur}
                  onChange={(e) => setPoolDimensions(prev => ({ ...prev, largeur: Number(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label>Profondeur (m)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={poolDimensions.profondeur}
                  onChange={(e) => setPoolDimensions(prev => ({ ...prev, profondeur: Number(e.target.value) || 0.5 }))}
                />
              </div>
            </div>

            {poolVariables.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {poolVariables.map(v => (
                  <div key={v.id} className="bg-white rounded-lg p-3 border">
                    <p className="text-xs text-gray-500">{v.label}</p>
                    <p className="text-lg font-bold text-blue-700">
                      {(poolVarContext[v.name] || 0).toFixed(2)} <span className="text-xs font-normal text-gray-400">{v.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
          {isPoolModel && baseCategories.length > 0 && (
            <Card className="mb-4 border-blue-200 bg-blue-50">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="text-blue-600 mt-0.5">ℹ️</div>
                <div className="text-sm text-blue-900">
                  <strong>Astuce :</strong> Cliquez sur une catégorie pour voir ses sous-catégories et lignes détaillées.
                  Les catégories avec sous-catégories affichent un badge bleu avec le nombre.
                </div>
              </CardContent>
            </Card>
          )}
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
            <div className="flex justify-center gap-3 mt-4">
              <Button onClick={openNewCategory} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4 mr-2" /> Créer la première catégorie
              </Button>
              {isPoolModel && (
                <Button
                  onClick={generatePoolBOQ}
                  disabled={saving}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <Waves className="h-4 w-4 mr-2" /> {saving ? 'Génération...' : 'Générer BOQ Piscine'}
                </Button>
              )}
            </div>
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
                <Label>Catégorie parente (sous-catégorie)</Label>
                <Select
                  value={editingCategory.parent_id ? String(editingCategory.parent_id) : "_none"}
                  onValueChange={(v) =>
                    setEditingCategory({ ...editingCategory, parent_id: v === "_none" ? null : Number(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune (catégorie principale)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Aucune (catégorie principale)</SelectItem>
                    {topLevelCategories
                      .filter(c => c.id !== editingCategory.id)
                      .map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
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

              {/* Image picker - only shown when is_option is checked */}
              {editingCategory.is_option && (
                <div>
                  <Label>Image de la catégorie (100px × 100px)</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {editingCategory.image_url ? (
                      <img
                        src={editingCategory.image_url}
                        alt="Preview"
                        className="w-[100px] h-[100px] rounded object-cover border"
                      />
                    ) : (
                      <div className="w-[100px] h-[100px] bg-gray-100 rounded flex items-center justify-center border">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsImageSelectorOpen(true)}
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Choisir une image
                      </Button>
                      {editingCategory.image_url && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => setEditingCategory({ ...editingCategory, image_id: null, image_url: null })}
                        >
                          Supprimer l'image
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

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

      {/* IMAGE SELECTOR MODAL */}
      <Dialog open={isImageSelectorOpen} onOpenChange={setIsImageSelectorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choisir une image</DialogTitle>
            <DialogDescription>
              Sélectionnez une image de catégorie depuis la galerie. 
              Vous pouvez uploader de nouvelles images dans <strong>Photos &gt; Image de catégorie d'option</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-4 max-h-[400px] overflow-y-auto py-4">
            {categoryImages.map(image => (
              <button
                key={image.id}
                onClick={() => selectCategoryImage(image)}
                className={`
                  relative aspect-square rounded overflow-hidden border-2 transition-all
                  hover:border-orange-500 hover:shadow-md
                  ${editingCategory?.image_id === image.id ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200'}
                `}
              >
                <img
                  src={image.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          {categoryImages.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <ImageIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p>Aucune image de catégorie disponible.</p>
              <p className="text-sm mt-2">
                Uploadez des images dans <strong>Photos &gt; Image de catégorie d'option</strong>
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsImageSelectorOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="ghost"
              className="text-red-600"
              onClick={() => selectCategoryImage(null)}
            >
              Sans image
            </Button>
          </div>
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
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
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

              {/* Pricing mode toggle */}
              {priceListItems.length > 0 && (
                <div className="space-y-3">
                  <Label>Mode de tarification</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={pricingMode === 'manual' ? 'default' : 'outline'}
                      onClick={() => {
                        setPricingMode('manual');
                        setEditingLine({
                          ...editingLine,
                          price_list_id: null,
                        });
                      }}
                      className={pricingMode === 'manual' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                    >
                      ✏️ Prix Manuel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={pricingMode === 'pricelist' ? 'default' : 'outline'}
                      onClick={() => setPricingMode('pricelist')}
                      className={pricingMode === 'pricelist' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                    >
                      📋 Base de Prix Piscine
                    </Button>
                  </div>

                  {/* Price list selection with search */}
                  {pricingMode === 'pricelist' && (
                    <div className="space-y-2">
                      <Input
                        placeholder="🔍 Rechercher un article..."
                        value={priceListSearch}
                        onChange={(e) => setPriceListSearch(e.target.value)}
                        className="text-sm"
                      />
                      {(() => {
                        const searchLower = priceListSearch.toLowerCase();
                        const filteredItems = priceListSearch
                          ? priceListItems.filter(p => p.name.toLowerCase().includes(searchLower))
                          : priceListItems;
                        const selectedItem = editingLine.price_list_id
                          ? priceListItems.find(p => p.id === editingLine.price_list_id)
                          : null;
                        return (
                          <>
                            <Select
                              value={editingLine.price_list_id ? String(editingLine.price_list_id) : "_none"}
                              onValueChange={(v) => {
                                const id = v === "_none" ? null : Number(v);
                                const item = id ? priceListItems.find(p => p.id === id) : null;
                                setEditingLine({
                                  ...editingLine,
                                  price_list_id: id,
                                  unit_cost_ht: item ? item.unit_price : editingLine.unit_cost_ht,
                                  unit: item ? item.unit : editingLine.unit,
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un article" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_none">Aucun (prix manuel)</SelectItem>
                                {filteredItems.map(p => (
                                  <SelectItem key={p.id} value={String(p.id)}>
                                    {p.name} — Rs {p.unit_price.toLocaleString()} / {p.unit}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedItem && (
                              <p className="text-xs text-blue-600">
                                Article sélectionné: {selectedItem.name} — Rs {selectedItem.unit_price.toLocaleString()} / {selectedItem.unit}
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Quantity formula (pool models) */}
              {isPoolModel && (
                <div>
                  <Label>Formule de Quantité</Label>
                  <Textarea
                    value={editingLine.quantity_formula || ''}
                    onChange={(e) =>
                      setEditingLine({ ...editingLine, quantity_formula: e.target.value || null })
                    }
                    placeholder="Ex: surface_m2 * 0.125, CEIL(perimetre_m / 2.4)"
                    rows={2}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Variables: longueur, largeur, profondeur, {poolVariables.map(v => v.name).join(', ')}. Fonctions: CEIL(), FLOOR(), ROUND()
                  </p>
                  {editingLine.quantity_formula && Object.keys(poolVarContext).length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      Résultat: {evaluateFormula(editingLine.quantity_formula, poolVarContext).toFixed(4)}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantité {isPoolModel && editingLine.quantity_formula ? '(calculée)' : ''}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={isPoolModel && editingLine.quantity_formula
                      ? evaluateFormula(editingLine.quantity_formula, poolVarContext).toFixed(2)
                      : editingLine.quantity || 1
                    }
                    onChange={(e) =>
                      setEditingLine({ ...editingLine, quantity: Number(e.target.value) })
                    }
                    disabled={isPoolModel && !!editingLine.quantity_formula}
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

              {/* Unit cost formula (pool models) */}
              {isPoolModel && (
                <div>
                  <Label>Formule de Coût Unitaire</Label>
                  <Textarea
                    value={editingLine.unit_cost_formula || ''}
                    onChange={(e) =>
                      setEditingLine({ ...editingLine, unit_cost_formula: e.target.value || null })
                    }
                    placeholder="Ex: volume_m3 * 5500, surface_m2 * 350"
                    rows={2}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Utilisez les variables pour calculer le coût unitaire dynamiquement
                  </p>
                  {editingLine.unit_cost_formula && Object.keys(poolVarContext).length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      Résultat: Rs {evaluateFormula(editingLine.unit_cost_formula, poolVarContext).toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  {(() => {
                    const isUnitCostDisabled = (isPoolModel && !!editingLine.unit_cost_formula) || (pricingMode === 'pricelist' && !!editingLine.price_list_id);
                    return (
                      <>
                        <Label>
                          Coût Unitaire HT (Rs)
                          {isPoolModel && editingLine.unit_cost_formula ? ' (calculé)' : ''}
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={isPoolModel && editingLine.unit_cost_formula
                            ? evaluateFormula(editingLine.unit_cost_formula, poolVarContext).toFixed(2)
                            : editingLine.unit_cost_ht || 0
                          }
                          onChange={(e) =>
                            setEditingLine({ ...editingLine, unit_cost_ht: Number(e.target.value), unit_cost_formula: null })
                          }
                          disabled={isUnitCostDisabled}
                        />
                      </>
                    );
                  })()}
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
                {(() => {
                  const previewQty = isPoolModel && editingLine.quantity_formula
                    ? evaluateFormula(editingLine.quantity_formula, poolVarContext)
                    : (editingLine.quantity || 1);
                  const previewUnitCost = isPoolModel && editingLine.unit_cost_formula
                    ? evaluateFormula(editingLine.unit_cost_formula, poolVarContext)
                    : (pricingMode === 'pricelist' && editingLine.price_list_id
                      ? (priceListItems.find(p => p.id === editingLine.price_list_id)?.unit_price || editingLine.unit_cost_ht || 0)
                      : (editingLine.unit_cost_ht || 0));
                  const previewTotal = previewQty * previewUnitCost;
                  const previewSale = previewTotal * (1 + (editingLine.margin_percent || 30) / 100);
                  return (
                    <>
                      <p className="text-sm text-gray-600">
                        Coût Total HT: <span className="font-semibold">{formatPrice(previewTotal)}</span>
                      </p>
                      <p className="text-sm text-orange-600">
                        Prix de Vente HT: <span className="font-semibold">{formatPrice(previewSale)}</span>
                      </p>
                    </>
                  );
                })()}
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
