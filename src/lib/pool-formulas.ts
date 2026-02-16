/**
 * Pool BOQ Formula Evaluation Engine
 *
 * Evaluates mathematical formulas that reference:
 *   - Pool dimensions: longueur, largeur, profondeur
 *   - Calculated variables: surface_m2, volume_m3, perimetre_m, etc.
 *   - Math functions: Math.ceil (via CEIL / ROUNDUP), Math.floor, Math.round
 *
 * Formulas are plain arithmetic expressions stored as strings.
 * Example: "(longueur + 1) * 2 + (largeur + 1) * 2"
 */

export interface PoolDimensions {
  longueur: number;
  largeur: number;
  profondeur: number;
}

export interface PoolVariable {
  id: number;
  name: string;
  label: string;
  unit: string;
  formula: string;
  display_order: number;
}

/**
 * Evaluate all pool variables given pool dimensions.
 * Variables are evaluated in display_order so dependent variables resolve correctly.
 */
export function evaluatePoolVariables(
  dimensions: PoolDimensions,
  variables: PoolVariable[]
): Record<string, number> {
  const context: Record<string, number> = {
    longueur: dimensions.longueur,
    largeur: dimensions.largeur,
    profondeur: dimensions.profondeur,
  };

  // Sort by display_order to ensure dependency resolution
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

/**
 * Evaluate a single formula string using the provided variable context.
 * Supports: +, -, *, /, parentheses, numeric literals, variable references.
 * Also supports CEIL(), FLOOR(), ROUND(), ROUNDUP() functions.
 */
export function evaluateFormula(
  formula: string,
  context: Record<string, number>
): number {
  if (!formula || !formula.trim()) return 0;

  // Sanitize: only allow safe characters
  let expr = formula.trim();

  // Replace function names with JS equivalents
  expr = expr.replace(/\bCEIL\b/gi, 'Math.ceil');
  expr = expr.replace(/\bROUNDUP\b/gi, 'Math.ceil');
  expr = expr.replace(/\bFLOOR\b/gi, 'Math.floor');
  expr = expr.replace(/\bROUND\b/gi, 'Math.round');

  // Replace variable names with their values (longest names first to avoid partial matches)
  const varNames = Object.keys(context).sort((a, b) => b.length - a.length);
  for (const name of varNames) {
    const regex = new RegExp(`\\b${escapeRegex(name)}\\b`, 'g');
    expr = expr.replace(regex, String(context[name]));
  }

  // Validate: only allow numbers, operators, parentheses, Math functions, dots, spaces
  if (!/^[\d\s+\-*/().Math,ceilfloorround]*$/i.test(expr)) {
    throw new Error(`Invalid formula: ${formula}`);
  }

  // Evaluate using Function constructor (safe because we've validated the expression)
  try {
    const fn = new Function(`"use strict"; return (${expr});`);
    const result = fn();
    if (typeof result !== 'number' || !isFinite(result)) return 0;
    return result;
  } catch {
    return 0;
  }
}

/**
 * Evaluate a BOQ line quantity formula.
 * Supports all pool variables plus special syntax.
 */
export function evaluateLineFormula(
  formula: string,
  variableContext: Record<string, number>
): number {
  return evaluateFormula(formula, variableContext);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get the default BOQ template structure for a pool model.
 * Returns categories with sub-categories and lines with quantity formulas.
 */
export function getDefaultPoolBOQTemplate(): PoolBOQTemplateCategory[] {
  return [
    // 1/ Préparation du terrain
    {
      name: '1/ Préparation du terrain',
      is_option: false,
      display_order: 1,
      subcategories: [
        {
          name: '1A/ Fouille',
          display_order: 1,
          lines: [
            { description: 'Location de JCB', quantity: 1, quantity_formula: '1', unit: 'jour', price_list_name: 'Location JCB (1 jour)' },
            { description: "Main d'oeuvre", quantity: 1, quantity_formula: '0.125 * surface_m2', unit: 'jour', price_list_name: "Main d'oeuvre (1 jour)" },
            { description: 'Transport de matériaux', quantity: 1, quantity_formula: 'CEIL(surface_m2 / 15) * 2', unit: 'unité', price_list_name: 'Transport Matériaux' },
            { description: 'Transport évacuation de la terre', quantity: 1, quantity_formula: 'CEIL(surface_m2 / 15) * 3', unit: 'unité', price_list_name: 'Transport Matériaux' },
          ],
        },
        {
          name: '1B/ Site Railing',
          display_order: 2,
          lines: [
            { description: "Main d'oeuvre", quantity: 1, quantity_formula: '0.25 * surface_m2', unit: 'jour', price_list_name: "Main d'oeuvre (1 jour)" },
            { description: 'Bois', quantity: 1, quantity_formula: 'CEIL((perimetre_m + 4) / 2.4)', unit: 'planche', price_list_name: 'Bois de coffrage (Planche de 2.4m x 15cm)' },
            { description: 'Clous (Forfait)', quantity: 1, quantity_formula: '1', unit: 'forfait', price_list_name: 'Clous (forfait)' },
            { description: 'Nylon (Forfait)', quantity: 1, quantity_formula: '1', unit: 'forfait', price_list_name: 'Nylon (forfait)' },
          ],
        },
      ],
    },
    // 2/ La Base
    {
      name: '2/ La Base',
      is_option: false,
      display_order: 2,
      subcategories: [
        {
          name: '2A/ Compactage de la base',
          display_order: 1,
          lines: [
            { description: 'Location dammeuse', quantity: 1, quantity_formula: '1', unit: 'jour', price_list_name: 'Location Dammeuse (1 jour)' },
            { description: "Main d'oeuvre", quantity: 1, quantity_formula: 'CEIL(surface_m2 / 15)', unit: 'jour', price_list_name: "Main d'oeuvre (1 jour)" },
          ],
        },
        {
          name: '2B/ Radier',
          display_order: 2,
          lines: [
            { description: 'Crusherrun', quantity: 1, quantity_formula: 'volume_base_m3 * 1.6', unit: 'tonne', price_list_name: 'Crusherrun' },
            { description: 'Fer Y12 pour base', quantity: 1, quantity_formula: '((largeur / 0.2 * (longueur + 1)) + (longueur / 0.2 * (largeur + 1))) * 2', unit: 'barre', price_list_name: 'Fer Y12 (barre de 9m)' },
            { description: 'Fer Y12 pour amorce murs', quantity: 1, quantity_formula: '(perimetre_m / 0.2) * (profondeur + 1)', unit: 'barre', price_list_name: 'Fer Y12 (barre de 9m)' },
            { description: 'Plastique noir', quantity: 1, quantity_formula: 'surface_m2', unit: 'm²', price_list_name: 'Plastique noir' },
            { description: 'Bois de coffrage', quantity: 1, quantity_formula: 'CEIL(perimetre_base_m / 2.4)', unit: 'planche', price_list_name: 'Bois de coffrage (Planche de 2.4m x 15cm)' },
            { description: 'Clous (Forfait)', quantity: 1, quantity_formula: '1', unit: 'forfait', price_list_name: 'Clous (forfait)' },
            { description: "Fer d'attache (Forfait)", quantity: 1, quantity_formula: '1', unit: 'forfait', price_list_name: "Fer d'attache (forfait)" },
            { description: 'Transport matériaux', quantity: 1, quantity_formula: 'CEIL(surface_m2 / 15) * 2', unit: 'unité', price_list_name: 'Transport Matériaux' },
          ],
        },
        {
          name: '2C/ Coulage',
          display_order: 3,
          lines: [
            { description: "Main d'oeuvre", quantity: 1, quantity_formula: '1', unit: 'jour', price_list_name: "Main d'oeuvre (1 jour)" },
            { description: 'Béton', quantity: 1, quantity_formula: 'volume_base_m3', unit: 'm³', price_list_name: 'Béton Toupie' },
            { description: 'Eau Béton', quantity: 1, quantity_formula: '1', unit: 'forfait', price_list_name: 'Eau Béton (Forfait)' },
          ],
        },
      ],
    },
    // 3/ Les Murs
    {
      name: '3/ Les Murs',
      is_option: false,
      display_order: 3,
      subcategories: [
        {
          name: '3A/ Montage',
          display_order: 1,
          lines: [
            { description: "Main d'oeuvre", quantity: 1, quantity_formula: 'nombre_blocs_bab / 75', unit: 'jour', price_list_name: "Main d'oeuvre (1 jour)" },
            { description: 'Fer Y12 barres verticales', quantity: 1, quantity_formula: 'perimetre_m / 0.2 * profondeur', unit: 'barre', price_list_name: 'Fer Y12 (barre de 9m)' },
            { description: 'Fer Y10 barres horizontales', quantity: 1, quantity_formula: 'perimetre_m * 2 / 9', unit: 'barre', price_list_name: 'Fer Y10 (barre de 9m)' },
            // DTU: ~40kg cement/m² of blockwork, 25kg bags, 10% waste
            { description: 'Ciment', quantity: 1, quantity_formula: 'CEIL((longueur * profondeur * 2 + largeur * profondeur * 2) * 40 / 25 * 1.1)', unit: 'sac', price_list_name: 'Ciment (sac de 25kg)' },
            // DTU: ~50kg sand/m² of blockwork, 10% waste, density ~1.5t/m³
            { description: 'Rocksand .4', quantity: 1, quantity_formula: '(longueur * profondeur * 2 + largeur * profondeur * 2) * 50 / 1000 * 1.1', unit: 'tonne', price_list_name: 'Rocksand .4 (tonne)' },
            { description: 'Transport matériaux', quantity: 1, quantity_formula: 'CEIL(surface_m2 / 15)', unit: 'unité', price_list_name: 'Transport Matériaux' },
          ],
        },
        {
          name: '3B/ Coulage',
          display_order: 2,
          lines: [
            // DTU 350kg/m³: Fill volume = Perimetre × Profondeur × 0.15, +10% waste
            // Macadam: ~0.8t/m³ of concrete
            { description: 'Macadam 3/8', quantity: 1, quantity_formula: 'perimetre_m * profondeur * 0.15 * 0.8 * 1.1', unit: 'tonne', price_list_name: 'Macadam 3/8 (tonne)' },
            // DTU 350kg/m³: cement = volume × 350 / 25 (bags), +10% waste
            { description: 'Ciment', quantity: 1, quantity_formula: 'CEIL(perimetre_m * profondeur * 0.15 * 350 / 25 * 1.1)', unit: 'sac', price_list_name: 'Ciment (sac de 25kg)' },
            // DTU: sand ~0.4m³/m³ concrete, density 1.5t/m³, +10% waste
            { description: 'Rocksand .4', quantity: 1, quantity_formula: 'perimetre_m * profondeur * 0.15 * 0.4 * 1.5 * 1.1', unit: 'tonne', price_list_name: 'Rocksand .4 (tonne)' },
            { description: 'Transport matériaux', quantity: 1, quantity_formula: 'CEIL(surface_m2 / 15)', unit: 'unité', price_list_name: 'Transport Matériaux' },
          ],
        },
        {
          name: '3C/ Crépissage Intérieur',
          display_order: 3,
          lines: [
            { description: "Main d'oeuvre", quantity: 1, quantity_formula: 'CEIL(surface_interieur_m2 / 35)', unit: 'jour', price_list_name: "Main d'oeuvre (1 jour)" },
            // DTU: 1 coat rendering ~25kg sand/m², density 1.5t/m³, +10% waste
            { description: 'Rocksand 0.2', quantity: 1, quantity_formula: 'surface_interieur_m2 * 25 / 1000 * 1.1', unit: 'tonne', price_list_name: 'Rocksand .2 (tonne)' },
            // DTU: ~2kg adhesive cement/m², 15kg bags, +10% waste
            { description: 'Colle Ciment', quantity: 1, quantity_formula: 'CEIL(surface_interieur_m2 * 2 / 15 * 1.1)', unit: 'sac', price_list_name: 'Colle Ciment (sac de 15Kg)' },
            { description: 'Latex', quantity: 1, quantity_formula: 'CEIL(surface_interieur_m2 / 10)', unit: 'bouteille', price_list_name: 'Latex (Bouteille de 5 Lts)' },
            // DTU: ~5kg cement/m² rendering, 25kg bags, +10% waste
            { description: 'Ciment', quantity: 1, quantity_formula: 'CEIL(surface_interieur_m2 * 5 / 25 * 1.1)', unit: 'sac', price_list_name: 'Ciment (sac de 25kg)' },
            { description: 'Transport Matériaux', quantity: 1, quantity_formula: 'CEIL(surface_m2 / 15)', unit: 'unité', price_list_name: 'Transport Matériaux' },
          ],
        },
        {
          name: '3D/ Crépissage Extérieur',
          display_order: 4,
          lines: [
            { description: "Main d'oeuvre", quantity: 1, quantity_formula: 'CEIL(surface_interieur_m2 / 35)', unit: 'jour', price_list_name: "Main d'oeuvre (1 jour)" },
            { description: 'Rocksand 0.2', quantity: 1, quantity_formula: 'surface_interieur_m2 * 25 / 1000 * 1.1', unit: 'tonne', price_list_name: 'Rocksand .2 (tonne)' },
            { description: 'Colle Ciment', quantity: 1, quantity_formula: 'CEIL(surface_interieur_m2 * 2 / 15 * 1.1)', unit: 'sac', price_list_name: 'Colle Ciment (sac de 15Kg)' },
            { description: 'Latex', quantity: 1, quantity_formula: 'CEIL(surface_interieur_m2 / 10)', unit: 'bouteille', price_list_name: 'Latex (Bouteille de 5 Lts)' },
            { description: 'Ciment', quantity: 1, quantity_formula: 'CEIL(surface_interieur_m2 * 5 / 25 * 1.1)', unit: 'sac', price_list_name: 'Ciment (sac de 25kg)' },
            { description: 'Transport Matériaux', quantity: 1, quantity_formula: 'CEIL(surface_m2 / 15)', unit: 'unité', price_list_name: 'Transport Matériaux' },
          ],
        },
      ],
    },
    // 4/ Étanchéité
    {
      name: '4/ Étanchéité',
      is_option: false,
      display_order: 4,
      subcategories: [
        {
          name: '4A/ Étanchéité Intérieure',
          display_order: 1,
          lines: [
            { description: "Main d'oeuvre", quantity: 1, quantity_formula: 'CEIL(surface_interieur_m2 / 15) * 2', unit: 'jour', price_list_name: "Main d'oeuvre (1 jour)" },
            { description: 'TAL Sureproof', quantity: 1, quantity_formula: 'CEIL(surface_interieur_m2 / 42) * 7', unit: 'kit', price_list_name: 'TAL Sureproof (kit)' },
            { description: 'Pinceau (Forfait)', quantity: 1, quantity_formula: '1', unit: 'forfait', price_list_name: 'Pinceau (forfait)' },
          ],
        },
        {
          name: '4B/ Étanchéité Extérieure',
          display_order: 2,
          lines: [
            { description: "Main d'oeuvre", quantity: 1, quantity_formula: 'CEIL(surface_interieur_m2 / 15) * 2', unit: 'jour', price_list_name: "Main d'oeuvre (1 jour)" },
            { description: 'Pekay Noir', quantity: 1, quantity_formula: 'CEIL(surface_interieur_m2 / 42) * 7', unit: 'm²', price_list_name: 'Pekay Noir' },
            { description: 'Pinceau (Forfait)', quantity: 1, quantity_formula: '1', unit: 'forfait', price_list_name: 'Pinceau (forfait)' },
          ],
        },
      ],
    },
    // 5/ Plomberie & Électricité Structure
    {
      name: '5/ Plomberie & Électricité Structure',
      is_option: false,
      display_order: 5,
      subcategories: [
        {
          name: '5A/ Plomberie',
          display_order: 1,
          lines: [
            { description: 'Plombier', quantity: 1, quantity_formula: 'CEIL(surface_m2 / 15) * 2', unit: 'jour', price_list_name: 'Plombier' },
            { description: 'Skimmer', quantity: 1, quantity_formula: 'CEIL(volume_m3 / 36)', unit: 'unité', price_list_name: 'Skimmer' },
            { description: 'Traversée de parois', quantity: 1, quantity_formula: 'CEIL(volume_m3 / 36) * 2', unit: 'unité', price_list_name: 'Traversée de Parois' },
            { description: 'Buses', quantity: 1, quantity_formula: 'CEIL(volume_m3 / 36) * 2', unit: 'unité', price_list_name: 'Buses' },
            { description: 'Tuyaux 50mm Haute Pression', quantity: 1, quantity_formula: 'CEIL(perimetre_m * 2 / 5.8)', unit: 'unité', price_list_name: 'Tuyaux 50mm Haute Pression' },
            { description: 'Colle PVC (Forfait)', quantity: 1, quantity_formula: '1', unit: 'forfait', price_list_name: 'Colle PVC (Forfait)' },
            { description: 'Transport matériaux', quantity: 1, quantity_formula: '1', unit: 'unité', price_list_name: 'Transport Matériaux' },
          ],
        },
        {
          name: '5B/ Électricité',
          display_order: 2,
          lines: [
            { description: 'Électricien', quantity: 1, quantity_formula: 'CEIL(surface_m2 / 15) * 2', unit: 'jour', price_list_name: 'Electricien' },
            { description: 'Tuyau spot led', quantity: 1, quantity_formula: 'CEIL(perimetre_m / 5.8)', unit: 'unité', price_list_name: 'Tuyau Spot Led' },
            { description: 'Câbles électriques 2.5mm² 3 cors', quantity: 1, quantity_formula: 'perimetre_m', unit: 'mètre', price_list_name: 'Câbles électriques 2.5mm2 3 cors' },
            { description: 'Boite de connexion electrique', quantity: 1, quantity_formula: 'CEIL(perimetre_m / 5.8)', unit: 'unité', price_list_name: 'Boite de connexion electrique' },
            { description: 'Transport matériaux', quantity: 1, quantity_formula: '1', unit: 'unité', price_list_name: 'Transport Matériaux' },
          ],
        },
      ],
    },
  ];
}

/**
 * Get the default pool BOQ options template.
 */
export function getDefaultPoolBOQOptionsTemplate(): PoolBOQTemplateCategory[] {
  return [
    // OPT1 Électrique
    {
      name: 'OPT1 Électrique',
      is_option: true,
      display_order: 10,
      subcategories: [
        {
          name: 'OPT1A Éclairage',
          display_order: 1,
          lines: [
            { description: 'Spot Led', quantity: 1, quantity_formula: '1', unit: 'unité', price_list_name: 'Spot Led' },
          ],
        },
        {
          name: 'OPT1B Autres',
          display_order: 2,
          lines: [
            { description: 'Pompe de Circulation', quantity: 1, quantity_formula: '1', unit: 'unité', price_list_name: 'Pompe de Circulation' },
            { description: 'Domotique', quantity: 1, quantity_formula: '1', unit: 'unité', price_list_name: 'Domotique' },
          ],
        },
      ],
    },
    // OPT2 Structure
    {
      name: 'OPT2 Structure',
      is_option: true,
      display_order: 11,
      subcategories: [
        {
          name: 'OPT2A Marches de 60cm de large',
          display_order: 1,
          lines: [
            { description: "Main d'oeuvre", quantity: 2, quantity_formula: '2', unit: 'jour', price_list_name: "Main d'oeuvre (1 jour)" },
            { description: 'Bloc BAB', quantity: 20, quantity_formula: '20', unit: 'unité', price_list_name: 'Bloc BAB' },
            { description: 'Ciment', quantity: 10, quantity_formula: '10', unit: 'sac', price_list_name: 'Ciment (sac de 25kg)' },
            { description: 'Rocksand 0.2', quantity: 2, quantity_formula: '2', unit: 'tonne', price_list_name: 'Rocksand .2 (tonne)' },
            { description: 'Macadam 3/8', quantity: 2, quantity_formula: '2', unit: 'tonne', price_list_name: 'Macadam 3/8 (tonne)' },
            { description: 'Carrelage', quantity: 1, quantity_formula: '1', unit: 'm²', price_list_name: 'Carrelage' },
            { description: 'Carreleur', quantity: 1, quantity_formula: '1', unit: 'm²', price_list_name: 'Carreleur' },
            { description: 'Colle Carreau', quantity: 2, quantity_formula: '2', unit: 'sac', price_list_name: 'Colle Carreau (sac de 15Kg)' },
          ],
        },
        {
          name: 'OPT2B Banc (longueur ou largeur)',
          display_order: 2,
          lines: [
            { description: "Main d'oeuvre", quantity: 5, quantity_formula: '5', unit: 'jour', price_list_name: "Main d'oeuvre (1 jour)" },
            { description: 'Bloc BAB', quantity: 30, quantity_formula: '30', unit: 'unité', price_list_name: 'Bloc BAB' },
            { description: 'Ciment', quantity: 20, quantity_formula: '20', unit: 'sac', price_list_name: 'Ciment (sac de 25kg)' },
            { description: 'Rocksand 0.2', quantity: 3, quantity_formula: '3', unit: 'tonne', price_list_name: 'Rocksand .2 (tonne)' },
            { description: 'Macadam 3/8', quantity: 3, quantity_formula: '3', unit: 'tonne', price_list_name: 'Macadam 3/8 (tonne)' },
            { description: 'Carrelage', quantity: 1, quantity_formula: '1', unit: 'm²', price_list_name: 'Carrelage' },
            { description: 'Carreleur', quantity: 1, quantity_formula: '1', unit: 'm²', price_list_name: 'Carreleur' },
            { description: 'Colle Carreau', quantity: 4, quantity_formula: '4', unit: 'sac', price_list_name: 'Colle Carreau (sac de 15Kg)' },
            { description: 'Tiles Spacers (Forfait)', quantity: 1, quantity_formula: '1', unit: 'forfait', price_list_name: 'Tiles Spacers (forfait)' },
            { description: 'Joints', quantity: 1, quantity_formula: 'CEIL(20 * surface_interieur_m2 / 35)', unit: 'kg', price_list_name: 'Joints (1 Kg)' },
          ],
        },
      ],
    },
    // OPT3 Filtration
    {
      name: 'OPT3 Filtration',
      is_option: true,
      display_order: 12,
      subcategories: [
        {
          name: 'OPT3A Filtration Basique',
          display_order: 1,
          lines: [
            { description: 'Filtre à Sable', quantity: 1, quantity_formula: '1', unit: 'unité', price_list_name: 'Filtre à Sable' },
            { description: 'Pompe de Piscine', quantity: 1, quantity_formula: '1', unit: 'unité', price_list_name: 'Pompe de Piscine' },
            { description: 'Panneau Electrique', quantity: 1, quantity_formula: '1', unit: 'unité', price_list_name: 'Panneau Electrique' },
            { description: 'Électricien', quantity: 1, quantity_formula: '1', unit: 'jour', price_list_name: 'Electricien' },
            { description: 'Plombier', quantity: 1, quantity_formula: '1', unit: 'jour', price_list_name: 'Plombier' },
          ],
        },
        {
          name: 'OPT3B Filtration Améliorée',
          display_order: 2,
          lines: [
            { description: 'Salt Chlorinateur', quantity: 1, quantity_formula: '1', unit: 'unité', price_list_name: 'Salt Chlorinateur' },
          ],
        },
      ],
    },
    // OPT4 Finitions
    {
      name: 'OPT4 Finitions',
      is_option: true,
      display_order: 13,
      subcategories: [
        {
          name: 'OPT4A Carrelage',
          display_order: 1,
          lines: [
            { description: 'Carrelage', quantity: 1, quantity_formula: 'surface_interieur_m2', unit: 'm²', price_list_name: 'Carrelage' },
            { description: 'Carreleur', quantity: 1, quantity_formula: 'surface_interieur_m2', unit: 'm²', price_list_name: 'Carreleur' },
            { description: 'Colle Carreau', quantity: 1, quantity_formula: 'CEIL(20 * surface_interieur_m2 / 35)', unit: 'sac', price_list_name: 'Colle Carreau (sac de 15Kg)' },
            { description: 'Tiles Spacers (Forfait)', quantity: 1, quantity_formula: '1', unit: 'forfait', price_list_name: 'Tiles Spacers (forfait)' },
            { description: 'Joints', quantity: 1, quantity_formula: 'CEIL(20 * surface_interieur_m2 / 35)', unit: 'kg', price_list_name: 'Joints (1 Kg)' },
          ],
        },
      ],
    },
  ];
}

// Types for template structure
export interface PoolBOQTemplateLine {
  description: string;
  quantity: number;
  quantity_formula: string;
  unit: string;
  price_list_name: string;
}

export interface PoolBOQTemplateSubcategory {
  name: string;
  display_order: number;
  lines: PoolBOQTemplateLine[];
}

export interface PoolBOQTemplateCategory {
  name: string;
  is_option: boolean;
  display_order: number;
  subcategories: PoolBOQTemplateSubcategory[];
}
