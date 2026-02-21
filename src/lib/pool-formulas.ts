/**
 * Pool BOQ Formula Evaluation Engine
 *
 * Evaluates mathematical formulas that reference:
 *   - Pool dimensions: longueur, largeur, profondeur
 *   - Calculated variables: surface_m2, volume_m3, perimetre_m, etc.
 *   - Math functions: Math.ceil (via CEIL / ROUNDUP), Math.floor (via FLOOR / ROUNDDOWN), Math.round
 *   - Conditional: IF(condition, value_if_true, value_if_false)
 *
 * Formulas are plain arithmetic expressions stored as strings.
 * Example: "(longueur + 1) * 2 + (largeur + 1) * 2"
 */

import { api } from './api';

export interface PoolDimensions {
  longueur: number;
  largeur: number;
  profondeur: number;
  // L-shape dimensions
  longueur_la?: number;
  largeur_la?: number;
  profondeur_la?: number;
  longueur_lb?: number;
  largeur_lb?: number;
  profondeur_lb?: number;
  // T-shape dimensions
  longueur_ta?: number;
  largeur_ta?: number;
  profondeur_ta?: number;
  longueur_tb?: number;
  largeur_tb?: number;
  profondeur_tb?: number;
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

  // Inject optional L/T shape dimensions if provided
  const optionalDims: (keyof PoolDimensions)[] = [
    'longueur_la', 'largeur_la', 'profondeur_la',
    'longueur_lb', 'largeur_lb', 'profondeur_lb',
    'longueur_ta', 'largeur_ta', 'profondeur_ta',
    'longueur_tb', 'largeur_tb', 'profondeur_tb',
  ];
  for (const dim of optionalDims) {
    if (dimensions[dim] !== undefined) {
      context[dim] = dimensions[dim] as number;
    }
  }

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
 * Uses a safe recursive descent parser — no eval() or Function().
 * Supports: +, -, *, /, parentheses, numeric literals, variable references.
 * Also supports CEIL(), FLOOR(), ROUND(), ROUNDUP(), ROUNDDOWN() functions and
 * IF(condition, value_if_true, value_if_false) with operators: <, >, <=, >=, ==, !=
 */
export function evaluateFormula(
  formula: string,
  context: Record<string, number>
): number {
  if (!formula || !formula.trim()) return 0;

  try {
    const result = parseExpression(formula.trim(), context);
    if (typeof result !== 'number' || !isFinite(result)) return 0;
    return result;
  } catch {
    return 0;
  }
}

/**
 * Validate formula syntax without needing a real variable context.
 * Uses a Proxy that accepts any variable name so only true syntax errors are reported.
 */
export function validateFormulaSyntax(formula: string): { valid: boolean; error?: string } {
  if (!formula || !formula.trim()) return { valid: false, error: 'Formule vide' };
  // Proxy context: every property lookup returns 1, so unknown variables don't throw
  const context = new Proxy({} as Record<string, number>, {
    get: () => 1,
    has: () => true,
  });
  try {
    const result = parseExpression(formula.trim(), context);
    if (typeof result !== 'number' || !isFinite(result)) {
      return { valid: false, error: 'Résultat invalide (ex: division par zéro)' };
    }
    return { valid: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur de syntaxe';
    return { valid: false, error: msg };
  }
}

/* ---- Safe recursive descent parser ---- */

interface ParserState {
  input: string;
  pos: number;
  context: Record<string, number>;
}

function skipSpaces(s: ParserState) {
  while (s.pos < s.input.length && s.input[s.pos] === ' ') s.pos++;
}

function parseExpression(input: string, context: Record<string, number>): number {
  const s: ParserState = { input, pos: 0, context };
  const val = parseAddSub(s);
  skipSpaces(s);
  if (s.pos < s.input.length) throw new Error('Unexpected token');
  return val;
}

function parseAddSub(s: ParserState): number {
  let left = parseMulDiv(s);
  skipSpaces(s);
  while (s.pos < s.input.length && (s.input[s.pos] === '+' || s.input[s.pos] === '-')) {
    const op = s.input[s.pos];
    s.pos++;
    const right = parseMulDiv(s);
    left = op === '+' ? left + right : left - right;
    skipSpaces(s);
  }
  return left;
}

function parseMulDiv(s: ParserState): number {
  let left = parseUnary(s);
  skipSpaces(s);
  while (s.pos < s.input.length && (s.input[s.pos] === '*' || s.input[s.pos] === '/')) {
    const op = s.input[s.pos];
    s.pos++;
    const right = parseUnary(s);
    left = op === '*' ? left * right : (right !== 0 ? left / right : 0);
    skipSpaces(s);
  }
  return left;
}

function parseUnary(s: ParserState): number {
  skipSpaces(s);
  if (s.pos < s.input.length && s.input[s.pos] === '-') {
    s.pos++;
    return -parseAtom(s);
  }
  if (s.pos < s.input.length && s.input[s.pos] === '+') {
    s.pos++;
  }
  return parseAtom(s);
}

function parseAtom(s: ParserState): number {
  skipSpaces(s);

  // Parenthesized expression
  if (s.pos < s.input.length && s.input[s.pos] === '(') {
    s.pos++; // skip '('
    const val = parseAddSub(s);
    skipSpaces(s);
    if (s.pos < s.input.length && s.input[s.pos] === ')') {
      s.pos++; // skip ')'
    }
    return val;
  }

  // Number literal
  if (s.pos < s.input.length && (isDigit(s.input[s.pos]) || s.input[s.pos] === '.')) {
    let numStr = '';
    while (s.pos < s.input.length && (isDigit(s.input[s.pos]) || s.input[s.pos] === '.')) {
      numStr += s.input[s.pos];
      s.pos++;
    }
    return parseFloat(numStr) || 0;
  }

  // Identifier: function call or variable name
  if (s.pos < s.input.length && isAlpha(s.input[s.pos])) {
    let name = '';
    while (s.pos < s.input.length && isAlphaNumOrUnderscore(s.input[s.pos])) {
      name += s.input[s.pos];
      s.pos++;
    }
    skipSpaces(s);

    // Function call
    if (s.pos < s.input.length && s.input[s.pos] === '(') {
      s.pos++; // skip '('
      const fn = name.toUpperCase();

      // IF(condition, value_if_true, value_if_false)
      if (fn === 'IF') {
        const left = parseAddSub(s);
        skipSpaces(s);
        let condResult: boolean;
        const ch = s.pos < s.input.length ? s.input[s.pos] : '';
        if (ch === '<' || ch === '>' || ch === '=' || ch === '!') {
          let op = s.input[s.pos]; s.pos++;
          if (s.pos < s.input.length && s.input[s.pos] === '=') { op += '='; s.pos++; }
          skipSpaces(s);
          const right = parseAddSub(s);
          skipSpaces(s);
          if (op === '<') condResult = left < right;
          else if (op === '>') condResult = left > right;
          else if (op === '<=') condResult = left <= right;
          else if (op === '>=') condResult = left >= right;
          else if (op === '==' || op === '=') condResult = left === right;
          else if (op === '!=') condResult = left !== right;
          else condResult = left !== 0;
        } else {
          condResult = left !== 0;
        }
        skipSpaces(s);
        if (s.pos < s.input.length && s.input[s.pos] === ',') s.pos++;
        skipSpaces(s);
        const valTrue = parseAddSub(s);
        skipSpaces(s);
        if (s.pos < s.input.length && s.input[s.pos] === ',') s.pos++;
        skipSpaces(s);
        const valFalse = parseAddSub(s);
        skipSpaces(s);
        if (s.pos < s.input.length && s.input[s.pos] === ')') s.pos++;
        return condResult ? valTrue : valFalse;
      }

      // Single-arg math functions: CEIL, FLOOR, ROUND, ROUNDUP, ROUNDDOWN
      const arg = parseAddSub(s);
      skipSpaces(s);
      if (s.pos < s.input.length && s.input[s.pos] === ')') {
        s.pos++; // skip ')'
      }
      if (fn === 'CEIL' || fn === 'ROUNDUP') return Math.ceil(arg);
      if (fn === 'FLOOR' || fn === 'ROUNDDOWN') return Math.floor(arg);
      if (fn === 'ROUND') return Math.round(arg);
      throw new Error(`Unknown function: ${name}`);
    }

    // Variable lookup
    if (name in s.context) return s.context[name];
    // Case-insensitive lookup
    const lower = name.toLowerCase();
    for (const key of Object.keys(s.context)) {
      if (key.toLowerCase() === lower) return s.context[key];
    }
    throw new Error(`Unknown variable: ${name}`);
  }

  throw new Error(`Unexpected character at position ${s.pos}`);
}

function isDigit(c: string): boolean { return c >= '0' && c <= '9'; }
function isAlpha(c: string): boolean { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_'; }
function isAlphaNumOrUnderscore(c: string): boolean { return isAlpha(c) || isDigit(c) || c === '_'; }

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

/**
 * Get the BOQ template structure for a pool model.
 * Returns saved customisations from localStorage if available,
 * otherwise returns the hardcoded defaults.
 */
export function getDefaultPoolBOQTemplate(): PoolBOQTemplateCategory[] {
  const saved = getSavedPoolBOQTemplate();
  if (saved) return saved;
  return getHardcodedBaseTemplate();
}

/**
 * Return the hardcoded base template (no localStorage check).
 */
export function getHardcodedBaseTemplate(): PoolBOQTemplateCategory[] {
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
 * Get the pool BOQ options template.
 * Returns saved customisations from localStorage if available,
 * otherwise returns the hardcoded defaults.
 */
export function getDefaultPoolBOQOptionsTemplate(): PoolBOQTemplateCategory[] {
  const saved = getSavedPoolBOQOptionsTemplate();
  if (saved) return saved;
  return getHardcodedOptionsTemplate();
}

/**
 * Return the hardcoded options template (no localStorage check).
 */
export function getHardcodedOptionsTemplate(): PoolBOQTemplateCategory[] {
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

/* ======================================================
   Template persistence (localStorage – legacy fallback)
====================================================== */

const STORAGE_KEY_BASE = 'pool_boq_template_base';
const STORAGE_KEY_OPTIONS = 'pool_boq_template_options';

/**
 * Save customised base template to localStorage.
 */
export function savePoolBOQTemplate(template: PoolBOQTemplateCategory[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_BASE, JSON.stringify(template));
  } catch { /* quota exceeded – silently ignore */ }
}

/**
 * Save customised options template to localStorage.
 */
export function savePoolBOQOptionsTemplate(template: PoolBOQTemplateCategory[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_OPTIONS, JSON.stringify(template));
  } catch { /* quota exceeded – silently ignore */ }
}

/**
 * Load the saved base template from localStorage, or return null if none exists.
 */
export function getSavedPoolBOQTemplate(): PoolBOQTemplateCategory[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BASE);
    if (raw) return JSON.parse(raw) as PoolBOQTemplateCategory[];
  } catch { /* corrupt data – ignore */ }
  return null;
}

/**
 * Load the saved options template from localStorage, or return null if none exists.
 */
export function getSavedPoolBOQOptionsTemplate(): PoolBOQTemplateCategory[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OPTIONS);
    if (raw) return JSON.parse(raw) as PoolBOQTemplateCategory[];
  } catch { /* corrupt data – ignore */ }
  return null;
}

/**
 * Clear any saved template overrides so the hardcoded defaults are used again.
 */
export function clearSavedPoolBOQTemplates(): void {
  localStorage.removeItem(STORAGE_KEY_BASE);
  localStorage.removeItem(STORAGE_KEY_OPTIONS);
}

/* ======================================================
   Template persistence (Database via API)
====================================================== */

/**
 * Database-backed template record as returned by the API.
 */
export interface PoolBOQTemplateRecord {
  id: number;
  name: string;
  description: string;
  is_default: boolean;
  template_data: {
    base: PoolBOQTemplateCategory[];
    options: PoolBOQTemplateCategory[];
  } | null;
  created_at: string;
  updated_at: string;
}

/**
 * Load the default template from the database.
 * Falls back to hardcoded defaults if no DB template exists.
 */
export async function loadTemplateFromDB(): Promise<{
  record: PoolBOQTemplateRecord | null;
  base: PoolBOQTemplateCategory[];
  options: PoolBOQTemplateCategory[];
}> {
  try {
    const record = await api.getDefaultPoolBOQTemplateFromDB();
    if (record && record.template_data) {
      return {
        record,
        base: record.template_data.base || getHardcodedBaseTemplate(),
        options: record.template_data.options || getHardcodedOptionsTemplate(),
      };
    }
    // No DB record – return hardcoded defaults
    return {
      record: record || null,
      base: getHardcodedBaseTemplate(),
      options: getHardcodedOptionsTemplate(),
    };
  } catch {
    // API unavailable – fall back to localStorage / hardcoded
    return {
      record: null,
      base: getDefaultPoolBOQTemplate(),
      options: getDefaultPoolBOQOptionsTemplate(),
    };
  }
}

/**
 * Save the template to the database.
 * Creates a new default record if none exists, otherwise updates the existing one.
 * Returns the database record ID.
 */
export async function saveTemplateToDB(
  base: PoolBOQTemplateCategory[],
  options: PoolBOQTemplateCategory[],
  existingRecordId?: number,
): Promise<number> {
  const templateData = { base, options };

  let recordId: number;
  if (existingRecordId) {
    await api.updatePoolBOQTemplate({
      id: existingRecordId,
      template_data: templateData,
    });
    recordId = existingRecordId;
  } else {
    const result = await api.createPoolBOQTemplate({
      name: 'Modèle par défaut',
      description: 'Modèle BOQ piscine par défaut',
      is_default: true,
      template_data: templateData,
    });
    recordId = result.id;
  }

  // Also keep localStorage in sync as fallback
  savePoolBOQTemplate(base);
  savePoolBOQOptionsTemplate(options);

  return recordId;
}

/* ======================================================
   Shape-specific templates (L and T)
====================================================== */

export type PoolShape = 'Rectangulaire' | 'L' | 'T';

/** DB record name used to identify per-shape templates. */
const SHAPE_TEMPLATE_NAMES: Record<PoolShape, string> = {
  Rectangulaire: 'Modèle par défaut',
  L: 'Modèle Piscine en L',
  T: 'Modèle Piscine en T',
};

/**
 * Hardcoded base template for L-shaped pools.
 * Uses longueur_la/lb, largeur_la/lb, profondeur_la/lb dimension variables.
 */
export function getHardcodedLShapeBaseTemplate(): PoolBOQTemplateCategory[] {
  return [
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
            { description: "Main d'oeuvre", quantity: 1, quantity_formula: '0.125 * (longueur_la * largeur_la + longueur_lb * largeur_lb)', unit: 'jour', price_list_name: "Main d'oeuvre (1 jour)" },
            { description: 'Transport de matériaux', quantity: 1, quantity_formula: 'CEIL((longueur_la * largeur_la + longueur_lb * largeur_lb) / 15) * 2', unit: 'unité', price_list_name: 'Transport Matériaux' },
            { description: 'Transport évacuation de la terre', quantity: 1, quantity_formula: 'CEIL((longueur_la * largeur_la + longueur_lb * largeur_lb) / 15) * 3', unit: 'unité', price_list_name: 'Transport Matériaux' },
          ],
        },
      ],
    },
  ];
}

/**
 * Hardcoded base template for T-shaped pools.
 * Uses longueur_ta/tb, largeur_ta/tb, profondeur_ta/tb dimension variables.
 */
export function getHardcodedTShapeBaseTemplate(): PoolBOQTemplateCategory[] {
  return [
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
            { description: "Main d'oeuvre", quantity: 1, quantity_formula: '0.125 * (longueur_ta * largeur_ta + longueur_tb * largeur_tb)', unit: 'jour', price_list_name: "Main d'oeuvre (1 jour)" },
            { description: 'Transport de matériaux', quantity: 1, quantity_formula: 'CEIL((longueur_ta * largeur_ta + longueur_tb * largeur_tb) / 15) * 2', unit: 'unité', price_list_name: 'Transport Matériaux' },
            { description: 'Transport évacuation de la terre', quantity: 1, quantity_formula: 'CEIL((longueur_ta * largeur_ta + longueur_tb * largeur_tb) / 15) * 3', unit: 'unité', price_list_name: 'Transport Matériaux' },
          ],
        },
      ],
    },
  ];
}

/**
 * Return the default base template for a given pool shape.
 */
export function getHardcodedBaseTemplateByShape(shape: PoolShape): PoolBOQTemplateCategory[] {
  if (shape === 'L') return getHardcodedLShapeBaseTemplate();
  if (shape === 'T') return getHardcodedTShapeBaseTemplate();
  return getHardcodedBaseTemplate();
}

/**
 * Load a shape-specific template from the database.
 * Falls back to the hardcoded defaults for that shape.
 */
export async function loadTemplateFromDBByShape(shape: PoolShape): Promise<{
  record: PoolBOQTemplateRecord | null;
  base: PoolBOQTemplateCategory[];
  options: PoolBOQTemplateCategory[];
}> {
  const targetName = SHAPE_TEMPLATE_NAMES[shape];
  try {
    const templates: PoolBOQTemplateRecord[] = await api.getPoolBOQTemplates();
    const record = templates.find(t => t.name === targetName) || null;
    if (record && record.template_data) {
      return {
        record,
        base: record.template_data.base || getHardcodedBaseTemplateByShape(shape),
        options: record.template_data.options || getHardcodedOptionsTemplate(),
      };
    }
    return {
      record: record || null,
      base: getHardcodedBaseTemplateByShape(shape),
      options: getHardcodedOptionsTemplate(),
    };
  } catch {
    return {
      record: null,
      base: getHardcodedBaseTemplateByShape(shape),
      options: getHardcodedOptionsTemplate(),
    };
  }
}

/**
 * Save a shape-specific template to the database.
 * Creates a new record if none exists for this shape, otherwise updates it.
 * Returns the database record ID.
 */
export async function saveTemplateToDBByShape(
  shape: PoolShape,
  base: PoolBOQTemplateCategory[],
  options: PoolBOQTemplateCategory[],
  existingRecordId?: number,
): Promise<number> {
  const templateData = { base, options };
  const targetName = SHAPE_TEMPLATE_NAMES[shape];
  const isDefault = shape === 'Rectangulaire';

  let recordId: number;
  if (existingRecordId) {
    await api.updatePoolBOQTemplate({ id: existingRecordId, template_data: templateData });
    recordId = existingRecordId;
  } else {
    const result = await api.createPoolBOQTemplate({
      name: targetName,
      description: `Modèle BOQ piscine ${shape === 'Rectangulaire' ? 'rectangulaire' : shape === 'L' ? 'en L' : 'en T'}`,
      is_default: isDefault,
      template_data: templateData,
    });
    recordId = result.id;
  }
  return recordId;
}
