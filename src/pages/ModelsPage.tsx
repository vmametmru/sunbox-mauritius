import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/layouts/PublicLayout';
import { Image } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

type Model = {
  id: number;
  name: string;
  type: string;
  description: string;
  base_price: number;
  dimensions: string;
  bedrooms?: number;
  bathrooms?: number;
  image_url: string;
  plan_url?: string;
};

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'container' | 'pool'>('all');
  const [modalImage, setModalImage] = useState<string | null>(null);

  useEffect(() => {
    api.getModels(undefined, true).then(setModels);
  }, []);

  const filtered = models.filter((m) => filterType === 'all' || m.type === filterType);
  const formatPrice = (price: number) => `Rs ${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6 text-center">Nos Modèles</h1>

        {/* Filtres */}
        <div className="flex justify-center gap-4 mb-8">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterType('all')}
          >
            Tous
          </Button>
          <Button
            variant={filterType === 'container' ? 'default' : 'outline'}
            onClick={() => setFilterType('container')}
          >
            Conteneurs
          </Button>
          <Button
            variant={filterType === 'pool' ? 'default' : 'outline'}
            onClick={() => setFilterType('pool')}
          >
            Piscines
          </Button>
        </div>

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
                <p className="text-gray-600 text-sm">{model.dimensions}</p>

                {model.type === 'container' && (
                  <p className="text-sm text-gray-500">
                    {model.bedrooms} chambre{model.bedrooms !== 1 ? 's' : ''} • {model.bathrooms} salle{model.bathrooms !== 1 ? 's' : ''} de bain
                  </p>
                )}

                <p className="text-orange-600 font-semibold">{formatPrice(model.base_price)} TTC</p>
                <p className="text-sm text-gray-700">{model.description}</p>

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
