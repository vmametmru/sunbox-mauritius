import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface SiteSettingsData {
  site_under_construction?: string;
  under_construction_message?: string;
  site_logo?: string;
  pdf_logo?: string;
  site_slogan?: string;
  vat_rate?: string;
}

export function useSiteSettings() {
  return useQuery<SiteSettingsData>({
    queryKey: ["settings", "site"],
    queryFn: () => api.getSettings("site"),
    staleTime: 60_000,
  });
}

/**
 * Returns the VAT rate as a number (e.g., 15 for 15%)
 * Default is 15% for Mauritius
 */
export function useVatRate(): number {
  const { data } = useSiteSettings();
  return Number(data?.vat_rate) || 15;
}

/**
 * Calculate TTC from HT price using VAT rate from settings
 * @param priceHT - Price excluding taxes (HT)
 * @param vatRate - VAT rate as percentage (e.g., 15 for 15%)
 * @returns Price including taxes (TTC)
 */
export function calculateTTC(priceHT: number, vatRate: number): number {
  return priceHT * (1 + vatRate / 100);
}
