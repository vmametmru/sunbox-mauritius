import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Home,
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
  clearSavedModularBOQTemplates,
  getHardcodedModularBaseTemplate,
  getHardcodedModularOptionsTemplate,
  loadModularTemplateFromDB,
  saveModularTemplateToDB,
  validateFormulaSyntax,
  ModularBOQTemplateCategory,
  ModularBOQTemplateLine,
} from '@/lib/modular-formulas';

/* ======================================================
   Autocomplete constants
====================================================== */
const FORMULA_FUNCTIONS = ['CEIL', 'FLOOR', 'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'IF'];

const BASE_VARS = ['longueur', 'largeur', 'nombre_etages'];

const COMMON_DERIVED_VARS = [
  'surface_plancher_m2', 'surface_totale_m2', 'perimetre_m',
  'hauteur_etage_m', 'hauteur_totale_m', 'surface_murs_m2',
  'surface_toiture_m2', 'volume_m3', 'nb_portes', 'nb_fenetres',
];

const PRICE_LIST_OPTIONS = [
  "Main d'oeuvre Qualifiée (1 jour)",
  "Main d'oeuvre Non Qualifiée (1 jour)",
  'Transport Matériaux',
  'Location Grue (1 jour)',
  'Poutre IPE 200 (6m)',
  'Poutre HEA 160 (6m)',
  'Plaque de base 200x200x10mm',
  'Béton Toupie (fondations)',
  'Fer Y16 (barre de 9m)',
  'Fer Y12 (barre de 9m)',
  'Crusherrun',
  'Ciment (sac de 25kg)',
  'Sable (tonne)',
  'Panneau Sandwich 75mm (m²)',
  'Bloc BAB',
  'Tôle Ondulée Galvanisée (m²)',
  'Bac Acier (m²)',
  'Membrane Étanchéité (m²)',
  'Laine de Verre Isolation (m²)',
  'Carrelage Sol (m²)',
  'Parquet Stratifié (m²)',
  'Chape de Sol Béton (m²)',
  'Porte Extérieure PVC 90x210cm',
  'Porte Intérieure 80x200cm',
  'Fenêtre PVC Double Vitrage 100x120cm',
  'Fenêtre PVC Simple Vitrage 80x100cm',
  'Tuyaux PVC 50mm (mètre)',
  'Tableau Électrique (forfait)',
  "Câbles 2.5mm² (mètre)",
  'Electricien (1 jour)',
  'Plombier (1 jour)',
  'Peinture Intérieure (L)',
  'Peinture Extérieure (L)',
  'Colle Carrelage (sac de 25kg)',
];

const UNIT_OPTIONS = [
  'unité', 'jour', 'sac', 'barre', 'planche', 'tonne', 'kg', 'm²', 'm³',
  'mètre', 'bouteille', 'kit', 'forfait', 'lot', 'litre',
];

/* ======================================================
   FormulaInput – formula field with variable autocomplete
====================================================== */
interface FormulaInputProps {
  value: string;
  onChange: (value: string) => void;
  extraVars?: string[];
  error?: string | null;
}

const FormulaInput: React.FC<FormulaInputProps> = ({ value, onChange, extraVars = [], error }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [currentToken, setCurrentToken] = useState('');
  const [tokenStart, setTokenStart] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allSuggestions = [
    ...BASE_VARS,
    ...COMMON_DERIVED_VARS,
    ...extraVars,
    ...FORMULA_FUNCTIONS,
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;
    onChange(val);
    const before = val.slice(0, cursor);
    const match = before.match(/[a-zA-Z_][a-zA-Z0-9_]*$/);
    if (match) {
      const token = match[0];
      const start = cursor - token.length;
      setCurrentToken(token);
      setTokenStart(start);
      const filtered = allSuggestions.filter(s =>
        s.toLowerCase().startsWith(token.toLowerCase()) && s !== token
      );
      setSuggestions(filtered);
      setSelectedIdx(0);
    } else {
      setSuggestions([]);
    }
  };

  const applySuggestion = (suggestion: string) => {
    const cursor = inputRef.current?.selectionStart ?? value.length;
    const newVal = value.slice(0, tokenStart) + suggestion + value.slice(cursor);
    onChange(newVal);
    setSuggestions([]);
    setTimeout(() => {
      const newPos = tokenStart + suggestion.length;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applySuggestion(suggestions[selectedIdx]); }
    else if (e.key === 'Escape') { setSuggestions([]); }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        placeholder="Ex: surface_plancher_m2 * 1.6"
        className={`h-8 text-sm font-mono w-full rounded-md border px-3 py-1 focus:outline-none focus:ring-2 ${
          error ? 'border-red-400 focus:ring-red-300' : 'border-input focus:ring-ring'
        }`}
        autoComplete="off"
      />
      {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
      {suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-0.5 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg text-sm">
          {suggestions.map((s, i) => (
            <div
              key={s}
              className={`px-3 py-1.5 cursor-pointer font-mono ${
                i === selectedIdx ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-50'
              } ${FORMULA_FUNCTIONS.includes(s) ? 'text-purple-700' : 'text-blue-700'}`}
              onMouseDown={(e) => { e.preventDefault(); applySuggestion(s); }}
            >
              {s}{FORMULA_FUNCTIONS.includes(s) ? '()' : ''}
              <span className="ml-2 text-xs text-gray-400">
                {FORMULA_FUNCTIONS.includes(s) ? 'fonction' : 'variable'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ======================================================
   COMPONENT
====================================================== */
const ModularBOQTemplatePage: React.FC = () => {
  const { toast } = useToast();

  const [baseTemplate, setBaseTemplate] = useState<ModularBOQTemplateCategory[]>([]);
  const [optionsTemplate, setOptionsTemplate] = useState<ModularBOQTemplateCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Inline edit state for lines
  const [editingLine, setEditingLine] = useState<{
    type: 'base' | 'options';
    catIndex: number;
    lineIndex: number;
  } | null>(null);
  const [editForm, setEditForm] = useState<Partial<ModularBOQTemplateLine>>({});
  const [formulaError, setFormulaError] = useState<string | null>(null);

  // Inline rename state for categories
  const [renamingCat, setRenamingCat] = useState<{ type: 'base' | 'options'; catIndex: number } | null>(null);
  const [renameCatValue, setRenameCatValue] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    setExpandedCategories([]);
    setEditingLine(null);
    setEditForm({});
    setRenamingCat(null);
    try {
      const { base, options } = await loadModularTemplateFromDB();
      if (base && base.length > 0) {
        setBaseTemplate(base);
        setOptionsTemplate(options ?? getHardcodedModularOptionsTemplate());
      } else {
        setBaseTemplate(getHardcodedModularBaseTemplate());
        setOptionsTemplate(getHardcodedModularOptionsTemplate());
      }
      setHasChanges(false);
    } catch (err: any) {
      setBaseTemplate(getHardcodedModularBaseTemplate());
      setOptionsTemplate(getHardcodedModularOptionsTemplate());
      setHasChanges(false);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (index: number) => {
    setExpandedCategories(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  /* ======================================================
     SAVE / RESET
  ====================================================== */
  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveModularTemplateToDB(baseTemplate, optionsTemplate);
      clearSavedModularBOQTemplates();
      setHasChanges(false);
      toast({ title: 'Succès', description: 'Modèle BOQ sauvegardé en base de données' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm('Réinitialiser au modèle par défaut ? Toutes les modifications non sauvegardées seront perdues.')) return;
    clearSavedModularBOQTemplates();
    setBaseTemplate(getHardcodedModularBaseTemplate());
    setOptionsTemplate(getHardcodedModularOptionsTemplate());
    setExpandedCategories([]);
    setEditingLine(null);
    setEditForm({});
    setRenamingCat(null);
    setHasChanges(true);
    toast({ title: 'Réinitialisé', description: 'Modèle remis aux valeurs par défaut. Sauvegardez pour persister.' });
  };

  /* ======================================================
     CATEGORY OPERATIONS
  ====================================================== */
  const addCategory = (type: 'base' | 'options') => {
    const template = type === 'base' ? baseTemplate : optionsTemplate;
    const newCat: ModularBOQTemplateCategory = {
      id: `cat_${Date.now()}`,
      name: 'Nouvelle catégorie',
      is_option: type === 'options',
      qty_editable: type === 'options',
      display_order: template.length + 1,
      lines: [],
    };
    const setter = type === 'base' ? setBaseTemplate : setOptionsTemplate;
    setter(prev => [...prev, newCat]);
    const newIdx = template.length;
    setExpandedCategories(prev => [...prev, newIdx]);
    setHasChanges(true);
  };

  const deleteCategory = (type: 'base' | 'options', catIndex: number) => {
    if (!confirm('Supprimer cette catégorie et toutes ses lignes ?')) return;
    const setter = type === 'base' ? setBaseTemplate : setOptionsTemplate;
    setter(prev => prev.filter((_, i) => i !== catIndex));
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
     LINE OPERATIONS
  ====================================================== */
  const startEditLine = (
    type: 'base' | 'options',
    catIndex: number,
    lineIndex: number,
    line: ModularBOQTemplateLine,
  ) => {
    setEditingLine({ type, catIndex, lineIndex });
    setEditForm({ ...line });
    setFormulaError(null);
  };

  const cancelEdit = () => {
    setEditingLine(null);
    setEditForm({});
    setFormulaError(null);
  };

  const applyEdit = () => {
    if (!editingLine) return;
    const formula = editForm.quantity_formula ?? '';
    if (formula.trim()) {
      const validation = validateFormulaSyntax(formula);
      if (!validation.valid) {
        setFormulaError(validation.error ?? 'Erreur de syntaxe');
        return;
      }
    }
    setFormulaError(null);
    const { type, catIndex, lineIndex } = editingLine;
    const setter = type === 'base' ? setBaseTemplate : setOptionsTemplate;
    setter(prev => prev.map((cat, ci) => {
      if (ci !== catIndex) return cat;
      return {
        ...cat,
        lines: cat.lines.map((line, li) => {
          if (li !== lineIndex) return line;
          return {
            ...line,
            description: editForm.description ?? line.description,
            quantity_formula: editForm.quantity_formula ?? line.quantity_formula,
            unit: editForm.unit ?? line.unit,
            price_list_name: editForm.price_list_name ?? line.price_list_name,
            margin_percent: editForm.margin_percent ?? line.margin_percent,
          };
        }),
      };
    }));
    setHasChanges(true);
    setEditingLine(null);
    setEditForm({});
  };

  const deleteLine = (type: 'base' | 'options', catIndex: number, lineIndex: number) => {
    if (!confirm('Supprimer cette ligne du modèle ?')) return;
    const setter = type === 'base' ? setBaseTemplate : setOptionsTemplate;
    setter(prev => prev.map((cat, ci) =>
      ci !== catIndex ? cat : { ...cat, lines: cat.lines.filter((_, li) => li !== lineIndex) }
    ));
    setHasChanges(true);
  };

  const addLine = (type: 'base' | 'options', catIndex: number) => {
    const newLine: ModularBOQTemplateLine = {
      id: `line_${Date.now()}`,
      description: 'Nouvelle ligne',
      quantity_formula: '1',
      unit: 'unité',
      unit_cost_formula: '0',
      price_list_name: '',
      margin_percent: 10,
      display_order: 1,
    };
    const setter = type === 'base' ? setBaseTemplate : setOptionsTemplate;
    setter(prev => prev.map((cat, ci) =>
      ci !== catIndex ? cat : { ...cat, lines: [...cat.lines, newLine] }
    ));
    setHasChanges(true);
  };

  /* ======================================================
     RENDER HELPERS
  ====================================================== */
  const renderLine = (
    line: ModularBOQTemplateLine,
    lineIndex: number,
    type: 'base' | 'options',
    catIndex: number,
  ) => {
    const isEditing =
      editingLine?.type === type &&
      editingLine.catIndex === catIndex &&
      editingLine.lineIndex === lineIndex;

    if (isEditing) {
      return (
        <div key={lineIndex} className="border-l-2 border-blue-400 pl-4 py-2 bg-blue-50 rounded-r space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-500 min-w-[30px]">{lineIndex + 1}.</span>
            <Input
              value={editForm.description ?? ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description"
              className="flex-1 h-8 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 ml-10">
            <div>
              <p className="text-xs text-gray-500 mb-1">Formule Qté</p>
              <FormulaInput
                value={editForm.quantity_formula ?? ''}
                onChange={(v) => setEditForm(prev => ({ ...prev, quantity_formula: v }))}
                error={formulaError}
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Unité</p>
              <select
                value={editForm.unit ?? 'unité'}
                onChange={(e) => setEditForm(prev => ({ ...prev, unit: e.target.value }))}
                className="h-8 text-sm w-full rounded-md border border-input px-2 bg-white"
              >
                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Article base de prix</p>
              <select
                value={editForm.price_list_name ?? ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, price_list_name: e.target.value }))}
                className="h-8 text-sm w-full rounded-md border border-input px-2 bg-white"
              >
                <option value="">— saisir manuellement —</option>
                {PRICE_LIST_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Marge (%)</p>
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={editForm.margin_percent ?? 10}
                onChange={(e) => setEditForm(prev => ({ ...prev, margin_percent: parseFloat(e.target.value) || 0 }))}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 ml-10">
            <Button size="sm" onClick={applyEdit} className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white">
              <Check className="h-3 w-3 mr-1" />OK
            </Button>
            <Button size="sm" variant="outline" onClick={cancelEdit} className="h-7 px-3">
              <X className="h-3 w-3 mr-1" />Annuler
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div key={lineIndex} className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded group">
        <span className="font-mono text-xs text-gray-400 w-6">{lineIndex + 1}.</span>
        <span className="flex-1 text-sm">{line.description}</span>
        <span className="text-xs font-mono text-blue-600 hidden sm:block">{line.quantity_formula}</span>
        <Badge variant="outline" className="text-xs hidden md:inline-flex">{line.unit}</Badge>
        {line.price_list_name && (
          <span className="text-xs text-gray-500 hidden lg:block max-w-[200px] truncate">{line.price_list_name}</span>
        )}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => startEditLine(type, catIndex, lineIndex, line)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-red-500"
            onClick={() => deleteLine(type, catIndex, lineIndex)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  const renderCategory = (cat: ModularBOQTemplateCategory, catIndex: number, type: 'base' | 'options', offset: number) => {
    const realIndex = offset + catIndex;
    const isExpanded = expandedCategories.includes(realIndex);
    const isRenaming = renamingCat?.type === type && renamingCat.catIndex === catIndex;

    return (
      <div key={catIndex} className="border rounded-lg overflow-hidden">
        <div
          className={`flex items-center gap-2 px-4 py-3 cursor-pointer select-none transition-colors ${
            isExpanded ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'
          }`}
          onClick={() => toggleCategory(realIndex)}
        >
          {isExpanded
            ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
            : <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />}

          {isRenaming ? (
            <div className="flex items-center gap-2 flex-1" onClick={e => e.stopPropagation()}>
              <Input
                value={renameCatValue}
                onChange={e => setRenameCatValue(e.target.value)}
                className="h-7 text-sm flex-1"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') applyRenameCategory(); else if (e.key === 'Escape') setRenamingCat(null); }}
              />
              <Button size="sm" onClick={applyRenameCategory} className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white">
                <Check className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRenamingCat(null)} className="h-7 px-2">
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <>
              <span className="font-semibold flex-1">{cat.name}</span>
              <Badge variant="outline" className="text-xs">{cat.lines.length} lignes</Badge>
              {type === 'options' && (
                <Badge className="text-xs bg-purple-100 text-purple-800 hover:bg-purple-100">Option</Badge>
              )}
              <div className="flex gap-1 ml-2" onClick={e => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={e => startRenameCategory(type, catIndex, cat.name, e)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500"
                  onClick={() => deleteCategory(type, catIndex)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </>
          )}
        </div>

        {isExpanded && (
          <div className="border-t px-4 py-3 space-y-1 bg-white">
            {cat.lines.length === 0 && (
              <p className="text-sm text-muted-foreground italic">Aucune ligne — cliquez sur Ajouter</p>
            )}
            {cat.lines.map((line, li) =>
              renderLine(line, li, type, catIndex)
            )}
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => addLine(type, catIndex)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Ajouter une ligne
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ======================================================
     RENDER
  ====================================================== */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <span className="ml-3 text-muted-foreground">Chargement du modèle BOQ…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Home className="h-7 w-7 text-orange-500" />
            Modèle BOQ — Maisons Modulaires
          </h1>
          <p className="text-muted-foreground mt-1">
            Configurez la structure de calcul du BOQ pour les maisons modulaires.
            Les formules utilisent les variables : <code className="text-xs bg-gray-100 px-1 rounded">longueur</code>,{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">largeur</code>,{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">nombre_etages</code> et les variables dérivées.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {hasChanges && (
            <div className="flex items-center gap-1 text-amber-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Modifications non sauvegardées</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Réinitialiser
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="gap-2 bg-orange-500 hover:bg-orange-600"
          >
            {isSaving
              ? <><Loader2 className="h-4 w-4 animate-spin" />Sauvegarde…</>
              : <><Save className="h-4 w-4" />Sauvegarder</>}
          </Button>
        </div>
      </div>

      {/* Base template */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Corps du BOQ (lignes fixes)</CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => addCategory('base')}
            >
              <Plus className="h-3 w-3" />
              Catégorie
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {baseTemplate.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune catégorie — cliquez sur &ldquo;Catégorie&rdquo; pour en ajouter une.
            </p>
          ) : (
            baseTemplate.map((cat, ci) => renderCategory(cat, ci, 'base', 0))
          )}
        </CardContent>
      </Card>

      {/* Options template */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Options (lignes optionnelles)</CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => addCategory('options')}
            >
              <Plus className="h-3 w-3" />
              Option
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {optionsTemplate.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune option — cliquez sur &ldquo;Option&rdquo; pour en ajouter une.
            </p>
          ) : (
            optionsTemplate.map((cat, ci) =>
              renderCategory(cat, ci, 'options', baseTemplate.length)
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ModularBOQTemplatePage;
