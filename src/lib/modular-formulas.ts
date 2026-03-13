/**
 * Modular Home BOQ Formula Evaluation Engine
 *
 * Re-exports the shared formula evaluator from pool-formulas.ts and adds
 * modular-home–specific types, variable evaluation and template helpers.
 *
 * Base dimensions for modular homes:
 *   longueur         – length of the footprint (m)
 *   largeur          – width of the footprint (m)
 *   nombre_etages    – number of floors (default 1)
 *
 * Derived variables are stored in modular_boq_variables and evaluated in
 * display_order so that chained dependencies resolve correctly.
 */

export {
  evaluateFormula,
  validateFormulaSyntax,
} from './pool-formulas';

import { api } from './api';
import { evaluateFormula } from './pool-formulas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Flexible dimensions map for any custom model type.
 * Keys are dimension slugs (e.g. 'longueur', 'hauteur', 'nombre_etages').
 * Replaces the old fixed 3-field interface while remaining backward-compatible.
 */
export type ModularDimensions = Record<string, number>;

export interface ModularVariable {
  id: number;
  name: string;
  label: string;
  unit: string;
  formula: string;
  display_order: number;
  model_type_slug?: string;
}

// ---------------------------------------------------------------------------
// Variable evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate all modular variables given base dimensions.
 * Variables are evaluated in display_order so dependent variables resolve first.
 */
export function evaluateModularVariables(
  dimensions: ModularDimensions,
  variables: ModularVariable[]
): Record<string, number> {
  // Spread all dimension values (slug → value) into the evaluation context
  const context: Record<string, number> = { ...dimensions };

  const sorted = [...variables].sort((a, b) => a.display_order - b.display_order);
  for (const v of sorted) {
    try {
      context[v.name] = evaluateFormula(v.formula, context);
    } catch {
      context[v.name] = 0;
    }
  }
  return context;
}

// ---------------------------------------------------------------------------
// Template types (mirrors PoolBOQTemplateCategory hierarchy)
// ---------------------------------------------------------------------------

export interface ModularBOQTemplateLine {
  id: string;
  description: string;
  quantity_formula: string;
  unit: string;
  unit_cost_formula: string;
  price_list_name: string;
  margin_percent: number;
  display_order: number;
  qty_editable?: boolean;
}

export interface ModularBOQTemplateSubcategory {
  id: string;
  name: string;
  is_option: boolean;
  qty_editable: boolean;
  display_order: number;
  lines: ModularBOQTemplateLine[];
}

export interface ModularBOQTemplateCategory {
  id: string;
  name: string;
  is_option: boolean;
  qty_editable: boolean;
  display_order: number;
  lines: ModularBOQTemplateLine[];
  subcategories?: ModularBOQTemplateSubcategory[];
}

// ---------------------------------------------------------------------------
// Default hardcoded template (starter template for new modular models)
// ---------------------------------------------------------------------------

export function getDefaultModularBOQTemplate(): ModularBOQTemplateCategory[] {
  return getHardcodedModularBaseTemplate();
}

export function getHardcodedModularBaseTemplate(): ModularBOQTemplateCategory[] {
  return [
    {
      id: 'foundations',
      name: 'Fondations',
      is_option: false,
      qty_editable: false,
      display_order: 1,
      lines: [
        { id: 'f1',  description: 'Crusherrun (sub-base)',       quantity_formula: 'surface_plancher_m2 * 0.15',   unit: 'tonne',   unit_cost_formula: "prix('Crusherrun')",                         price_list_name: 'Crusherrun',                   margin_percent: 10, display_order: 1 },
        { id: 'f2',  description: 'Béton de propreté',           quantity_formula: 'surface_plancher_m2 * 0.1',    unit: 'm³',      unit_cost_formula: "prix('Béton Toupie (fondations)')",          price_list_name: 'Béton Toupie (fondations)',    margin_percent: 10, display_order: 2 },
        { id: 'f3',  description: 'Béton armé fondations',       quantity_formula: 'surface_plancher_m2 * 0.25',   unit: 'm³',      unit_cost_formula: "prix('Béton Toupie (fondations)')",          price_list_name: 'Béton Toupie (fondations)',    margin_percent: 10, display_order: 3 },
        { id: 'f4',  description: 'Fer Y16',                     quantity_formula: 'CEIL(surface_plancher_m2 * 0.8)',unit: 'barre',  unit_cost_formula: "prix('Fer Y16 (barre de 9m)')",              price_list_name: 'Fer Y16 (barre de 9m)',        margin_percent: 10, display_order: 4 },
      ],
    },
    {
      id: 'structure',
      name: 'Structure',
      is_option: false,
      qty_editable: false,
      display_order: 2,
      lines: [
        { id: 's1',  description: 'Poutres IPE 200',             quantity_formula: 'CEIL((longueur + largeur) / 6)',unit: 'unité',   unit_cost_formula: "prix('Poutre IPE 200 (6m)')",                price_list_name: 'Poutre IPE 200 (6m)',          margin_percent: 15, display_order: 1 },
        { id: 's2',  description: 'Main d\'oeuvre structure',    quantity_formula: 'CEIL(surface_plancher_m2 / 20)',unit: 'jour',    unit_cost_formula: "prix('Main d''oeuvre Qualifiée (1 jour)')",  price_list_name: "Main d'oeuvre Qualifiée (1 jour)", margin_percent: 0, display_order: 2 },
      ],
    },
    {
      id: 'walls',
      name: 'Murs',
      is_option: false,
      qty_editable: false,
      display_order: 3,
      lines: [
        { id: 'w1',  description: 'Panneaux sandwich',           quantity_formula: 'surface_murs_m2',              unit: 'm²',      unit_cost_formula: "prix('Panneau Sandwich 75mm (m²)')",          price_list_name: 'Panneau Sandwich 75mm (m²)', margin_percent: 10, display_order: 1 },
        { id: 'w2',  description: 'Main d\'oeuvre murs',         quantity_formula: 'CEIL(surface_murs_m2 / 25)',   unit: 'jour',    unit_cost_formula: "prix('Main d''oeuvre Qualifiée (1 jour)')",  price_list_name: "Main d'oeuvre Qualifiée (1 jour)", margin_percent: 0, display_order: 2 },
      ],
    },
    {
      id: 'roofing',
      name: 'Toiture',
      is_option: false,
      qty_editable: false,
      display_order: 4,
      lines: [
        { id: 'r1',  description: 'Bac acier',                   quantity_formula: 'surface_toiture_m2',           unit: 'm²',      unit_cost_formula: "prix('Bac Acier (m²)')",                      price_list_name: 'Bac Acier (m²)',              margin_percent: 10, display_order: 1 },
        { id: 'r2',  description: 'Membrane étanchéité',         quantity_formula: 'surface_toiture_m2',           unit: 'm²',      unit_cost_formula: "prix('Membrane Étanchéité (m²)')",            price_list_name: 'Membrane Étanchéité (m²)',    margin_percent: 10, display_order: 2 },
        { id: 'r3',  description: 'Main d\'oeuvre toiture',      quantity_formula: 'CEIL(surface_toiture_m2 / 30)',unit: 'jour',    unit_cost_formula: "prix('Main d''oeuvre Qualifiée (1 jour)')",  price_list_name: "Main d'oeuvre Qualifiée (1 jour)", margin_percent: 0, display_order: 3 },
      ],
    },
    {
      id: 'flooring',
      name: 'Dallage',
      is_option: false,
      qty_editable: false,
      display_order: 5,
      lines: [
        { id: 'fl1', description: 'Chape béton',                 quantity_formula: 'surface_totale_m2',            unit: 'm²',      unit_cost_formula: "prix('Chape de Sol Béton (m²)')",             price_list_name: 'Chape de Sol Béton (m²)',     margin_percent: 10, display_order: 1 },
        { id: 'fl2', description: 'Carrelage sol',               quantity_formula: 'surface_totale_m2',            unit: 'm²',      unit_cost_formula: "prix('Carrelage Sol (m²)')",                  price_list_name: 'Carrelage Sol (m²)',           margin_percent: 10, display_order: 2 },
        { id: 'fl3', description: 'Main d\'oeuvre carreleur',    quantity_formula: 'CEIL(surface_totale_m2 / 20)', unit: 'jour',    unit_cost_formula: "prix('Main d''oeuvre Non Qualifiée (1 jour)')", price_list_name: "Main d'oeuvre Non Qualifiée (1 jour)", margin_percent: 0, display_order: 3 },
      ],
    },
    {
      id: 'doors_windows',
      name: 'Portes & Fenêtres',
      is_option: false,
      qty_editable: false,
      display_order: 6,
      lines: [
        { id: 'dw1', description: 'Portes extérieures',          quantity_formula: 'nb_portes',                    unit: 'unité',   unit_cost_formula: "prix('Porte Extérieure PVC 90x210cm')",       price_list_name: 'Porte Extérieure PVC 90x210cm', margin_percent: 10, display_order: 1 },
        { id: 'dw2', description: 'Fenêtres',                    quantity_formula: 'nb_fenetres',                  unit: 'unité',   unit_cost_formula: "prix('Fenêtre PVC Double Vitrage 100x120cm')",price_list_name: 'Fenêtre PVC Double Vitrage 100x120cm', margin_percent: 10, display_order: 2 },
      ],
    },
    {
      id: 'finishes',
      name: 'Finitions',
      is_option: false,
      qty_editable: false,
      display_order: 7,
      lines: [
        { id: 'fi1', description: 'Peinture intérieure',         quantity_formula: 'surface_murs_m2 + surface_totale_m2', unit: 'm²', unit_cost_formula: "prix('Peinture Intérieure (L)') / 10",  price_list_name: 'Peinture Intérieure (L)',     margin_percent: 10, display_order: 1 },
        { id: 'fi2', description: 'Peinture extérieure',         quantity_formula: 'surface_murs_m2 * 1.1',        unit: 'm²',      unit_cost_formula: "prix('Peinture Extérieure (L)') / 8",        price_list_name: 'Peinture Extérieure (L)',     margin_percent: 10, display_order: 2 },
      ],
    },
  ];
}

export function getHardcodedModularOptionsTemplate(): ModularBOQTemplateCategory[] {
  return [
    {
      id: 'electrical',
      name: 'Électricité',
      is_option: true,
      qty_editable: true,
      display_order: 1,
      lines: [
        { id: 'e1',  description: 'Tableau électrique',          quantity_formula: '1',                            unit: 'forfait', unit_cost_formula: "prix('Tableau Électrique (forfait)')",        price_list_name: 'Tableau Électrique (forfait)', margin_percent: 10, display_order: 1 },
        { id: 'e2',  description: 'Câblage (mètre)',             quantity_formula: 'surface_totale_m2 * 3',        unit: 'mètre',   unit_cost_formula: "prix('Câbles 2.5mm² (mètre)')",              price_list_name: "Câbles 2.5mm² (mètre)",       margin_percent: 10, display_order: 2 },
        { id: 'e3',  description: 'Electricien',                 quantity_formula: 'CEIL(surface_totale_m2 / 20)', unit: 'jour',    unit_cost_formula: "prix('Electricien (1 jour)')",               price_list_name: 'Electricien (1 jour)',         margin_percent: 0,  display_order: 3 },
      ],
    },
    {
      id: 'plumbing',
      name: 'Plomberie',
      is_option: true,
      qty_editable: true,
      display_order: 2,
      lines: [
        { id: 'p1',  description: 'Robinetterie cuisine',        quantity_formula: '1',                            unit: 'forfait', unit_cost_formula: "prix('Robinetterie Cuisine (forfait)')",      price_list_name: 'Robinetterie Cuisine (forfait)', margin_percent: 10, display_order: 1 },
        { id: 'p2',  description: 'Robinetterie salle de bain',  quantity_formula: 'nombre_etages',                unit: 'forfait', unit_cost_formula: "prix('Robinetterie Salle de Bain (forfait)')", price_list_name: 'Robinetterie Salle de Bain (forfait)', margin_percent: 10, display_order: 2 },
        { id: 'p3',  description: 'Plombier',                    quantity_formula: 'CEIL(surface_totale_m2 / 25)', unit: 'jour',    unit_cost_formula: "prix('Plombier (1 jour)')",                  price_list_name: 'Plombier (1 jour)',            margin_percent: 0,  display_order: 3 },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Persistence helpers (mirror pool-formulas.ts pattern)
// ---------------------------------------------------------------------------

const LS_BASE    = 'modular_boq_template_base';
const LS_OPTIONS = 'modular_boq_template_options';

export function saveModularBOQTemplate(template: ModularBOQTemplateCategory[]): void {
  try { localStorage.setItem(LS_BASE, JSON.stringify(template)); } catch { /* ignore */ }
}

export function saveModularBOQOptionsTemplate(template: ModularBOQTemplateCategory[]): void {
  try { localStorage.setItem(LS_OPTIONS, JSON.stringify(template)); } catch { /* ignore */ }
}

export function getSavedModularBOQTemplate(): ModularBOQTemplateCategory[] | null {
  try {
    const raw = localStorage.getItem(LS_BASE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function getSavedModularBOQOptionsTemplate(): ModularBOQTemplateCategory[] | null {
  try {
    const raw = localStorage.getItem(LS_OPTIONS);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearSavedModularBOQTemplates(): void {
  try {
    localStorage.removeItem(LS_BASE);
    localStorage.removeItem(LS_OPTIONS);
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// DB persistence helpers (async — mirrors pool-formulas.ts)
// ---------------------------------------------------------------------------

export interface ModularBOQTemplateRecord {
  id: number;
  name: string;
  description: string | null;
  is_default: boolean;
  template_data: string | null;
}

export async function loadModularTemplateFromDB(modelTypeSlug?: string): Promise<{
  base: ModularBOQTemplateCategory[] | null;
  options: ModularBOQTemplateCategory[] | null;
}> {
  try {
    const tpl: ModularBOQTemplateRecord = await api.getDefaultModularBOQTemplateFromDB(modelTypeSlug);
    if (!tpl || !tpl.template_data) return { base: null, options: null };
    const data = JSON.parse(typeof tpl.template_data === 'string' ? tpl.template_data : JSON.stringify(tpl.template_data));
    return {
      base:    Array.isArray(data.base)    ? data.base    : null,
      options: Array.isArray(data.options) ? data.options : null,
    };
  } catch {
    return { base: null, options: null };
  }
}

export async function saveModularTemplateToDB(
  base: ModularBOQTemplateCategory[],
  options: ModularBOQTemplateCategory[],
  modelTypeSlug?: string
): Promise<void> {
  const templateData = JSON.stringify({ base, options });

  const existing: ModularBOQTemplateRecord[] = await api.getModularBOQTemplates(modelTypeSlug);
  const defaultTpl = Array.isArray(existing) ? existing.find(t => t.is_default) : null;

  if (defaultTpl) {
    await api.updateModularBOQTemplate({
      id: defaultTpl.id,
      template_data: templateData,
    });
  } else {
    await api.createModularBOQTemplate({
      name: modelTypeSlug ? `Modèle par défaut (${modelTypeSlug})` : 'Modèle par défaut',
      description: 'Modèle BOQ par défaut pour Solutions Personnalisées',
      is_default: true,
      template_data: templateData,
      model_type_slug: modelTypeSlug,
    });
  }
}
