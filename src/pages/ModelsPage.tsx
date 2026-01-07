import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/layouts/PublicLayout';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

interface Model {
  id: number;
  name: string;
  type: 'container' | 'pool';
  description: string;
  base_price: number;
  dimensions: string;
  bedrooms?: number;
  bathrooms?: number;
  image_url: string;
  plan_url?: string;
  container_20ft?: number;
  container_40ft?: number;
  pool_shape?: string;
  pool_overflow?: boolean;
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'container' | 'pool'>('all');
  const [modalImage, setModalImage] = useState<string | null>(null);

  // Filtres dynamiques
  const [bedrooms, setBedrooms] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [c20, setC20] = useState('');
  const [c40, setC40] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [poolShape, setPoolShape] = useState('');
  const [overflow, setOverflow] = useState<boolean | null>(null);

  useEffect(() => {
    api.getModels(undefined, true).then(setModels);
  }, []);

  const filtered = models.filter((m) => {
    if (filterType !== 'all' && m.type !== filterType) return false;

    if (filterType === 'container') {
      if (bedrooms && m.bedrooms !== Number(bedrooms)) return false;
      if (dimensions && !m.dimensions.toLowerCase().includes(dimensions.toLowerCase())) return false;
      if (c20 && m.container_20ft !== Number(c20)) return false;
      if (c40 && m.container_40ft !== Number(c40)) return false;
    }

    if (filterType === 'pool') {
      if (dimensions && !m.dimensions.toLowerCase().includes(dimensions.toLowerCase())) return false;
      if (poolShape && m.pool_shape !== poolShape) return false;
      if (overflow !== null && m.pool_overflow !== overflow) return false;
    }

    if (minPrice && m.base_price < Number(minPrice)) return false;
    if (maxPrice && m.base_price > Number(maxPrice)) return false;

    return true;
  });

  const formatPrice = (price: number) => `Rs ${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6 text-center">Nos Modèles</h1>

        {/* Filtres principaux */}
        <div className="flex justify-center gap-4 mb-6">
          <Button variant={filterType === 'all' ? 'default' : 'outline'} onClick={() => setFilterType('all')}>Tous</Button>
          <Button variant={filterType === 'container' ? 'default' : 'outline'} onClick={() => setFilterType('container')}>Conteneurs</Button>
          <Button variant={filterType === 'pool' ? 'default' : 'outline'} onClick={() => setFilterType('pool')}>Piscines</Button>
        </div>

        {/* Filtres dynamiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {filterType === 'container' && (
            <>
              <Input placeholder="Nombre de chambres" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
              <Input placeholder="Dimensions (ex: 6x2.4)" value={dimensions} onChange={(e) => setDimensions(e.target.value)} />
              <Input placeholder="Nb Conteneur 20'" value={c20} onChange={(e) => setC20(e.target.value)} />
              <Input placeholder="Nb Conteneur 40'" value={c40} onChange={(e) => setC40(e.target.value)} />
            </>
          )}

          {filterType === 'pool' && (
            <>
              <Input placeholder="Dimensions (ex: 8x3m)" value={dimensions} onChange={(e) => setDimensions(e.target.value)} />
              <Select value={poolShape} onValueChange={setPoolShape}>
                <SelectTrigger><SelectValue placeholder="Forme" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rectangulaire">Rectangulaire</SelectItem>
                  <SelectItem value="t">T</SelectItem>
                  <SelectItem value="l">L</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <label className="text-sm">Débordement</label>
                <Checkbox checked={overflow === true} onCheckedChange={(v) => setOverflow(v ? true : null)} /> Oui
                <Checkbox checked={overflow === false} onCheckedChange={(v) => setOverflow(v ? false : null)} /> Non
              </div>
            </>
          )}

          {/* Prix (communs) */}
          <Input placeholder="Prix min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          <Input placeholder="Prix max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
        </div>

        {/* Grille des modèles */}
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
                <p className="text-gray-600 text-sm">{model.dimensions}</p>

                {model.type === 'container' && (
                  <p className="text-sm text-gray-500">
                    {model.bedrooms} chambre{model.bedrooms !== 1 ? 's' : ''} • {model.bathrooms} salle{model.bathrooms !== 1 ? 's' : ''} de bain
                  </p>
                )}

                <p className="text-orange-600 font-semibold">{formatPrice(model.base_price)} TTC</p>
                <p className="text-sm text-gray-700 line-clamp-3">{model.description}</p>

                <div className="pt-3">
                  <Button variant="outline" asChild>
                    <a href={`/configure?id=${model.id}`}>Configurer</a>
                  </Button>
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
    </PublicLayout>
  );
}
