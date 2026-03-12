import type { CSSProperties } from 'react';

/**
 * Read the pro theme object injected by the deployed site's index.php.
 * Returns the raw theme or null on non-pro (Sunbox portal) pages.
 */
export function getProTheme(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  return (window as any).__PRO_THEME__ ?? null;
}

/**
 * Returns inline style overrides for primary action buttons on pro sites.
 * Applies button_color and button_text_color from the active pro theme.
 * Returns {} on the Sunbox portal or when no theme is assigned, so
 * default Tailwind classes remain unchanged.
 *
 * button_color is the gate: if it is absent the theme intentionally has no
 * button override (e.g. the admin cleared the color), so we return {} for all
 * button properties to avoid a partially-styled button.
 *
 * Usage:
 *   const btnStyle = getProButtonStyle();
 *   <Button className="bg-orange-500 ..." style={btnStyle}>...</Button>
 *
 * The inline style has higher specificity than Tailwind classes, so it
 * correctly overrides both the base and hover background-color values.
 */
export function getProButtonStyle(): CSSProperties {
  const theme = getProTheme();
  if (!theme?.button_color) return {};
  return {
    backgroundColor: theme.button_color as string,
    color: (theme.button_text_color as string | undefined) ?? '#FFFFFF',
    borderColor: theme.button_color as string,
  };
}
