import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Offset used to distinguish BOQ options from standard model options
// BOQ option IDs are offset by this value to avoid conflicts
export const BOQ_OPTION_ID_OFFSET = 1000000;

// Quote reference prefixes
export const QUOTE_REFERENCE_PREFIX = {
  FREE: 'WFQ',      // Free-form quotes
  CONTAINER: 'WCQ', // Container model quotes
  POOL: 'WPQ',      // Pool model quotes
} as const;
