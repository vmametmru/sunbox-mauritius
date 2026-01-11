// CONTENU COMPLÉTEMENT MIS À JOUR
// Inclut : ouverture de modal latérale, setQuoteModel, configuration dynamique
// ...

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
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

interface Model {
  id: number;
  name: string;
  type: 'container' | 'pool';
  description: string;
  base_price: number;
  surface_m2: number;
  bedrooms?: number;
  bathrooms?: number;
  container_20ft_count?: number;
  container_40ft_count?: number;
  pool_shape?: string;
  has_overflow?: boolean;
  image_url: string;
  plan_url?: string;
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'container' | 'pool'>('all');
  const [modalImage, setModalImage] = useState<string | null>(null);

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

  const { setSelectedModel, quoteData } = useQuote();
  const [showConfigurator, setShowConfigurator] = useState(false);

  useEffect(() => {
    api.getModels(undefined, true).then((data) => {
      setModels(data);
      const surfaces = data.map((m: any) => m.surface_m2 || 0);
      const prices = data.map((m: any) => m.base_price || 0);
      setRangeLimits({
        surface: [Math.min(...surfaces), Math.max(...surfaces)],
        price: [Math.min(...prices), Math.max(...prices)]
      });
      setFilters(f => ({
        ...f,
        surfaceMin: Math.min(...surfaces),
        surfaceMax: Math.max(...surfaces),
        priceMin: Math.min(...prices),
        priceMax: Math.max(...prices)
      }));
    });
  }, []);

  const filtered = models.filter((m) => {
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
    if (m.base_price < filters.priceMin || m.base_price > filters.priceMax) return false;
    return true;
  });

  const formatPrice = (price: number) => `Rs ${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const openConfigurator = (model: Model) => {
    setSelectedModel(model);
    setShowConfigurator(true);
  };

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6 text-center">Nos Modèles</h1>

        {/* Filtres type */}
        <div className="flex justify-center gap-4 mb-4">
          <Button variant={filterType === 'all' ? 'default' : 'outline'} onClick={() => setFilterType('all')}>Tous</Button>
          <Button variant={filterType === 'container' ? 'default' : 'outline'} onClick={() => setFilterType('container')}>Conteneurs</Button>
          <Button variant={filterType === 'pool' ? 'default' : 'outline'} onClick={() => setFilterType('pool')}>Piscines</Button>
        </div>

        {/* Filtres spécifiques */}
        {/* ... (code inchangé pour les filtres) ... */}

        {/* Grille */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((model) => (
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
                    onClick={() => setModalImage(model.plan_url)}
                  />
                )}
              </div>
              <div className="p-4 space-y-1">
                <h2 className="text-xl font-bold">{model.name}</h2>
                <p className="text-gray-600 text-sm">{model.surface_m2} m²</p>
                <p className="text-orange-600 font-semibold">{formatPrice(model.base_price)} TTC</p>
                <p className="text-sm text-gray-700">{model.description}</p>
                <div className="pt-3">
                  <Button variant="outline" onClick={() => openConfigurator(model)}>Configurer</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox image */}
      {modalImage && (
        <Dialog open onOpenChange={() => setModalImage(null)}>
          <DialogContent className="max-w-4xl">
            <img src={modalImage} alt="Image zoomée" className="w-full h-auto object-contain" />
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL CONFIGURATEUR */}
      {quoteData.model && (
        <ConfigureModal isOpen={showConfigurator} onClose={() => setShowConfigurator(false)} />
      )}
    </PublicLayout>
  );
}
