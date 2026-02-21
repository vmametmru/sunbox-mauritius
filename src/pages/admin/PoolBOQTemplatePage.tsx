import React, { useEffect, useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Waves,
  AlertCircle,
  Save,
  RotateCcw,
  Edit,
  Check,
  X,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  clearSavedPoolBOQTemplates,
  getHardcodedBaseTemplateByShape,
  getHardcodedOptionsTemplate,
  loadTemplateFromDBByShape,
  saveTemplateToDBByShape,
  PoolBOQTemplateCategory,
  PoolBOQTemplateSubcategory,
  PoolBOQTemplateLine,
  PoolShape,
} from '@/lib/pool-formulas';

/**
 * Pool BOQ Template Editor Page
 * 
 * This page allows administrators to view and edit the pool BOQ template structure.
 * The template defines all categories, subcategories, and lines that are created when
 * generating a BOQ for a pool model.
 * 
 * Templates are persisted in the database and used by the BOQ generator.
 */

const SHAPES: PoolShape[] = ['Rectangulaire', 'L', 'T'];
const SHAPE_LABELS: Record<PoolShape, string> = {
  Rectangulaire: 'Rectangulaire',
  L: 'En L',
  T: 'En T',
};

const PoolBOQTemplatePage: React.FC = () => {
  const { toast } = useToast();

  // Active shape tab
  const [activeShape, setActiveShape] = useState<PoolShape>('Rectangulaire');

  // Per-shape state: base template, options template, DB record id, loading, changes
  const [baseTemplate, setBaseTemplate] = useState<PoolBOQTemplateCategory[]>([]);
  const [optionsTemplate, setOptionsTemplate] = useState<PoolBOQTemplateCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  const [expandedSubcategories, setExpandedSubcategories] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Database record tracking (per shape)
  const [dbRecordId, setDbRecordId] = useState<number | undefined>(undefined);

  // Editing state
  const [editingLine, setEditingLine] = useState<{
    type: 'base' | 'options';
    catIndex: number;
    subIndex: number;
    lineIndex: number;
  } | null>(null);
  const [editForm, setEditForm] = useState<Partial<PoolBOQTemplateLine>>({});

  useEffect(() => {
    loadTemplates(activeShape);
  }, [activeShape]);

  const loadTemplates = async (shape: PoolShape) => {
    setIsLoading(true);
    setExpandedCategories([]);
    setExpandedSubcategories([]);
    setEditingLine(null);
    setEditForm({});
    try {
      const { record, base, options } = await loadTemplateFromDBByShape(shape);
      setBaseTemplate(base);
      setOptionsTemplate(options);
      setDbRecordId(record?.id);
      setHasChanges(false);
    } catch (err: any) {
      // Fallback to hardcoded defaults
      try {
        setBaseTemplate(getHardcodedBaseTemplateByShape(shape));
        setOptionsTemplate(getHardcodedOptionsTemplate());
        setHasChanges(false);
      } catch (fallbackErr: any) {
        toast({ title: 'Erreur', description: fallbackErr.message, variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (index: number) => {
    if (expandedCategories.includes(index)) {
      setExpandedCategories(prev => prev.filter(i => i !== index));
    } else {
      setExpandedCategories(prev => [...prev, index]);
    }
  };

  const toggleSubcategory = (key: string) => {
    if (expandedSubcategories.includes(key)) {
      setExpandedSubcategories(prev => prev.filter(k => k !== key));
    } else {
      setExpandedSubcategories(prev => [...prev, key]);
    }
  };

  /* ======================================================
     SAVE / RESET
  ====================================================== */
  const saveTemplates = useCallback(async () => {
    setIsSaving(true);
    try {
      const recordId = await saveTemplateToDBByShape(activeShape, baseTemplate, optionsTemplate, dbRecordId);
      if (!dbRecordId) {
        setDbRecordId(recordId);
      }
      setHasChanges(false);
      toast({
        title: 'Modèle sauvegardé',
        description: 'Les modifications du modèle ont été enregistrées dans la base de données.',
      });
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [activeShape, baseTemplate, optionsTemplate, dbRecordId, toast]);

  const resetToDefaults = useCallback(async () => {
    if (!confirm('Réinitialiser le modèle aux valeurs par défaut ?\nToutes les modifications seront perdues.')) return;
    setIsSaving(true);
    try {
      const base = getHardcodedBaseTemplateByShape(activeShape);
      const options = getHardcodedOptionsTemplate();
      await saveTemplateToDBByShape(activeShape, base, options, dbRecordId);
      if (activeShape === 'Rectangulaire') clearSavedPoolBOQTemplates();
      setBaseTemplate(base);
      setOptionsTemplate(options);
      setHasChanges(false);
      toast({ title: 'Modèle réinitialisé', description: 'Le modèle a été réinitialisé aux valeurs par défaut.' });
    } catch {
      const base = getHardcodedBaseTemplateByShape(activeShape);
      const options = getHardcodedOptionsTemplate();
      if (activeShape === 'Rectangulaire') clearSavedPoolBOQTemplates();
      setBaseTemplate(base);
      setOptionsTemplate(options);
      setHasChanges(false);
      toast({ title: 'Modèle réinitialisé localement', description: 'La base de données est indisponible. Réinitialisation locale effectuée.' });
    } finally {
      setIsSaving(false);
    }
  }, [activeShape, dbRecordId, toast]);

  /* ======================================================
     LINE EDITING
  ====================================================== */
  const startEditLine = (
    type: 'base' | 'options',
    catIndex: number,
    subIndex: number,
    lineIndex: number,
    line: PoolBOQTemplateLine,
  ) => {
    setEditingLine({ type, catIndex, subIndex, lineIndex });
    setEditForm({ ...line });
  };

  const cancelEdit = () => {
    setEditingLine(null);
    setEditForm({});
  };

  const applyEdit = () => {
    if (!editingLine) return;
    const { type, catIndex, subIndex, lineIndex } = editingLine;

    const updateTemplate = (template: PoolBOQTemplateCategory[]) => {
      const updated = template.map((cat, ci) => {
        if (ci !== catIndex) return cat;
        return {
          ...cat,
          subcategories: cat.subcategories.map((sub, si) => {
            if (si !== subIndex) return sub;
            return {
              ...sub,
              lines: sub.lines.map((line, li) => {
                if (li !== lineIndex) return line;
                const newFormula = editForm.quantity_formula ?? line.quantity_formula;
                const parsedQty = Number(newFormula);
                return {
                  ...line,
                  description: editForm.description ?? line.description,
                  quantity: isNaN(parsedQty) ? line.quantity : parsedQty,
                  quantity_formula: newFormula,
                  unit: editForm.unit ?? line.unit,
                  price_list_name: editForm.price_list_name ?? line.price_list_name,
                };
              }),
            };
          }),
        };
      });
      return updated;
    };

    if (type === 'base') {
      setBaseTemplate(prev => updateTemplate(prev));
    } else {
      setOptionsTemplate(prev => updateTemplate(prev));
    }

    setHasChanges(true);
    setEditingLine(null);
    setEditForm({});
  };

  const deleteLine = (
    type: 'base' | 'options',
    catIndex: number,
    subIndex: number,
    lineIndex: number,
  ) => {
    if (!confirm('Supprimer cette ligne du modèle ?')) return;

    const updateTemplate = (template: PoolBOQTemplateCategory[]) =>
      template.map((cat, ci) => {
        if (ci !== catIndex) return cat;
        return {
          ...cat,
          subcategories: cat.subcategories.map((sub, si) => {
            if (si !== subIndex) return sub;
            return { ...sub, lines: sub.lines.filter((_, li) => li !== lineIndex) };
          }),
        };
      });

    if (type === 'base') {
      setBaseTemplate(prev => updateTemplate(prev));
    } else {
      setOptionsTemplate(prev => updateTemplate(prev));
    }
    setHasChanges(true);
  };

  const addLine = (
    type: 'base' | 'options',
    catIndex: number,
    subIndex: number,
  ) => {
    const newLine: PoolBOQTemplateLine = {
      description: 'Nouvelle ligne',
      quantity: 1,
      quantity_formula: '1',
      unit: 'unité',
      price_list_name: '',
    };

    const updateTemplate = (template: PoolBOQTemplateCategory[]) =>
      template.map((cat, ci) => {
        if (ci !== catIndex) return cat;
        return {
          ...cat,
          subcategories: cat.subcategories.map((sub, si) => {
            if (si !== subIndex) return sub;
            return { ...sub, lines: [...sub.lines, newLine] };
          }),
        };
      });

    if (type === 'base') {
      setBaseTemplate(prev => updateTemplate(prev));
    } else {
      setOptionsTemplate(prev => updateTemplate(prev));
    }
    setHasChanges(true);
  };

  /* ======================================================
     RENDER HELPERS
  ====================================================== */
  const renderLine = (
    line: PoolBOQTemplateLine,
    index: number,
    type: 'base' | 'options',
    catIndex: number,
    subIndex: number,
  ) => {
    const isEditing =
      editingLine?.type === type &&
      editingLine.catIndex === catIndex &&
      editingLine.subIndex === subIndex &&
      editingLine.lineIndex === index;

    if (isEditing) {
      return (
        <div key={index} className="border-l-2 border-blue-400 pl-4 py-2 bg-blue-50 rounded-r">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-gray-500 min-w-[30px]">{index + 1}.</span>
              <Input
                value={editForm.description ?? ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description"
                className="flex-1 h-8 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2 ml-[38px]">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-gray-500 font-medium">Formule quantité</label>
                <Input
                  value={editForm.quantity_formula ?? ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, quantity_formula: e.target.value }))}
                  placeholder="Ex: surface_m2 * 1.6"
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="w-24">
                <label className="text-xs text-gray-500 font-medium">Unité</label>
                <Input
                  value={editForm.unit ?? ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="Unité"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs text-gray-500 font-medium">Référence prix</label>
                <Input
                  value={editForm.price_list_name ?? ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, price_list_name: e.target.value }))}
                  placeholder="Nom dans la liste de prix"
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 ml-[38px]">
              <Button size="sm" onClick={applyEdit} className="h-7 text-xs bg-green-600 hover:bg-green-700">
                <Check className="h-3 w-3 mr-1" /> Valider
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEdit} className="h-7 text-xs">
                <X className="h-3 w-3 mr-1" /> Annuler
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={index} className="border-l-2 border-gray-300 pl-4 py-2 text-sm group hover:bg-gray-50 rounded-r">
        <div className="flex items-start gap-2">
          <span className="font-mono text-xs text-gray-500 min-w-[30px]">{index + 1}.</span>
          <div className="flex-1">
            <div className="font-medium text-gray-800">{line.description}</div>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-600">
              <span className="bg-blue-50 px-2 py-1 rounded">
                <strong>Quantité:</strong> {line.quantity_formula || line.quantity}
              </span>
              <span className="bg-green-50 px-2 py-1 rounded">
                <strong>Unité:</strong> {line.unit}
              </span>
              <span className="bg-purple-50 px-2 py-1 rounded">
                <strong>Prix:</strong> {line.price_list_name}
              </span>
            </div>
            {line.quantity_formula && (
              <div className="mt-1 font-mono text-xs text-blue-600">
                Formule: <code className="bg-blue-50 px-1 py-0.5 rounded">{line.quantity_formula}</code>
              </div>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => startEditLine(type, catIndex, subIndex, index, line)}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
              onClick={() => deleteLine(type, catIndex, subIndex, index)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderSubcategory = (
    subcat: PoolBOQTemplateSubcategory,
    catIndex: number,
    subcatIndex: number,
    type: 'base' | 'options',
  ) => {
    const key = `${catIndex}-${subcatIndex}`;
    const isExpanded = expandedSubcategories.includes(key);

    return (
      <div key={subcatIndex} className="border rounded-lg p-3 bg-gray-50">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSubcategory(key)}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
            <h4 className="font-semibold text-gray-700">{subcat.name}</h4>
            <Badge variant="outline" className="text-xs">
              {subcat.lines.length} lignes
            </Badge>
          </div>
          <span className="text-xs text-gray-500">Ordre: {subcat.display_order}</span>
        </div>

        {isExpanded && (
          <div className="mt-3 space-y-1">
            {subcat.lines.map((line, idx) =>
              renderLine(line, idx, type, catIndex, subcatIndex)
            )}
            <Button
              size="sm"
              variant="outline"
              className="mt-2 h-7 text-xs"
              onClick={() => addLine(type, catIndex, subcatIndex)}
            >
              <Plus className="h-3 w-3 mr-1" /> Ajouter une ligne
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderCategory = (
    category: PoolBOQTemplateCategory,
    index: number,
    type: 'base' | 'options',
    catIndex: number,
  ) => {
    const isExpanded = expandedCategories.includes(index);
    const totalLines = category.subcategories.reduce((sum, sub) => sum + sub.lines.length, 0);

    return (
      <Card key={index} className={category.is_option ? 'border-orange-300' : ''}>
        <CardHeader
          className="cursor-pointer hover:bg-gray-50"
          onClick={() => toggleCategory(index)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-500" />
              )}
              <div>
                <CardTitle className="text-lg">{category.name}</CardTitle>
                <div className="flex gap-2 mt-1">
                  {category.is_option && (
                    <Badge variant="secondary">Option</Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {category.subcategories.length} sous-catégories
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {totalLines} lignes
                  </Badge>
                </div>
              </div>
            </div>
            <span className="text-sm text-gray-500">Ordre: {category.display_order}</span>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent>
            <div className="space-y-3">
              {category.subcategories.map((subcat, idx) => 
                renderSubcategory(subcat, catIndex, idx, type)
              )}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  const totalBaseCategories = baseTemplate.length;
  const totalBaseSubcategories = baseTemplate.reduce((sum, cat) => sum + cat.subcategories.length, 0);
  const totalBaseLines = baseTemplate.reduce((sum, cat) => 
    sum + cat.subcategories.reduce((s, sub) => s + sub.lines.length, 0), 0
  );

  const totalOptionCategories = optionsTemplate.length;
  const totalOptionSubcategories = optionsTemplate.reduce((sum, cat) => sum + cat.subcategories.length, 0);
  const totalOptionLines = optionsTemplate.reduce((sum, cat) => 
    sum + cat.subcategories.reduce((s, sub) => s + sub.lines.length, 0), 0
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Waves className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Modèle BOQ Piscine</h1>
              <p className="text-gray-600">
                Structure du modèle utilisé lors de la génération d'un BOQ piscine
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={resetToDefaults}
              disabled={isSaving}
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Réinitialiser
            </Button>
            <Button
              onClick={saveTemplates}
              disabled={!hasChanges || isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Sauvegarder
            </Button>
          </div>
        </div>
      </div>

      {/* Shape Tabs */}
      <div className="flex gap-2 mb-6">
        {SHAPES.map(shape => (
          <button
            key={shape}
            onClick={() => setActiveShape(shape)}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition-colors border ${
              activeShape === shape
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {SHAPE_LABELS[shape]}
          </button>
        ))}
      </div>

      {/* Info Banner */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">À propos de ce modèle — Piscine {SHAPE_LABELS[activeShape]}</p>
              <p>
                Ce modèle définit la structure complète d'un BOQ piscine : catégories, sous-catégories, 
                et lignes avec leurs formules de calcul. Cliquez sur l'icône <Edit className="inline h-3 w-3" /> 
                pour modifier une ligne.
              </p>
              <p className="mt-2">
                <strong>Variables disponibles :</strong>{' '}
                {activeShape === 'Rectangulaire' && (
                  <>
                    <code className="bg-blue-100 px-1 rounded">longueur</code>{' '}
                    <code className="bg-blue-100 px-1 rounded">largeur</code>{' '}
                    <code className="bg-blue-100 px-1 rounded">profondeur</code>{' '}
                  </>
                )}
                {activeShape === 'L' && (
                  <>
                    <code className="bg-blue-100 px-1 rounded">longueur_la</code>{' '}
                    <code className="bg-blue-100 px-1 rounded">largeur_la</code>{' '}
                    <code className="bg-blue-100 px-1 rounded">profondeur_la</code>{' '}
                    <code className="bg-blue-100 px-1 rounded">longueur_lb</code>{' '}
                    <code className="bg-blue-100 px-1 rounded">largeur_lb</code>{' '}
                    <code className="bg-blue-100 px-1 rounded">profondeur_lb</code>{' '}
                  </>
                )}
                {activeShape === 'T' && (
                  <>
                    <code className="bg-blue-100 px-1 rounded">longueur_ta</code>{' '}
                    <code className="bg-blue-100 px-1 rounded">largeur_ta</code>{' '}
                    <code className="bg-blue-100 px-1 rounded">profondeur_ta</code>{' '}
                    <code className="bg-blue-100 px-1 rounded">longueur_tb</code>{' '}
                    <code className="bg-blue-100 px-1 rounded">largeur_tb</code>{' '}
                    <code className="bg-blue-100 px-1 rounded">profondeur_tb</code>{' '}
                  </>
                )}
                <code className="bg-blue-100 px-1 rounded">surface_m2</code>{' '}
                <code className="bg-blue-100 px-1 rounded">volume_m3</code>{' '}
                <code className="bg-blue-100 px-1 rounded">perimetre_m</code>{' '}
                <code className="bg-blue-100 px-1 rounded">surface_interieur_m2</code>{' '}
                — Fonctions : <code className="bg-blue-100 px-1 rounded">CEIL()</code>{' '}
                <code className="bg-blue-100 px-1 rounded">FLOOR()</code>{' '}
                <code className="bg-blue-100 px-1 rounded">ROUND()</code>{' '}
                <code className="bg-blue-100 px-1 rounded">ROUNDUP()</code>{' '}
                <code className="bg-blue-100 px-1 rounded">ROUNDDOWN()</code>{' '}
                <code className="bg-blue-100 px-1 rounded">IF(condition, vrai, faux)</code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasChanges && (
        <Card className="mb-6 border-yellow-300 bg-yellow-50">
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-sm text-yellow-800 font-medium">
              ⚠️ Modifications non sauvegardées
            </span>
            <Button size="sm" onClick={saveTemplates} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
              {isSaving ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Save className="h-3 w-3 mr-1" />
              )}
              Sauvegarder
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Chargement du modèle...</p>
          </div>
        </div>
      ) : (
        <>
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Catégories de Base
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalBaseCategories}</div>
                <div className="text-xs text-gray-600">Catégories</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{totalBaseSubcategories}</div>
                <div className="text-xs text-gray-600">Sous-catégories</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{totalBaseLines}</div>
                <div className="text-xs text-gray-600">Lignes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Catégories Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-orange-600">{totalOptionCategories}</div>
                <div className="text-xs text-gray-600">Catégories</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{totalOptionSubcategories}</div>
                <div className="text-xs text-gray-600">Sous-catégories</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{totalOptionLines}</div>
                <div className="text-xs text-gray-600">Lignes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Base Categories */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Catégories de Base</h2>
        <div className="space-y-4">
          {baseTemplate.map((category, index) =>
            renderCategory(category, index, 'base', index)
          )}
        </div>
      </div>

      {/* Option Categories */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Catégories Options</h2>
        <div className="space-y-4">
          {optionsTemplate.map((category, index) => 
            renderCategory(category, baseTemplate.length + index, 'options', index)
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default PoolBOQTemplatePage;
