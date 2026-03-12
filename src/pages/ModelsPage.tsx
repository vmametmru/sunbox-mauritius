import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PublicLayout from '@/layouts/PublicLayout';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useQuote } from '@/contexts/QuoteContext';
import ConfigureModal from '@/components/ConfigureModal';
import { useSiteSettings, calculateTTC } from '@/hooks/use-site-settings';

interface ActiveDiscount {
  id: number;
  name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  apply_to: 'base_price' | 'options' | 'both';
  end_date: string;
  model_ids?: number[];
}

interface ModelType {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon_name: string;
  display_order: number;
  is_active: boolean;
}

interface Model {
  id: number;
  name: string;
  type: string;
  description: string;
  base_price: number;
  calculated_base_price?: number; // BOQ-calculated price if available
  price_source?: 'boq' | 'manual';
  surface_m2: number;
  bedrooms?: number;
  bathrooms?: number;
  container_20ft_count?: number;
  container_40ft_count?: number;
  pool_shape?: string;
  has_overflow?: boolean;
  image_url: string;
  plan_url?: string;
  active_discounts?: ActiveDiscount[];
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [allActiveDiscounts, setAllActiveDiscounts] = useState<ActiveDiscount[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [customTypes, setCustomTypes] = useState<ModelType[]>([]);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [catalogMode, setCatalogMode] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { data: siteSettings } = useSiteSettings();
  const vatRate = Number(siteSettings?.vat_rate) || 15;

  const [filters, setFilters] = useState({
    bedrooms: '',
    container20: '',
    container40: '',
    surfaceMin: 0,
    surfaceMax: 0,
    priceMin: 0,
    priceMax: 0,
    poolShape: '',
    hasOverflow: ''
  });

  const [rangeLimits, setRangeLimits] = useState({
    surface: [0, 0],
    price: [0, 0]
  });

  const { setSelectedModel } = useQuote();
  const [showConfigurator, setShowConfigurator] = useState(false);

  // Helper to get the display price HT (BOQ price if available, otherwise manual base_price)
  const getDisplayPriceHT = (model: Model) => {
    return Number(model.calculated_base_price ?? model.base_price ?? 0);
  };

  // Helper to get TTC price
  const getDisplayPriceTTC = (model: Model) => {
    return calculateTTC(getDisplayPriceHT(model), vatRate);
  };

  useEffect(() => {
    // Read ?type= from URL to pre-select a filter
    const urlType = new URLSearchParams(window.location.search).get('type');
    if (urlType) setFilterType(urlType);

    api.getModels(undefined, true).then((data) => {
      // Pro site returns { models: [...], catalog_mode: bool, _error?: string, ... }
      // Sunbox site returns a plain array
      const modelList: Model[] = Array.isArray(data) ? data : (data?.models ?? []);
      const isCatalog: boolean = Array.isArray(data) ? false : !!(data?.catalog_mode);
      setCatalogMode(isCatalog);
      setModels(modelList);
      // Surface error message for pro site debugging (_error only set on failure)
      if (!Array.isArray(data) && data?._error) {
        console.error('Pro site models error:', data._error);
        if (modelList.length === 0) setApiError(data._error);
      }

      const surfaces = modelList.map((m: any) => Number(m.surface_m2) || 0);
      const minSurface = Math.min(...surfaces);
      const maxSurface = Math.max(...surfaces);

      setRangeLimits(r => ({ ...r, surface: [minSurface, maxSurface] }));
      setFilters(f => ({ ...f, surfaceMin: minSurface, surfaceMax: maxSurface }));
    }).catch((err) => {
      console.error('getModels failed:', err);
      setApiError(String(err?.message || err));
    });
    // Fetch all active discounts as fallback (in case server hasn't embedded them in get_models)
    api.getActiveDiscounts().then((data) => {
      setAllActiveDiscounts(Array.isArray(data) ? data : []);
    }).catch(() => {});
    // Load custom model types for dynamic filter buttons
    api.getModelTypes(true).then((data) => {
      setCustomTypes(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  // Recompute TTC price limits whenever models or vatRate changes
  useEffect(() => {
    if (models.length === 0) return;
    const ttcPrices = models.map(m => getDisplayPriceTTC(m));
    const maxPriceTTC = Math.max(...ttcPrices);
    setRangeLimits(r => ({ ...r, price: [0, maxPriceTTC] }));
    setFilters(f => ({ ...f, priceMin: 0, priceMax: maxPriceTTC }));
  }, [models, vatRate]);

  const openConfigurator = (model: Model) => {
    // Pass the HT base price to the configurator (VAT is applied inside for display)
    const modelWithPrice = {
      ...model,
      base_price: getDisplayPriceHT(model),
    };
    setSelectedModel(modelWithPrice);
    setShowConfigurator(true);
  };

  // Get active discounts for a model.
  // Primary source: active_discounts embedded by PHP in get_models.
  // Fallback: filter allActiveDiscounts fetched separately (uses Number() to handle string IDs).
  const getModelDiscounts = (model: Model): ActiveDiscount[] => {
    if (model.active_discounts !== undefined) {
      return model.active_discounts;
    }
    const modelId = Number(model.id);
    return allActiveDiscounts.filter(d => {
      const ids = Array.isArray(d.model_ids) ? d.model_ids.map(Number) : [];
      return ids.length === 0 || ids.includes(modelId);
    });
  };

  // Returns the discounted TTC price when at least one discount affects the base price.
  // Returns null if no price-affecting discount exists.
  const getDiscountedBasePriceTTC = (model: Model, discounts: ActiveDiscount[]): number | null => {
    const originalTTC = getDisplayPriceTTC(model);
    let discountAmount = 0;
    for (const d of discounts) {
      if (d.apply_to === 'options') continue;
      const value = Number(d.discount_value);
      if (d.discount_type === 'percentage') {
        discountAmount += originalTTC * value / 100;
      } else {
        discountAmount += value;
      }
    }
    if (discountAmount <= 0) return null;
    return Math.max(0, originalTTC - discountAmount);
  };

  // Format YYYY-MM-DD → DD/MM/YYYY
  const formatDate = (d: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  // Return the soonest end_date among discounts (first to expire)
  const getEarliestEndDate = (discounts: ActiveDiscount[]): string => {
    if (discounts.length === 0) return '';
    return discounts.reduce((earliest, d) =>
      d.end_date < earliest ? d.end_date : earliest,
      discounts[0].end_date
    );
  };

  const filtered = models
    .filter((m) => {
      if (filterType !== 'all' && m.type !== filterType) return false;

      if (filterType === 'container') {
        if (filters.bedrooms && m.bedrooms !== Number(filters.bedrooms)) return false;
        if (filters.container20 && m.container_20ft_count !== Number(filters.container20)) return false;
        if (filters.container40 && m.container_40ft_count !== Number(filters.container40)) return false;
      }

      if (filterType === 'pool') {
        if (filters.poolShape && m.pool_shape !== filters.poolShape) return false;
        if (filters.hasOverflow && String(m.has_overflow) !== filters.hasOverflow) return false;
      }

      if (m.surface_m2 < filters.surfaceMin || m.surface_m2 > filters.surfaceMax) return false;

      // Use TTC price for filtering
      const modelPriceTTC = getDisplayPriceTTC(m);
      if (modelPriceTTC < filters.priceMin || modelPriceTTC > filters.priceMax) return false;

      return true;
    })
    .sort((a, b) => getDisplayPriceHT(a) - getDisplayPriceHT(b));

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6 text-center">Nos Solutions</h1>

        <div className="flex flex-wrap justify-center gap-3 mb-4">
          <Button variant={filterType === 'all' ? 'default' : 'outline'} onClick={() => setFilterType('all')}>
            Tous
          </Button>
          <Button variant={filterType === 'container' ? 'default' : 'outline'} onClick={() => setFilterType('container')}>
            Conteneurs
          </Button>
          <Button variant={filterType === 'pool' ? 'default' : 'outline'} onClick={() => setFilterType('pool')}>
            Piscines
          </Button>
          {customTypes.map(ct => (
            <Button
              key={ct.slug}
              variant={filterType === ct.slug ? 'default' : 'outline'}
              onClick={() => setFilterType(ct.slug)}
            >
              {ct.name}
            </Button>
          ))}
        </div>

        {/* Price range filter */}
        {rangeLimits.price[1] > 0 && (
          <div className="flex justify-end mb-4">
            <div className="w-full max-w-sm">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Prix de base TTC</span>
                <span>
                  {Number(filters.priceMin).toLocaleString(undefined, { maximumFractionDigits: 0 })} Rs
                  {' – '}
                  {Number(filters.priceMax).toLocaleString(undefined, { maximumFractionDigits: 0 })} Rs
                </span>
              </div>
              <Slider
                min={0}
                max={rangeLimits.price[1]}
                step={1000}
                value={[filters.priceMin, filters.priceMax]}
                onValueChange={([min, max]) =>
                  setFilters(f => ({ ...f, priceMin: min, priceMax: max }))
                }
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0 Rs</span>
                <span>{Number(rangeLimits.price[1]).toLocaleString(undefined, { maximumFractionDigits: 0 })} Rs</span>
              </div>
            </div>
          </div>
        )}

        {/* API error banner — only visible when models failed to load (pro site debugging) */}
        {apiError && models.length === 0 && (typeof window !== 'undefined' && (window as any).__PRO_SITE__) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            <strong>Erreur de chargement des modèles:</strong><br />
            <code className="text-xs break-all">{apiError}</code>
            <p className="mt-1 text-xs text-red-600">
              Vérifiez que les fichiers sont déployés (version à jour) et que la base de données est initialisée.
            </p>
          </div>
        )}

        {/* Grille modèles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((model) => {
            const modelDiscounts = getModelDiscounts(model);
            const isBOQModel = model.type === 'pool' || (model.type !== 'container');
            const discountedPrice = !isBOQModel
              ? getDiscountedBasePriceTTC(model, modelDiscounts)
              : null;
            const originalPriceTTC = getDisplayPriceTTC(model);
            const earliestEndDate = getEarliestEndDate(modelDiscounts);
            return (
            <div key={model.id} className="border rounded-lg overflow-hidden shadow-sm bg-white">
              <div className="relative">
                <img
                  src={model.image_url}
                  alt={model.name}
                  className="w-full h-48 object-cover cursor-pointer"
                  onClick={() => setModalImage(model.image_url)}
                />
                {model.plan_url && (
                  <img
                    src={model.plan_url}
                    alt="Plan"
                    className="absolute bottom-2 left-2 w-14 h-14 object-contain border rounded shadow bg-white cursor-pointer"
                    onClick={() => setModalImage(model.plan_url!)}
                  />
                )}
                {modelDiscounts.length > 0 && (
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    {modelDiscounts.map(d => (
                      <Badge key={d.id} className="bg-green-600 text-white text-xs px-2 py-0.5">
                        🏷 {d.discount_type === 'percentage' ? `−${d.discount_value}%` : `−Rs ${Number(d.discount_value).toLocaleString()}`}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 space-y-1">
                <h2 className="text-xl font-bold">{model.name}</h2>
                <p className="text-gray-600 text-sm">
                  {model.type === 'pool'
                    ? 'Piscine en blocs BAB et béton armé'
                    : model.type === 'container'
                    ? `${model.surface_m2} m²`
                    : `${customTypes.find(ct => ct.slug === model.type)?.name ?? model.type}${model.surface_m2 ? ` — ${model.surface_m2} m²` : ''}`}
                </p>

                {/* Discount validity line — shown above the price */}
                {modelDiscounts.length > 0 && (
                  <p className="text-green-700 text-sm font-medium">
                    🏷 Remise valable jusqu'au : {formatDate(earliestEndDate)}
                  </p>
                )}

                {/* Price line */}
                {isBOQModel ? (
                  <p className="text-orange-600 font-semibold">Cliquez sur configurer</p>
                ) : discountedPrice !== null ? (
                  <>
                    <p className="text-gray-900 font-semibold">
                      A partir de{' '}
                      <span className="line-through text-gray-400">
                        {Number(originalPriceTTC).toLocaleString(undefined, { maximumFractionDigits: 0 })} Rs TTC
                      </span>
                    </p>
                    <p className="text-green-700 font-semibold">
                      {Number(discountedPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })} Rs TTC
                    </p>
                  </>
                ) : (
                  <p className="text-orange-600 font-semibold">
                    A partir de {Number(originalPriceTTC).toLocaleString(undefined, { maximumFractionDigits: 0 })} Rs TTC
                  </p>
                )}

                <div className="pt-3">
                  {catalogMode ? (
                    <p className="text-xs text-amber-600 font-medium">
                      📋 Mode catalogue — crédits insuffisants
                    </p>
                  ) : (
                    <Button variant="outline" onClick={() => openConfigurator(model)}>
                      Configurer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
          })}
        </div>
      </div>

      {/* Modal image */}
      {modalImage && (
        <Dialog open onOpenChange={() => setModalImage(null)}>
          <DialogContent className="max-w-4xl">
            <img src={modalImage} alt="Image zoomée" className="w-full h-auto object-contain" />
          </DialogContent>
        </Dialog>
      )}

      {/* Modal configurateur (corrigée) */}
      <ConfigureModal
        open={showConfigurator}
        onClose={() => setShowConfigurator(false)}
      />
    </PublicLayout>
  );
}
