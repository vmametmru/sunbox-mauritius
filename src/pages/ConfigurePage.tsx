import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Home,
  Waves,
  ChevronDown,
  ChevronUp,
  X,
  ZoomIn,
  Image,
  FileText
} from 'lucide-react';
import { useQuote, ModelOption } from '@/contexts/QuoteContext';
import { getModelOptions } from '@/data/models';
import ConstructionBanner from "@/components/ConstructionBanner";
import { useSiteSettings } from "@/hooks/use-site-settings";

const ConfigurePage: React.FC = () => {
  const navigate = useNavigate();
  const { quoteData, toggleOption, calculateTotal } = useQuote();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>('');

  useEffect(() => {
    if (!quoteData.model) {
      navigate('/');
    }
  }, [quoteData.model, navigate]);

  if (!quoteData.model) return null;

  const model = quoteData.model;
  const options = getModelOptions(model);
  const { data: siteSettings } = useSiteSettings();
  const underConstruction = siteSettings?.site_under_construction === "true";
  const ucMessage =
    siteSettings?.under_construction_message ||
    "🚧 Page en construction — merci de revenir ultérieurement.";

  const groupedOptions = options.reduce((acc, option) => {
    if (!acc[option.category]) acc[option.category] = [];
    acc[option.category].push(option);
    return acc;
  }, {} as Record<string, ModelOption[]>);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const isOptionSelected = (optionId: string) => {
    return quoteData.selectedOptions.some(o => o.id === optionId);
  };

  const optionsTotal = quoteData.selectedOptions.reduce((sum, opt) => sum + opt.price, 0);

  const openLightbox = (imageUrl: string, title: string) => {
    setLightboxImage(imageUrl);
    setLightboxTitle(title);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
    setLightboxTitle('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {lightboxImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={closeLightbox}>
          <button onClick={closeLightbox} className="absolute top-4 right-4 text-white hover:text-gray-300 z-10">
            <X className="w-8 h-8" />
          </button>
          <div className="relative max-w-5xl max-h-[90vh] w-full">
            <p className="text-white text-center mb-4 text-lg font-medium">{lightboxTitle}</p>
            <img
              src={lightboxImage}
              alt={lightboxTitle}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-[#1A365D]"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Retour aux Modèles</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-[#1A365D]">Sunbox</span>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Total Estimé</p>
              <p className="text-xl font-bold text-[#1A365D]">Rs {calculateTotal().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </header>

      {underConstruction && <ConstructionBanner message={ucMessage} />}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Contenu ici - Ajoute les composants pour les options, images, etc. */}
        <p className="text-gray-700 text-center">Configuration en cours...</p>
      </div>
    </div>
  );
};

export default ConfigurePage;
