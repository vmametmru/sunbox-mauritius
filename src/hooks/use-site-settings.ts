import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useSiteSettings() {
  return useQuery({
    queryKey: ["settings", "site"],
    queryFn: () => api.getSettings("site"),
    staleTime: 60_000,
  });
}
