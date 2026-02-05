import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  X,
  ZoomIn
} from 'lucide-react';
import { useQuote, ModelOption } from '@/contexts/QuoteContext';
import ConstructionBanner from '@/components/ConstructionBanner';
import { useSiteSettings } from '@/hooks/use-site-settings';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';

const ConfigurePage: React.FC = () => {
  const navigate = useNavigate();
  const { quoteData, toggleOption, calculateTotal } = useQuote();

  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [options, setOptions] = useState<ModelOption[]>([]);

  const { data: siteSettings } = useSiteSettings();
  const underConstruction = siteSettings?.siteUnderConstruction === true;
  const ucMessage = siteSettings?.constructionMessage || '🚧 Page en construction';

  useEffect(() => {
    if (!quoteData.model) navigate('/');
  }, [quoteData.model, navigate]);

  if (!quoteData.model) return null;
  const model = quoteData.model;

  // 🔧 Fix BUG calcul total : s'assurer que .price est bien un number
  const calculateOptionsTotal = () => {
    return quoteData.selectedOptions.reduce((sum, opt) => sum + Number(opt.price || 0), 0);
  };

  const calculateSafeTotal = () => {
    const base = Number(model.base_price ?? 0);
    return base + calculateOptionsTotal();
  };

  /* Load Options */
  useEffect(() => {
    if (model.id) loadOptions();
  }, [model.id]);

  const loadOptions = async () => {
    try {
      const data = await api.getModelOptions(model.id);
      const mapped: ModelOption[] = data.map((o: any) => ({
        id: Number(o.id),
        model_id: Number(o.model_id),
        category_id: Number(o.category_id),
        category_name: o.category_name || 'Autres',
        name: o.name,
        description: o.description,
        price: Number(o.price),
        is_active: Boolean(o.is_active),
      }));
      setOptions(mapped);
    } catch (err) {
      console.error(err);
    }
  };

  /* Regrouper par catégorie */
  const groupedOptions = options.reduce((acc, opt) => {
    const category = opt.category_name || 'Autres';
    if (!acc[category]) acc[category] = [];
    acc[category].push(opt);
    return acc;
  }, {} as Record<string, ModelOption[]>);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const isSelected = (id: number) =>
    quoteData.selectedOptions.some(o => o.id === id);

  const openLightbox = (url: string, title: string) => {
    setLightboxImage(url);
    setLightboxTitle(title);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* LIGHTBOX */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxImage(null);
            }}
          >
            <X className="w-8 h-8" />
          </button>
          <div className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <p className="text-white text-center mb-4 text-lg font-medium">
              {lightboxTitle}
            </p>
            <img
              src={lightboxImage}
              alt={lightboxTitle}
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white shadow sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <button
            onClick={() => navigate('/models')} // ✅ correct for HashRouter
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour aux Modèles
          </button>

          <div className="text-right space-y-1">
            <div className="flex justify-between items-center gap-8">
              <p className="text-xs text-gray-500">Prix de base TTC</p>
              <p className="text-sm font-medium text-gray-700">
                Rs {Number(model.base_price ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="flex justify-between items-center gap-8">
              <p className="text-xs text-gray-500">Total options TTC</p>
              <p className="text-sm font-medium text-gray-700">
                Rs {calculateOptionsTotal().toLocaleString()}
              </p>
            </div>
            <div className="flex justify-between items-center gap-8 pt-1 border-t">
              <p className="text-xs text-gray-500">Total général TTC</p>
              <p className="text-lg font-bold text-gray-800">
                Rs {calculateSafeTotal().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </header>

      {underConstruction && <ConstructionBanner message={ucMessage} />}

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* IMAGES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative">
            <img
              src={model.image_url}
              alt={model.name}
              className="w-full h-64 md:h-80 object-cover rounded shadow cursor-pointer"
              onClick={() => openLightbox(model.image_url, model.name)}
            />
            <button
              className="absolute top-2 right-2 bg-white p-1 rounded-full shadow"
              onClick={() => openLightbox(model.image_url, model.name)}
            >
              <ZoomIn className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {model.plan_url && (
            <div className="relative">
              <img
                src={model.plan_url}
                alt="Plan"
                className="w-full h-64 md:h-80 object-cover rounded shadow cursor-pointer"
                onClick={() => openLightbox(model.plan_url!, 'Plan du modèle')}
              />
              <button
                className="absolute top-2 right-2 bg-white p-1 rounded-full shadow"
                onClick={() => openLightbox(model.plan_url!, 'Plan du modèle')}
              >
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
            <li>Surface : {model.surface_m2} m²</li>
            {model.type === 'container' && (
              <>
                <li>{model.bedrooms} chambre(s)</li>
                <li>{model.container_20ft_count} × 20’ • {model.container_40ft_count} × 40’</li>
              </>
            )}
            {model.type === 'pool' && (
              <>
                <li>Forme : {model.pool_shape}</li>
                <li>Débordement : {model.has_overflow ? 'Oui' : 'Non'}</li>
              </>
            )}
          </ul>
        </div>

        {/* OPTIONS */}
        <div className="space-y-6">
          {Object.entries(groupedOptions).map(([category, opts]) => {
            const isOpen = expandedCategories.includes(category);
            return (
              <div key={category} className="border rounded bg-white">
                <button
                  className="w-full flex justify-between items-center px-4 py-3 font-semibold border-b hover:bg-gray-50"
                  onClick={() => toggleCategory(category)}
                >
                  <span>{category}</span>
                  {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {isOpen && (
                  <div className="divide-y">
                    {opts.map(opt => (
                      <label
                        key={opt.id}
                        className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <div>
                          <p className="font-medium">{opt.name}</p>
                          <p className="text-sm text-gray-500">
                            Rs {Number(opt.price).toLocaleString()}
                          </p>
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
