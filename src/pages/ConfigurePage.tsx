import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  ZoomIn
} from 'lucide-react';
import { useQuote, ModelOption } from '@/contexts/QuoteContext';
import { getModelOptions } from '@/data/models';
import ConstructionBanner from '@/components/ConstructionBanner';
import { useSiteSettings } from '@/hooks/use-site-settings';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const ConfigurePage: React.FC = () => {
  const navigate = useNavigate();
  const { quoteData, toggleOption, calculateTotal } = useQuote();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>('');

  const { data: siteSettings } = useSiteSettings();
  const underConstruction = siteSettings?.siteUnderConstruction === true;
  const ucMessage = siteSettings?.constructionMessage || 'Page en construction';

  useEffect(() => {
    if (!quoteData.model) navigate('/');
  }, [quoteData.model, navigate]);

  if (!quoteData.model) return null;
  const model = quoteData.model;
  const options = getModelOptions(model);
  const groupedOptions = options.reduce((acc, opt) => {
    if (!acc[opt.category]) acc[opt.category] = [];
    acc[opt.category].push(opt);
    return acc;
  }, {} as Record<string, ModelOption[]>);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const isSelected = (optId: string) => quoteData.selectedOptions.some(o => o.id === optId);

  const openLightbox = (url: string, title: string) => {
    setLightboxImage(url);
    setLightboxTitle(title);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
          <button onClick={() => setLightboxImage(null)} className="absolute top-4 right-4 text-white">
            <X className="w-8 h-8" />
          </button>
          <div className="max-w-4xl max-h-[90vh] w-full">
            <p className="text-white text-center mb-4 text-lg font-medium">{lightboxTitle}</p>
            <img src={lightboxImage} alt={lightboxTitle} className="w-full h-auto object-contain rounded" />
          </div>
        </div>
      )}

      <header className="bg-white shadow sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" /> Retour aux Modèles
          </button>
          <h1 className="text-xl font-bold text-orange-600">Configuration</h1>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total estimé</p>
            <p className="text-lg font-bold text-gray-800">Rs {calculateTotal().toLocaleString()}</p>
          </div>
        </div>
      </header>

      {underConstruction && <ConstructionBanner message={ucMessage} />}

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* IMAGE & PLAN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative">
            <img
              src={model.image_url}
              alt={model.name}
              className="w-full h-auto rounded shadow cursor-pointer"
              onClick={() => openLightbox(model.image_url, model.name)}
            />
            <button className="absolute top-2 right-2 bg-white p-1 rounded-full shadow" onClick={() => openLightbox(model.image_url, model.name)}>
              <ZoomIn className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {model.plan_url && (
            <div className="relative">
              <img
                src={model.plan_url}
                alt="Plan"
                className="w-full h-auto rounded shadow cursor-pointer"
                onClick={() => openLightbox(model.plan_url!, 'Plan du modèle')}
              />
              <button className="absolute top-2 right-2 bg-white p-1 rounded-full shadow" onClick={() => openLightbox(model.plan_url!, 'Plan du modèle')}>
                <ZoomIn className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
        </div>

        {/* INFOS */}
        <div className="bg-white p-6 rounded shadow space-y-2">
          <h2 className="text-2xl font-bold">{model.name}</h2>
          <p className="text-gray-600">{model.description}</p>
          <ul className="text-sm text-gray-700 list-disc list-inside space-y-1 pt-2">
            <li>Surface: {model.surface_m2} m²</li>
            {model.type === 'container' && <li>{model.bedrooms} chambre(s), {model.bathrooms} salle(s) de bain</li>}
            {model.type === 'container' && <li>{model.container_20ft_count} conteneur(s) 20' • {model.container_40ft_count} conteneur(s) 40'</li>}
            {model.type === 'pool' && <li>Forme: {model.pool_shape}</li>}
            {model.type === 'pool' && <li>Avec débordement : {model.has_overflow ? 'Oui' : 'Non'}</li>}
          </ul>
        </div>

        {/* OPTIONS */}
        <div className="space-y-6">
          {Object.entries(groupedOptions).map(([category, opts]) => {
            const isOpen = expandedCategories.includes(category);
            return (
              <div key={category} className="border rounded bg-white">
                <button
                  className="w-full flex justify-between items-center px-4 py-3 text-left text-lg font-semibold border-b hover:bg-gray-50"
                  onClick={() => toggleCategory(category)}
                >
                  <span>{category}</span>
                  {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {isOpen && (
                  <div className="divide-y">
                    {opts.map(opt => (
                      <label key={opt.id} className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 cursor-pointer">
                        <div>
                          <p className="font-medium">{opt.label}</p>
                          <p className="text-sm text-gray-500">Rs {opt.price.toLocaleString()}</p>
                        </div>
                        <Switch
                          checked={isSelected(opt.id)}
                          onCheckedChange={() => toggleOption(opt)}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ConfigurePage;
