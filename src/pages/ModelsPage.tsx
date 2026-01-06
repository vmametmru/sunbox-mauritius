import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Home, Droplets, Settings } from 'lucide-react';

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
  features: string[];
  is_active: boolean;
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const data = await api.getModels();
      setModels(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur lors du chargement des modèles:', err);
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => `Rs ${Number(price).toLocaleString()}`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Nos Modèles</h1>
        <p className="text-gray-600">Découvrez notre sélection de containers et piscines modulaires</p>
      </div>

      {loading ? (
        <div className="text-center text-gray-500">Chargement...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => (
            <Card key={model.id} className="overflow-hidden">
              <div className="relative aspect-video bg-gray-100">
                {model.image_url ? (
                  <img
                    src={model.image_url}
                    alt={model.name}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setModalImage(model.image_url)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {model.type === 'container' ? (
                      <Home className="h-16 w-16 text-gray-300" />
                    ) : (
                      <Droplets className="h-16 w-16 text-gray-300" />
                    )}
                  </div>
                )}

                {model.plan_url && (
                  <div className="absolute bottom-2 left-2 bg-white/70 rounded shadow p-1">
                    <img
                      src={model.plan_url}
                      alt="Plan"
                      className="w-12 h-12 object-contain cursor-pointer"
                      onClick={() => setModalImage(model.plan_url)}
                    />
                  </div>
                )}

                <div className="absolute top-2 right-2">
                  <Badge className={model.type === 'container' ? 'bg-blue-500' : 'bg-cyan-500'}>
                    {model.type === 'container' ? 'Container' : 'Piscine'}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4">
                <h3 className="font-bold text-lg">{model.name}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{model.description}</p>
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-xl font-bold text-orange-600">{formatPrice(model.base_price)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/configure?id=${model.id}`)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Configurer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Image preview modal */}
      {modalImage && (
        <Dialog open={!!modalImage} onOpenChange={() => setModalImage(null)}>
          <DialogContent className="max-w-4xl">
            <img src={modalImage} alt="Zoom" className="w-full h-auto object-contain" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
