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
  Download,
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

const SHAPES: PoolShape[] = ['Rectangulaire', 'L', 'T'];
const SHAPE_LABELS: Record<PoolShape, string> = {
  Rectangulaire: 'Rectangulaire',
  L: 'En L',
  T: 'En T',
};

const PoolBOQTemplatePage: React.FC = () => {
  const { toast } = useToast();

  const [activeShape, setActiveShape] = useState<PoolShape>('Rectangulaire');
  const [baseTemplate, setBaseTemplate] = useState<PoolBOQTemplateCategory[]>([]);
  const [optionsTemplate, setOptionsTemplate] = useState<PoolBOQTemplateCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  const [expandedSubcategories, setExpandedSubcategories] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dbRecordId, setDbRecordId] = useState<number | undefined>(undefined);

  // Import state
  const [importShape, setImportShape] = useState<PoolShape | ''>('');
  const [isImporting, setIsImporting] = useState(false);

  // Inline edit state for lines
  const [editingLine, setEditingLine] = useState<{
    type: 'base' | 'options';
    catIndex: number;
    subIndex: number;
    lineIndex: number;
  } | null>(null);
  const [editForm, setEditForm] = useState<Partial<PoolBOQTemplateLine>>({});

  // Inline rename state for categories
  const [renamingCat, setRenamingCat] = useState<{ type: 'base' | 'options'; catIndex: number } | null>(null);
  const [renameCatValue, setRenameCatValue] = useState('');

  // Inline rename state for subcategories
  const [renamingSub, setRenamingSub] = useState<{ type: 'base' | 'options'; catIndex: number; subIndex: number } | null>(null);
  const [renameSubValue, setRenameSubValue] = useState('');

  useEffect(() => {
    loadTemplates(activeShape);
  }, [activeShape]);

  const loadTemplates = async (shape: PoolShape) => {
    setIsLoading(true);
    setExpandedCategories([]);
    setExpandedSubcategories([]);
    setEditingLine(null);
    setEditForm({});
    setRenamingCat(null);
    setRenamingSub(null);
    try {
      const { record, base, options } = await loadTemplateFromDBByShape(shape);
      setBaseTemplate(base);
      setOptionsTemplate(options);
      setDbRecordId(record?.id);
      setHasChanges(false);
    } catch (err: any) {
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
    setExpandedCategories(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const toggleSubcategory = (key: string) => {
    setExpandedSubcategories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  /* ======================================================
     SAVE / RESET
  ====================================================== */
  const saveTemplates = useCallback(async () => {
    setIsSaving(true);
    try {
      const recordId = await saveTemplateToDBByShape(activeShape, baseTemplate, optionsTemplate, dbRecordId);
      if (!dbRecordId) setDbRecordId(recordId);
      setHasChanges(false);
      toast({ title: 'Modèle sauvegardé', description: 'Les modifications ont été enregistrées.' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
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
      toast({ title: 'Modèle réinitialisé' });
    } catch {
      const base = getHardcodedBaseTemplateByShape(activeShape);
      const options = getHardcodedOptionsTemplate();
      if (activeShape === 'Rectangulaire') clearSavedPoolBOQTemplates();
      setBaseTemplate(base);
      setOptionsTemplate(options);
      setHasChanges(false);
      toast({ title: 'Modèle réinitialisé localement' });
    } finally {
      setIsSaving(false);
    }
  }, [activeShape, dbRecordId, toast]);

  /* ======================================================
     IMPORT FROM ANOTHER SHAPE
  ====================================================== */
  const handleImport = async () => {
    if (!importShape) return;
    if (!confirm(
      `Importer le modèle "${SHAPE_LABELS[importShape]}" vers "${SHAPE_LABELS[activeShape]}" ?\n` +
      `Les catégories, sous-catégories et lignes seront copiées. Les formules incompatibles ` +
      `resteront telles quelles et pourront être corrigées ensuite.`
    )) return;
    setIsImporting(true);
    try {
      const { base, options } = await loadTemplateFromDBByShape(importShape);
      setBaseTemplate(base);
      setOptionsTemplate(options);
      setHasChanges(true);
      toast({
        title: 'Import effectué',
        description: `Le modèle "${SHAPE_LABELS[importShape]}" a été copié. Sauvegardez pour conserver les modifications.`,
      });
    } catch (err: any) {
      toast({ title: 'Erreur lors de l\'import', description: err.message, variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  /* ======================================================
     CATEGORY OPERATIONS
  ====================================================== */
  const addCategory = (type: 'base' | 'options') => {
    const template = type === 'base' ? baseTemplate : optionsTemplate;
    const newCat: PoolBOQTemplateCategory = {
      name: 'Nouvelle catégorie',
      is_option: type === 'options',
      display_order: template.length + 1,
      subcategories: [],
    };
    const updated = [...template, newCat];
    if (type === 'base') setBaseTemplate(updated);
    else setOptionsTemplate(updated);
    // Auto-expand the new category
    const globalIndex = type === 'base' ? updated.length - 1 : baseTemplate.length + updated.length - 1;
    setExpandedCategories(prev => [...prev, globalIndex]);
    setHasChanges(true);
  };

  const deleteCategory = (type: 'base' | 'options', catIndex: number) => {
    if (!confirm('Supprimer cette catégorie et toutes ses sous-catégories ?')) return;
    const template = type === 'base' ? baseTemplate : optionsTemplate;
    const updated = template.filter((_, i) => i !== catIndex);
    if (type === 'base') setBaseTemplate(updated);
    else setOptionsTemplate(updated);
    setHasChanges(true);
  };

  const startRenameCategory = (type: 'base' | 'options', catIndex: number, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingCat({ type, catIndex });
    setRenameCatValue(currentName);
  };

  const applyRenameCategory = () => {
    if (!renamingCat) return;
    const { type, catIndex } = renamingCat;
    const setter = type === 'base' ? setBaseTemplate : setOptionsTemplate;
    setter(prev => prev.map((cat, i) =>
      i === catIndex ? { ...cat, name: renameCatValue } : cat
    ));
    setRenamingCat(null);
    setHasChanges(true);
  };

  /* ======================================================
     SUBCATEGORY OPERATIONS
  ====================================================== */
  const addSubcategory = (type: 'base' | 'options', catIndex: number) => {
    const template = type === 'base' ? baseTemplate : optionsTemplate;
    const newSub: PoolBOQTemplateSubcategory = {
      name: 'Nouvelle sous-catégorie',
      display_order: template[catIndex].subcategories.length + 1,
      lines: [],
    };
    const updated = template.map((cat, i) =>
      i === catIndex ? { ...cat, subcategories: [...cat.subcategories, newSub] } : cat
    );
    if (type === 'base') setBaseTemplate(updated);
    else setOptionsTemplate(updated);
    // Auto-expand the new subcategory
    const subIdx = updated[catIndex].subcategories.length - 1;
    setExpandedSubcategories(prev => [...prev, `${catIndex}-${subIdx}`]);
    setHasChanges(true);
  };

  const deleteSubcategory = (type: 'base' | 'options', catIndex: number, subIndex: number) => {
    if (!confirm('Supprimer cette sous-catégorie et toutes ses lignes ?')) return;
    const setter = type === 'base' ? setBaseTemplate : setOptionsTemplate;
    setter(prev => prev.map((cat, i) =>
      i === catIndex
        ? { ...cat, subcategories: cat.subcategories.filter((_, si) => si !== subIndex) }
        : cat
    ));
    setHasChanges(true);
  };

  const startRenameSub = (type: 'base' | 'options', catIndex: number, subIndex: number, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingSub({ type, catIndex, subIndex });
    setRenameSubValue(currentName);
  };

  const applyRenameSub = () => {
    if (!renamingSub) return;
    const { type, catIndex, subIndex } = renamingSub;
    const setter = type === 'base' ? setBaseTemplate : setOptionsTemplate;
    setter(prev => prev.map((cat, ci) =>
      ci === catIndex
        ? {
            ...cat,
            subcategories: cat.subcategories.map((sub, si) =>
              si === subIndex ? { ...sub, name: renameSubValue } : sub
            ),
          }
        : cat
    ));
    setRenamingSub(null);
    setHasChanges(true);
  };

  /* ======================================================
     LINE OPERATIONS
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
    const setter = type === 'base' ? setBaseTemplate : setOptionsTemplate;
    setter(prev => prev.map((cat, ci) => {
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
    }));
    setHasChanges(true);
    setEditingLine(null);
    setEditForm({});
  };

  const deleteLine = (type: 'base' | 'options', catIndex: number, subIndex: number, lineIndex: number) => {
    if (!confirm('Supprimer cette ligne du modèle ?')) return;
    const setter = type === 'base' ? setBaseTemplate : setOptionsTemplate;
    setter(prev => prev.map((cat, ci) => {
      if (ci !== catIndex) return cat;
      return {
        ...cat,
        subcategories: cat.subcategories.map((sub, si) =>
          si !== subIndex ? sub : { ...sub, lines: sub.lines.filter((_, li) => li !== lineIndex) }
        ),
      };
    }));
    setHasChanges(true);
  };

  const addLine = (type: 'base' | 'options', catIndex: number, subIndex: number) => {
    const newLine: PoolBOQTemplateLine = {
      description: 'Nouvelle ligne',
      quantity: 1,
      quantity_formula: '1',
      unit: 'unité',
      price_list_name: '',
    };
    const setter = type === 'base' ? setBaseTemplate : setOptionsTemplate;
    setter(prev => prev.map((cat, ci) => {
      if (ci !== catIndex) return cat;
      return {
        ...cat,
        subcategories: cat.subcategories.map((sub, si) =>
          si !== subIndex ? sub : { ...sub, lines: [...sub.lines, newLine] }
        ),
      };
    }));
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
              size="sm" variant="ghost" className="h-7 w-7 p-0"
              onClick={() => startEditLine(type, catIndex, subIndex, index, line)}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
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
    const isRenaming =
      renamingSub?.type === type &&
      renamingSub.catIndex === catIndex &&
      renamingSub.subIndex === subcatIndex;

    return (
      <div key={subcatIndex} className="border rounded-lg p-3 bg-gray-50">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-2 flex-1 cursor-pointer"
            onClick={() => !isRenaming && toggleSubcategory(key)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
            )}
            {isRenaming ? (
              <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
                <Input
                  value={renameSubValue}
                  onChange={e => setRenameSubValue(e.target.value)}
                  className="h-7 text-sm flex-1"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') applyRenameSub(); if (e.key === 'Escape') setRenamingSub(null); }}
                />
                <Button size="sm" className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700" onClick={applyRenameSub}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setRenamingSub(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <h4 className="font-semibold text-gray-700">{subcat.name}</h4>
            )}
            {!isRenaming && (
              <Badge variant="outline" className="text-xs">{subcat.lines.length} lignes</Badge>
            )}
          </div>
          {!isRenaming && (
            <div className="flex items-center gap-1 ml-2">
              <Button
                size="sm" variant="ghost" className="h-7 w-7 p-0"
                onClick={(e) => startRenameSub(type, catIndex, subcatIndex, subcat.name, e)}
                title="Renommer"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                onClick={() => deleteSubcategory(type, catIndex, subcatIndex)}
                title="Supprimer"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="mt-3 space-y-1">
            {subcat.lines.map((line, idx) =>
              renderLine(line, idx, type, catIndex, subcatIndex)
            )}
            <Button
              size="sm" variant="outline" className="mt-2 h-7 text-xs"
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
    const isRenaming = renamingCat?.type === type && renamingCat.catIndex === catIndex;

    return (
      <Card key={index} className={category.is_option ? 'border-orange-300' : ''}>
        <CardHeader className="hover:bg-gray-50">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-3 flex-1 cursor-pointer"
              onClick={() => !isRenaming && toggleCategory(index)}
            >
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-500 flex-shrink-0" />
              )}
              {isRenaming ? (
                <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
                  <Input
                    value={renameCatValue}
                    onChange={e => setRenameCatValue(e.target.value)}
                    className="h-8 text-sm flex-1"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') applyRenameCategory(); if (e.key === 'Escape') setRenamingCat(null); }}
                  />
                  <Button size="sm" className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700" onClick={applyRenameCategory}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setRenamingCat(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div>
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                  <div className="flex gap-2 mt-1">
                    {category.is_option && <Badge variant="secondary">Option</Badge>}
                    <Badge variant="outline" className="text-xs">{category.subcategories.length} sous-catégories</Badge>
                    <Badge variant="outline" className="text-xs">{totalLines} lignes</Badge>
                  </div>
                </div>
              )}
            </div>
            {!isRenaming && (
              <div className="flex items-center gap-1 ml-2">
                <Button
                  size="sm" variant="ghost" className="h-8 w-8 p-0"
                  onClick={(e) => startRenameCategory(type, catIndex, category.name, e)}
                  title="Renommer"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  onClick={() => deleteCategory(type, catIndex)}
                  title="Supprimer la catégorie"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent>
            <div className="space-y-3">
              {category.subcategories.map((subcat, idx) =>
                renderSubcategory(subcat, catIndex, idx, type)
              )}
              <Button
                size="sm" variant="outline" className="mt-2 h-8 text-xs border-dashed w-full"
                onClick={() => addSubcategory(type, catIndex)}
              >
                <Plus className="h-3 w-3 mr-1" /> Ajouter une sous-catégorie
              </Button>
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
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Waves className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Modèle BOQ Piscine</h1>
              <p className="text-gray-600">Structure du modèle utilisé lors de la génération d'un BOQ piscine</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={resetToDefaults} disabled={isSaving}>
              <RotateCcw className="h-4 w-4 mr-2" /> Réinitialiser
            </Button>
            <Button
              onClick={saveTemplates}
              disabled={!hasChanges || isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
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

      {/* Import from another shape */}
      <Card className="mb-6 border-purple-200 bg-purple-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Download className="h-5 w-5 text-purple-600 flex-shrink-0" />
            <span className="text-sm font-medium text-purple-900">Importer depuis un autre modèle :</span>
            <div className="flex items-center gap-2 flex-wrap">
              {SHAPES.filter(s => s !== activeShape).map(s => (
                <button
                  key={s}
                  onClick={() => setImportShape(s)}
                  className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
                    importShape === s
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50'
                  }`}
                >
                  {SHAPE_LABELS[s]}
                </button>
              ))}
              <Button
                size="sm"
                disabled={!importShape || isImporting}
                onClick={handleImport}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isImporting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
                Importer
              </Button>
            </div>
            <p className="text-xs text-purple-700 w-full">
              Copie toutes les catégories, sous-catégories et lignes. Les formules incompatibles sont conservées telles quelles et peuvent être corrigées ensuite.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">À propos de ce modèle — Piscine {SHAPE_LABELS[activeShape]}</p>
              <p>
                Cliquez sur <Edit className="inline h-3 w-3" /> pour modifier le nom d'une catégorie ou d'une ligne.
                Utilisez le bouton <Trash2 className="inline h-3 w-3" /> pour supprimer. Les boutons <strong>+ Ajouter</strong> créent de nouveaux éléments.
              </p>
              <p className="mt-2">
                <strong>Variables :</strong>{' '}
                {activeShape === 'Rectangulaire' && <>
                  <code className="bg-blue-100 px-1 rounded">longueur</code>{' '}
                  <code className="bg-blue-100 px-1 rounded">largeur</code>{' '}
                  <code className="bg-blue-100 px-1 rounded">profondeur</code>{' '}
                </>}
                {activeShape === 'L' && <>
                  <code className="bg-blue-100 px-1 rounded">longueur_la</code>{' '}
                  <code className="bg-blue-100 px-1 rounded">largeur_la</code>{' '}
                  <code className="bg-blue-100 px-1 rounded">profondeur_la</code>{' '}
                  <code className="bg-blue-100 px-1 rounded">longueur_lb</code>{' '}
                  <code className="bg-blue-100 px-1 rounded">largeur_lb</code>{' '}
                  <code className="bg-blue-100 px-1 rounded">profondeur_lb</code>{' '}
                </>}
                {activeShape === 'T' && <>
                  <code className="bg-blue-100 px-1 rounded">longueur_ta</code>{' '}
                  <code className="bg-blue-100 px-1 rounded">largeur_ta</code>{' '}
                  <code className="bg-blue-100 px-1 rounded">profondeur_ta</code>{' '}
                  <code className="bg-blue-100 px-1 rounded">longueur_tb</code>{' '}
                  <code className="bg-blue-100 px-1 rounded">largeur_tb</code>{' '}
                  <code className="bg-blue-100 px-1 rounded">profondeur_tb</code>{' '}
                </>}
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
            <span className="text-sm text-yellow-800 font-medium">⚠️ Modifications non sauvegardées</span>
            <Button size="sm" onClick={saveTemplates} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
              {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
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
                  <FileText className="h-4 w-4" /> Catégories de Base
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
                  <FileText className="h-4 w-4" /> Catégories Options
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Catégories de Base</h2>
              <Button size="sm" variant="outline" className="border-dashed" onClick={() => addCategory('base')}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter une catégorie de base
              </Button>
            </div>
            <div className="space-y-4">
              {baseTemplate.map((category, index) =>
                renderCategory(category, index, 'base', index)
              )}
              {baseTemplate.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Aucune catégorie de base. Cliquez sur "Ajouter" pour commencer.</p>
              )}
            </div>
          </div>

          {/* Option Categories */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Catégories Options</h2>
              <Button size="sm" variant="outline" className="border-dashed border-orange-400 text-orange-600 hover:bg-orange-50" onClick={() => addCategory('options')}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter une catégorie option
              </Button>
            </div>
            <div className="space-y-4">
              {optionsTemplate.map((category, index) =>
                renderCategory(category, baseTemplate.length + index, 'options', index)
              )}
              {optionsTemplate.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Aucune catégorie option. Cliquez sur "Ajouter" pour commencer.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PoolBOQTemplatePage;
