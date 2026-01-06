// src/pages/ModelsPage.tsx
import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/layouts/PublicLayout';

export default function ModelsPage() {
  const [models, setModels] = useState<any[]>([]);

  useEffect(() => {
    api.getModels('container', true).then(setModels);
  }, []);

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Nos Modèles</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => (
            <div key={model.id} className="border rounded-lg overflow-hidden shadow-sm">
              {model.image_url && (
                <img
                  src={model.image_url}
                  alt={model.name}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <h2 className="text-xl font-bold">{model.name}</h2>
                <p className="text-gray-600 text-sm mb-2">{model.dimensions}</p>
                <p className="text-orange-600 font-semibold mb-4">
                  Rs {model.base_price.toLocaleString()}
                </p>
                <Button variant="outline" asChild>
                  <a href={`/configure?id=${model.id}`}>Configurer</a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
