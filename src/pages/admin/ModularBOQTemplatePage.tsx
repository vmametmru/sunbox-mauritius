import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  Calculator,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import type { ModelType, ModelTypeDimension } from '@/lib/api';
import {
  clearSavedModularBOQTemplates,
  loadModularTemplateFromDB,
  saveModularTemplateToDB,
  validateFormulaSyntax,
  evaluateModularVariables,
  ModularBOQTemplateCategory,
  ModularBOQTemplateLine,
  ModularBOQTemplateSubcategory,
  type ModularVariable,
} from '@/lib/modular-formulas';
import { evaluateFormula } from '@/lib/pool-formulas';

/* ======================================================
   Autocomplete constants
====================================================== */
const FORMULA_FUNCTIONS = ['CEIL', 'FLOOR', 'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'IF'];

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
  /** All available variable/dimension names — will be combined with FORMULA_FUNCTIONS */
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

  /* ── Custom model types ── */
  const [customTypes, setCustomTypes]   = useState<ModelType[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>('');
  const [typeDimensions, setTypeDimensions] = useState<ModelTypeDimension[]>([]);
  const [typeVariables, setTypeVariables]   = useState<ModularVariable[]>([]);

  const [baseTemplate, setBaseTemplate] = useState<ModularBOQTemplateCategory[]>([]);
  const [optionsTemplate, setOptionsTemplate] = useState<ModularBOQTemplateCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Inline edit state for lines
  const [editingLine, setEditingLine] = useState<{
    type: 'base' | 'options';
    catIndex: number;
    lineIndex: number;
    subIndex?: number;
  } | null>(null);
  const [editForm, setEditForm] = useState<Partial<ModularBOQTemplateLine>>({});
  const [formulaError, setFormulaError] = useState<string | null>(null);

  // Inline rename state for categories
  const [renamingCat, setRenamingCat] = useState<{ type: 'base' | 'options'; catIndex: number } | null>(null);
  const [renameCatValue, setRenameCatValue] = useState('');

  // Inline rename state for subcategories
  const [renamingSubcat, setRenamingSubcat] = useState<{ type: 'base' | 'options'; catIndex: number; subIndex: number } | null>(null);
  const [renameSubcatValue, setRenameSubcatValue] = useState('');

  // ── Simulator state ──
  const [simValues, setSimValues] = useState<Record<string, number>>({});
  const [priceList, setPriceList] = useState<Array<{ name: string; unit_price: number }>>([]);

  // All available variable names for autocomplete (dims + derived vars)
  const availableVars = [
    ...typeDimensions.map(d => d.slug),
    ...typeVariables.map(v => v.name),
  ];

  // price name → unit_price lookup
  const priceMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const item of priceList) m[item.name] = item.unit_price;
    return m;
  }, [priceList]);

  // Compute full variable context from simValues + typeVariables
  const simVarContext = useMemo(() => {
    if (Object.keys(simValues).length === 0 && typeDimensions.length > 0) return null;
    if (Object.keys(simValues).length === 0) return null;
    return evaluateModularVariables(simValues, typeVariables);
  }, [simValues, typeVariables, typeDimensions]);

  // Resolve prix('name') or prix("name") in a formula string
  const resolvePrix = useCallback((formula: string): string => {
    return formula
      .replace(/prix\('((?:[^']|'')*)'\)/g, (_match, raw: string) => {
        const name = raw.replace(/''/g, "'");
        return String(priceMap[name] ?? 0);
      })
      .replace(/prix\("([^"]*)"\)/g, (_match, name: string) => {
        return String(priceMap[name] ?? 0);
      });
  }, [priceMap]);

  // Compute a single BOQ line's qty, unitCost, costTotalHT, totalSaleHT
  const computeLine = useCallback((line: ModularBOQTemplateLine): { qty: number; unitCost: number; costTotalHT: number; totalSaleHT: number } | null => {
    if (!simVarContext) return null;
    try {
      const qty = evaluateFormula(line.quantity_formula || '0', simVarContext);
      // Unit cost: prefer price_list_name lookup, else evaluate unit_cost_formula with prix resolved
      let unitCost = 0;
      if (line.price_list_name && priceMap[line.price_list_name] !== undefined) {
        unitCost = priceMap[line.price_list_name];
      } else if (line.unit_cost_formula) {
        const resolved = resolvePrix(line.unit_cost_formula);
        unitCost = evaluateFormula(resolved, simVarContext);
      }
      const margin = (line.margin_percent ?? 0) / 100;
      const costTotalHT = qty * unitCost;
      const totalSaleHT = costTotalHT * (1 + margin);
      return { qty, unitCost, costTotalHT, totalSaleHT };
    } catch {
      return null;
    }
  }, [simVarContext, priceMap, resolvePrix]);

  /* Load price list on mount */
  useEffect(() => {
    api.getModularBOQPriceList().then((data: any) => {
      if (Array.isArray(data)) {
        setPriceList(data.map((item: any) => ({
          name: String(item.name),
          unit_price: Number(item.unit_price ?? 0),
        })));
      }
    }).catch(() => {});
  }, []);

  /* Navigation guard – beforeunload */
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => { e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasChanges]);

  /* Navigation guard – hashchange */
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: HashChangeEvent) => {
      if (!window.confirm('Vous avez des modifications non sauvegardées dans le modèle BOQ. Quitter quand même ?')) {
        history.replaceState(null, '', e.oldURL.replace(/^[^#]*/, ''));
      }
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, [hasChanges]);

  /* Load custom types on mount */
  useEffect(() => {
    api.getModelTypes(false).then((types: any) => {
      const t = (Array.isArray(types) ? types : []) as ModelType[];
      setCustomTypes(t);
    }).catch(() => {});
  }, []);

  /* When type changes → load dimensions, variables, and template */
  useEffect(() => {
    if (!selectedSlug) {
      setTypeDimensions([]);
      setTypeVariables([]);
      setBaseTemplate([]);
      setOptionsTemplate([]);
      setSimValues({});
      setHasChanges(false);
      return;
    }
    // Load dimensions and variables in parallel
    Promise.all([
      api.getModelTypeDimensions(selectedSlug),
      api.getModularBOQVariables(selectedSlug),
    ]).then(([dims, vars]) => {
      const d = (Array.isArray(dims) ? dims : []) as ModelTypeDimension[];
      setTypeDimensions(d);
      setTypeVariables((Array.isArray(vars) ? vars : []) as ModularVariable[]);
      // Init simulator with default values
      const init: Record<string, number> = {};
      for (const dim of d) init[dim.slug] = Number(dim.default_value ?? 0);
      setSimValues(init);
    }).catch(() => {});
    loadTemplates(selectedSlug);
  }, [selectedSlug]);

  const loadTemplates = async (typeSlug: string) => {
    setIsLoading(true);
    setExpandedCategories([]);
    setEditingLine(null);
    setEditForm({});
    setRenamingCat(null);
    setRenamingSubcat(null);
    try {
      const { base, options } = await loadModularTemplateFromDB(typeSlug);
      if (base && base.length > 0) {
        setBaseTemplate(base);
        setOptionsTemplate(options ?? []);
      } else {
        setBaseTemplate([]);
        setOptionsTemplate([]);
      }
      setHasChanges(false);
    } catch (err: any) {
      setBaseTemplate([]);
      setOptionsTemplate([]);
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
    if (!selectedSlug) return;
    try {
      setIsSaving(true);
      await saveModularTemplateToDB(baseTemplate, optionsTemplate, selectedSlug);
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
    if (!confirm('Réinitialiser le modèle à vide ? Toutes les modifications non sauvegardées seront perdues.')) return;
    clearSavedModularBOQTemplates();
    setBaseTemplate([]);
    setOptionsTemplate([]);
    setExpandedCategories([]);
    setEditingLine(null);
    setEditForm({});
    setRenamingCat(null);
    setRenamingSubcat(null);
    setHasChanges(true);
    toast({ title: 'Réinitialisé', description: 'Modèle remis à vide. Sauvegardez pour persister.' });
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
    subIndex?: number,
  ) => {
    setEditingLine({ type, catIndex, lineIndex, subIndex });
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
    const { type, catIndex, lineIndex, subIndex } = editingLine;
    const setter = type === 'base' ? setBaseTemplate : setOptionsTemplate;
    setter(prev => prev.map((cat, ci) => {
      if (ci !== catIndex) return cat;
      const updatedLine = (line: ModularBOQTemplateLine) => ({
        ...line,
        description: editForm.description ?? line.description,
        quantity_formula: editForm.quantity_formula ?? line.quantity_formula,
        unit: editForm.unit ?? line.unit,
        price_list_name: editForm.price_list_name ?? line.price_list_name,
        margin_percent: editForm.margin_percent ?? line.margin_percent,
        qty_editable: editForm.qty_editable ?? line.qty_editable ?? false,
      });
      if (subIndex === undefined) {
        return { ...cat, lines: cat.lines.map((line, li) => li === lineIndex ? updatedLine(line) : line) };
      }
      return {
        ...cat,
        subcategories: (cat.subcategories ?? []).map((sub, si) =>
          si !== subIndex ? sub : { ...sub, lines: sub.lines.map((line, li) => li === lineIndex ? updatedLine(line) : line) }
        ),
      };
    }));
    setHasChanges(true);
    setEditingLine(null);
    setEditForm({});
  };

  const deleteLine = (type: 'base' | 'options', catIndex: number, lineIndex: number, subIndex?: number) => {
    if (!confirm('Supprimer cette ligne du modèle ?')) return;
    const setter = type === 'base' ? setBaseTemplate : setOptionsTemplate;
    setter(prev => prev.map((cat, ci) => {
      if (ci !== catIndex) return cat;
      if (subIndex === undefined) {
        return { ...cat, lines: cat.lines.filter((_, li) => li !== lineIndex) };
      }
      return {
        ...cat,
        subcategories: (cat.subcategories ?? []).map((sub, si) =>
          si !== subIndex ? sub : { ...sub, lines: sub.lines.filter((_, li) => li !== lineIndex) }
        ),
      };
    }));
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
      qty_editable: false,
    };
    const setter = type === 'base' ? setBaseTemplate : setOptionsTemplate;
    setter(prev => prev.map((cat, ci) =>
      ci !== catIndex ? cat : { ...cat, lines: [...cat.lines, newLine] }
    ));
    setHasChanges(true);
  };

  /* ======================================================
     SUBCATEGORY OPERATIONS
  ====================================================== */
  const addSubcategory = (type: 'base' | 'options', catIndex: number) => {
    const setter = type === 'base' ? setBaseTemplate : setOptionsTemplate;
    setter(prev => prev.map((cat, ci) => {
      if (ci !== catIndex) return cat;
      const existing = cat.subcategories ?? [];
      const newSub: ModularBOQTemplateSubcategory = {
        id: `sub_${Date.now()}`,
        name: 'Nouvelle sous-catégorie',
        is_option: type === 'options',
        qty_editable: false,
        display_order: existing.length + 1,
        lines: [],
      };
      return { ...cat, subcategories: [...existing, newSub] };
    }));
    setHasChanges(true);
  };

  const deleteSubcategory = (type: 'base' | 'options', catIndex: number, subIndex: number) => {
    if (!confirm('Supprimer cette sous-catégorie et toutes ses lignes ?')) return;
    const setter = type === 'base' ? setBaseTemplate : setOptionsTemplate;
    setter(prev => prev.map((cat, ci) =>
      ci !== catIndex ? cat : { ...cat, subcategories: (cat.subcategories ?? []).filter((_, si) => si !== subIndex) }
    ));
    setHasChanges(true);
  };

  const startRenameSubcategory = (type: 'base' | 'options', catIndex: number, subIndex: number, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingSubcat({ type, catIndex, subIndex });
    setRenameSubcatValue(name);
  };

  const applyRenameSubcategory = () => {
    if (!renamingSubcat) return;
    const { type, catIndex, subIndex } = renamingSubcat;
    const setter = type === 'base' ? setBaseTemplate : setOptionsTemplate;
    setter(prev => prev.map((cat, ci) =>
      ci !== catIndex ? cat : {
        ...cat,
        subcategories: (cat.subcategories ?? []).map((sub, si) =>
          si !== subIndex ? sub : { ...sub, name: renameSubcatValue }
        ),
      }
    ));
    setRenamingSubcat(null);
    setHasChanges(true);
  };

  const addLineToSubcategory = (type: 'base' | 'options', catIndex: number, subIndex: number) => {
    const newLine: ModularBOQTemplateLine = {
      id: `line_${Date.now()}`,
      description: 'Nouvelle ligne',
      quantity_formula: '1',
      unit: 'unité',
      unit_cost_formula: '0',
      price_list_name: '',
      margin_percent: 10,
      display_order: 1,
      qty_editable: false,
    };
    const setter = type === 'base' ? setBaseTemplate : setOptionsTemplate;
    setter(prev => prev.map((cat, ci) =>
      ci !== catIndex ? cat : {
        ...cat,
        subcategories: (cat.subcategories ?? []).map((sub, si) =>
          si !== subIndex ? sub : { ...sub, lines: [...sub.lines, newLine] }
        ),
      }
    ));
    setHasChanges(true);
  };

  const deleteLineFromSubcategory = (type: 'base' | 'options', catIndex: number, subIndex: number, lineIndex: number) => {
    deleteLine(type, catIndex, lineIndex, subIndex);
  };

  const toggleCategoryQtyEditable = (type: 'base' | 'options', catIndex: number) => {
    const setter = type === 'base' ? setBaseTemplate : setOptionsTemplate;
    setter(prev => prev.map((cat, ci) =>
      ci !== catIndex ? cat : { ...cat, qty_editable: !cat.qty_editable }
    ));
    setHasChanges(true);
  };

  const toggleSubcatQtyEditable = (type: 'base' | 'options', catIndex: number, subIndex: number) => {
    const setter = type === 'base' ? setBaseTemplate : setOptionsTemplate;
    setter(prev => prev.map((cat, ci) =>
      ci !== catIndex ? cat : {
        ...cat,
        subcategories: (cat.subcategories ?? []).map((sub, si) =>
          si !== subIndex ? sub : { ...sub, qty_editable: !sub.qty_editable }
        ),
      }
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
    subIndex?: number,
  ) => {
    const isEditing =
      editingLine?.type === type &&
      editingLine.catIndex === catIndex &&
      editingLine.lineIndex === lineIndex &&
      editingLine.subIndex === subIndex;

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
                extraVars={availableVars}
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
                {priceList.length > 0
                  ? priceList.map(p => (
                      <option key={p.name} value={p.name}>
                        {p.name} — {p.unit_price.toLocaleString('fr-MU', { maximumFractionDigits: 0 })} Rs
                      </option>
                    ))
                  : PRICE_LIST_OPTIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))
                }
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
          {type === 'options' && (
            <div className="flex items-center gap-2 ml-10">
              <input
                type="checkbox"
                id={`qty_editable_${catIndex}_${subIndex ?? 'x'}_${lineIndex}`}
                checked={editForm.qty_editable ?? false}
                onChange={e => setEditForm(prev => ({ ...prev, qty_editable: e.target.checked }))}
                className="h-4 w-4"
              />
              <Label htmlFor={`qty_editable_${catIndex}_${subIndex ?? 'x'}_${lineIndex}`} className="text-xs cursor-pointer">
                Qté Réglable
              </Label>
            </div>
          )}
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

    const computed = computeLine(line);
    return (
      <div key={lineIndex} className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 rounded group">
        <span className="font-mono text-xs text-gray-400 w-6">{lineIndex + 1}.</span>
        <span className="flex-1 text-sm min-w-0 truncate">{line.description}</span>
        {type === 'options' && line.qty_editable && (
          <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100 shrink-0">Qté ✓</Badge>
        )}
        {computed ? (
          <>
            <span className="text-xs font-mono text-green-700 w-14 text-right shrink-0">{computed.qty % 1 === 0 ? computed.qty : computed.qty.toFixed(2)}</span>
            <Badge variant="outline" className="text-xs shrink-0">{line.unit}</Badge>
            <span className="text-xs font-mono text-gray-600 w-20 text-right shrink-0">{computed.unitCost.toLocaleString('fr-MU', { maximumFractionDigits: 0 })} Rs</span>
            <span className="text-xs font-mono text-gray-500 w-24 text-right shrink-0">{computed.costTotalHT.toLocaleString('fr-MU', { maximumFractionDigits: 0 })} Rs</span>
            <span className="text-xs font-bold text-orange-700 w-24 text-right shrink-0">{computed.totalSaleHT.toLocaleString('fr-MU', { maximumFractionDigits: 0 })} Rs</span>
          </>
        ) : (
          <>
            <span className="text-xs font-mono text-blue-600 hidden sm:block">{line.quantity_formula}</span>
            <Badge variant="outline" className="text-xs hidden md:inline-flex">{line.unit}</Badge>
            {line.price_list_name && (
              <span className="text-xs text-gray-500 hidden lg:block max-w-[200px] truncate">{line.price_list_name}</span>
            )}
          </>
        )}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => startEditLine(type, catIndex, lineIndex, line, subIndex)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-red-500"
            onClick={() => subIndex !== undefined
              ? deleteLineFromSubcategory(type, catIndex, subIndex, lineIndex)
              : deleteLine(type, catIndex, lineIndex)
            }
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
                <>
                  <Badge className="text-xs bg-purple-100 text-purple-800 hover:bg-purple-100">Option</Badge>
                  <Badge
                    className={`text-xs cursor-pointer ${cat.qty_editable ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    onClick={e => { e.stopPropagation(); toggleCategoryQtyEditable(type, catIndex); }}
                  >
                    Qté {cat.qty_editable ? '✓' : '—'}
                  </Badge>
                </>
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

            {(cat.subcategories ?? []).map((sub, si) => {
              const isRenamingSub = renamingSubcat?.type === type && renamingSubcat.catIndex === catIndex && renamingSubcat.subIndex === si;
              return (
                <div key={si} className="ml-4 border-l-2 border-gray-200 pl-3 mt-3">
                  <div className="flex items-center gap-2 py-1 group">
                    {isRenamingSub ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={renameSubcatValue}
                          onChange={e => setRenameSubcatValue(e.target.value)}
                          className="h-7 text-sm flex-1"
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') applyRenameSubcategory(); else if (e.key === 'Escape') setRenamingSubcat(null); }}
                        />
                        <Button size="sm" onClick={applyRenameSubcategory} className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white">
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRenamingSubcat(null)} className="h-7 px-2">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-sm flex-1">{sub.name}</span>
                        <Badge variant="outline" className="text-xs">Sous-cat</Badge>
                        {type === 'options' && (
                          <Badge
                            className={`text-xs cursor-pointer ${sub.qty_editable ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            onClick={() => toggleSubcatQtyEditable(type, catIndex, si)}
                          >
                            Qté {sub.qty_editable ? '✓' : '—'}
                          </Badge>
                        )}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={e => startRenameSubcategory(type, catIndex, si, sub.name, e)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500"
                            onClick={() => deleteSubcategory(type, catIndex, si)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="space-y-1">
                    {sub.lines.length === 0 && (
                      <p className="text-xs text-muted-foreground italic ml-2">Aucune ligne</p>
                    )}
                    {sub.lines.map((line, li) => renderLine(line, li, type, catIndex, si))}
                    <div className="pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => addLineToSubcategory(type, catIndex, si)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Ajouter une ligne
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => addSubcategory(type, catIndex)}
              >
                <Plus className="h-3 w-3" />
                Ajouter une sous-catégorie
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
            Modèle BOQ — Solutions Personnalisées
          </h1>
          <p className="text-muted-foreground mt-1">
            Configurez la structure de calcul du BOQ pour chaque type personnalisé.
            Les formules utilisent les dimensions et variables configurées pour le type sélectionné.
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
            disabled={!selectedSlug}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Réinitialiser
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !hasChanges || !selectedSlug}
            className="gap-2 bg-orange-500 hover:bg-orange-600"
          >
            {isSaving
              ? <><Loader2 className="h-4 w-4 animate-spin" />Sauvegarde…</>
              : <><Save className="h-4 w-4" />Sauvegarder</>}
          </Button>
        </div>
      </div>

      {/* Type selector */}
      <Card>
        <CardContent className="pt-4 pb-4">
          {customTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Aucun type personnalisé configuré. Créez-en un dans{' '}
              <a href="#/admin/model-types" className="underline text-orange-600">Types de Solutions</a>.
            </p>
          ) : (
            <div className="flex items-center gap-3">
              <Label className="whitespace-nowrap font-medium">Type de modèle</Label>
              <Select value={selectedSlug} onValueChange={setSelectedSlug}>
                <SelectTrigger className="w-72">
                  <SelectValue placeholder="— Sélectionner un type pour modifier son BOQ —" />
                </SelectTrigger>
                <SelectContent>
                  {customTypes.map(t => (
                    <SelectItem key={t.slug} value={t.slug}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSlug && (
                <span className="text-sm text-muted-foreground">
                  {typeDimensions.length} dimension{typeDimensions.length !== 1 ? 's' : ''} ·{' '}
                  {typeVariables.length} variable{typeVariables.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prompt when no type selected */}
      {!selectedSlug ? (
        <p className="text-center text-muted-foreground py-12 italic">
          Sélectionnez un type de modèle ci-dessus pour créer ou modifier son modèle BOQ.
        </p>
      ) : isLoading ? (
        <p className="text-center text-muted-foreground py-12">Chargement…</p>
      ) : (
        <>
      {/* ── Simulator card ─────────────────────────────────────── */}
      {typeDimensions.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-green-800">
              <Calculator className="h-4 w-4" />
              Simulateur de calcul BOQ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dimension inputs */}
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${Math.min(typeDimensions.length, 4)}, minmax(0, 1fr))` }}
            >
              {[...typeDimensions].sort((a, b) => a.display_order - b.display_order).map(dim => (
                <div key={dim.slug} className="space-y-1">
                  <Label className="text-xs text-green-700">
                    {dim.label}{dim.unit ? ` (${dim.unit})` : ''}
                  </Label>
                  <Input
                    type="number"
                    min={dim.min_value}
                    max={dim.max_value}
                    step={dim.step}
                    value={simValues[dim.slug] ?? dim.default_value ?? 0}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      setSimValues(prev => ({ ...prev, [dim.slug]: isNaN(v) ? 0 : v }));
                    }}
                    className="h-8 text-sm bg-white"
                  />
                </div>
              ))}
            </div>

            {/* Computed variables */}
            {simVarContext && typeVariables.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {[...typeVariables].sort((a, b) => a.display_order - b.display_order).map(v => (
                  <div key={v.name} className="bg-white border border-green-200 rounded px-2 py-1 text-xs">
                    <span className="font-mono text-green-700">{v.name}</span>
                    <span className="text-gray-500 mx-1">=</span>
                    <span className="font-bold text-green-900">
                      {(() => {
                        const val = simVarContext[v.name];
                        return val === undefined ? '?' : (Number.isInteger(val) ? val : val.toFixed(2));
                      })()}
                      {v.unit ? <span className="ml-0.5 text-gray-500">{v.unit}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Full BOQ preview table */}
            {simVarContext && (baseTemplate.length > 0 || optionsTemplate.length > 0) && (() => {
              // Collect all lines with category heading
              const allSections: Array<{ catName: string; isOption: boolean; lines: ModularBOQTemplateLine[] }> = [];
              for (const c of baseTemplate) {
                allSections.push({ catName: c.name, isOption: false, lines: c.lines });
                for (const sub of c.subcategories ?? []) {
                  allSections.push({ catName: sub.name, isOption: false, lines: sub.lines });
                }
              }
              for (const c of optionsTemplate) {
                allSections.push({ catName: c.name, isOption: true, lines: c.lines });
                for (const sub of c.subcategories ?? []) {
                  allSections.push({ catName: sub.name, isOption: true, lines: sub.lines });
                }
              }
              let baseTotal = 0;
              const rows: Array<{ desc: string; qty: number; unit: string; unitCost: number; costTotalHT: number; totalSaleHT: number; isOption: boolean; catName?: string }> = [];
              for (const sec of allSections) {
                let first = true;
                for (const line of sec.lines) {
                  const vals = computeLine(line);
                  if (!vals) continue;
                  rows.push({ desc: line.description, qty: vals.qty, unit: line.unit, unitCost: vals.unitCost, costTotalHT: vals.costTotalHT, totalSaleHT: vals.totalSaleHT, isOption: sec.isOption, catName: first ? sec.catName : undefined });
                  if (!sec.isOption) baseTotal += vals.totalSaleHT;
                  first = false;
                }
              }
              if (rows.length === 0) return null;
              const fmt = (n: number) => n.toLocaleString('fr-MU', { maximumFractionDigits: 0 });
              return (
                <div className="overflow-x-auto rounded-lg border border-green-200 bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-green-100 text-green-800">
                        <th className="text-left px-3 py-2 font-medium">Description</th>
                        <th className="text-right px-3 py-2 font-medium w-16">Qté</th>
                        <th className="text-left px-3 py-2 font-medium w-16">Unité</th>
                        <th className="text-right px-3 py-2 font-medium w-28">Coût Unitaire HT</th>
                        <th className="text-right px-3 py-2 font-medium w-28">Coût Total HT</th>
                        <th className="text-right px-3 py-2 font-medium w-32">Prix de Vente Total HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <React.Fragment key={i}>
                          {row.catName && (
                            <tr className="bg-gray-50">
                              <td colSpan={6} className="px-3 py-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                {row.catName}{row.isOption ? ' (Option)' : ''}
                              </td>
                            </tr>
                          )}
                          <tr className={row.isOption ? 'opacity-75' : ''}>
                            <td className="px-3 py-1.5">{row.desc}</td>
                            <td className="text-right px-3 py-1.5 font-mono text-green-700">{row.qty % 1 === 0 ? row.qty : row.qty.toFixed(2)}</td>
                            <td className="px-3 py-1.5 text-gray-500">{row.unit}</td>
                            <td className="text-right px-3 py-1.5 font-mono text-gray-600">{fmt(row.unitCost)} Rs</td>
                            <td className="text-right px-3 py-1.5 font-mono text-gray-700">{fmt(row.costTotalHT)} Rs</td>
                            <td className="text-right px-3 py-1.5 font-mono font-medium text-orange-700">{fmt(row.totalSaleHT)} Rs</td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-green-300 bg-green-50">
                        <td colSpan={5} className="px-3 py-2 font-bold text-green-900">Prix de Vente Total HT (Base)</td>
                        <td className="text-right px-3 py-2 font-bold text-orange-700 text-base">{fmt(baseTotal)} Rs</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })()}

            {!simVarContext && (
              <p className="text-xs text-green-700 italic">
                Renseignez les dimensions ci-dessus pour voir le calcul BOQ.
              </p>
            )}
          </CardContent>
        </Card>
      )}

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
        </>
      )}
    </div>
  );
};

export default ModularBOQTemplatePage;
