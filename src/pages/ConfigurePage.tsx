import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Home, Waves, ChevronDown, ChevronUp, X, ZoomIn, Image, FileText } from 'lucide-react';
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

  if (!quoteData.model) {
    return null;
  }

  const model = quoteData.model;
  const options = getModelOptions(model);
  const { data: siteSettings } = useSiteSettings();
const underConstruction = siteSettings?.site_under_construction === "true";
const ucMessage =
  siteSettings?.under_construction_message ||
  "🚧 Page en construction — merci de revenir ultérieurement.";
  
  // Group options by category
  const groupedOptions = options.reduce((acc, option) => {
    if (!acc[option.category]) {
      acc[option.category] = [];
    }
    acc[option.category].push(option);
    return acc;
  }, {} as Record<string, ModelOption[]>);

  const categories = Object.keys(groupedOptions);

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
      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          >
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

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-[#1A365D] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Models</span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#ED8936] to-[#DD6B20] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-[#1A365D]">Sunbox</span>
            </div>

            <div className="text-right">
              <p className="text-xs text-gray-500">Estimated Total</p>
              <p className="text-xl font-bold text-[#1A365D]">€{calculateTotal().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </header>

      {underConstruction && <ConstructionBanner message={ucMessage} />}

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-900 hidden sm:inline">Select Model</span>
            </div>
            <div className="w-8 sm:w-12 h-0.5 bg-[#ED8936]"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#ED8936] text-white rounded-full flex items-center justify-center font-semibold">
                2
              </div>
              <span className="text-sm font-medium text-gray-900 hidden sm:inline">Configure Options</span>
            </div>
            <div className="w-8 sm:w-12 h-0.5 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold">
                3
              </div>
              <span className="text-sm font-medium text-gray-400 hidden sm:inline">Your Details</span>
            </div>
            <div className="w-8 sm:w-12 h-0.5 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold">
                4
              </div>
              <span className="text-sm font-medium text-gray-400 hidden sm:inline">View Quote</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Options Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-[#1A365D] mb-2">
                Customize Your {model.name}
              </h2>
              <p className="text-gray-600 mb-6">
                Select the options and upgrades you'd like to include in your quote.
              </p>

              {/* Option Categories */}
              <div className="space-y-4">
                {categories.map((category) => (
                  <div key={category} className="border rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-[#1A365D]">{category}</span>
                        <span className="text-sm text-gray-500">
                          ({groupedOptions[category].length} options)
                        </span>
                        {quoteData.selectedOptions.filter(o => 
                          groupedOptions[category].some(go => go.id === o.id)
                        ).length > 0 && (
                          <span className="bg-[#ED8936] text-white text-xs px-2 py-0.5 rounded-full">
                            {quoteData.selectedOptions.filter(o => 
                              groupedOptions[category].some(go => go.id === o.id)
                            ).length} selected
                          </span>
                        )}
                      </div>
                      {expandedCategories.includes(category) ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                    
                    {expandedCategories.includes(category) && (
                      <div className="p-4 grid gap-3">
                        {groupedOptions[category].map((option) => (
                          <button
                            key={option.id}
                            onClick={() => toggleOption(option)}
                            className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all text-left ${
                              isOptionSelected(option.id)
                                ? 'border-[#ED8936] bg-orange-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isOptionSelected(option.id)
                                  ? 'border-[#ED8936] bg-[#ED8936]'
                                  : 'border-gray-300'
                              }`}>
                                {isOptionSelected(option.id) && (
                                  <Check className="w-4 h-4 text-white" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{option.name}</p>
                                {option.description && (
                                  <p className="text-sm text-gray-500">{option.description}</p>
                                )}
                              </div>
                            </div>
                            <span className={`font-semibold flex-shrink-0 ml-2 ${
                              option.price >= 0 ? 'text-[#1A365D]' : 'text-green-600'
                            }`}>
                              {option.price >= 0 ? '+' : ''}€{option.price.toLocaleString()}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
              {/* Model Images - Photo & Floor Plan */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Model Views
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {/* Photo */}
                  <div 
                    className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-gray-200 hover:border-[#ED8936] transition-colors"
                    onClick={() => openLightbox(model.image, `${model.name} - Photo`)}
                  >
                    <img 
                      src={model.image} 
                      alt={model.name}
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <span className="text-white text-xs font-medium flex items-center gap-1">
                        <Image className="w-3 h-3" />
                        Photo
                      </span>
                    </div>
                  </div>
                  
                  {/* Floor Plan */}
                  <div 
                    className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-gray-200 hover:border-[#ED8936] transition-colors"
                    onClick={() => openLightbox(model.floorPlan, `${model.name} - Floor Plan`)}
                  >
                    <img 
                      src={model.floorPlan} 
                      alt={`${model.name} floor plan`}
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <span className="text-white text-xs font-medium flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Floor Plan
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">Click to enlarge</p>
              </div>

              {/* Model Info */}
              <div className="flex items-start gap-4 pb-6 border-b border-t pt-6">
                <div>
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium mb-1 ${
                    model.category === 'container' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-cyan-100 text-cyan-800'
                  }`}>
                    {model.category === 'container' ? (
                      <Home className="w-3 h-3" />
                    ) : (
                      <Waves className="w-3 h-3" />
                    )}
                    {model.category === 'container' ? 'Container Home' : 'Swimming Pool'}
                  </div>
                  <h3 className="font-bold text-[#1A365D] text-lg">{model.name}</h3>
                  <p className="text-sm text-gray-500">
                    {model.specs.dimensions || model.specs.size}
                  </p>
                  {model.specs.sqm && (
                    <p className="text-sm text-gray-500">{model.specs.sqm} m²</p>
                  )}
                  {model.specs.bedrooms !== undefined && (
                    <p className="text-sm text-gray-500">
                      {model.specs.bedrooms} Bed • {model.specs.bathrooms} Bath
                    </p>
                  )}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="py-6 border-b">
                <h4 className="font-semibold text-gray-900 mb-4">Price Breakdown</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Base Price ({model.name})</span>
                    <span className="font-medium">€{model.basePrice.toLocaleString()}</span>
                  </div>
                  
                  {quoteData.selectedOptions.length > 0 && (
                    <>
                      <div className="border-t pt-3 mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Selected Options:</p>
                        {quoteData.selectedOptions.map((option) => (
                          <div key={option.id} className="flex justify-between text-sm py-1">
                            <span className="text-gray-600 truncate mr-2">{option.name}</span>
                            <span className={option.price >= 0 ? '' : 'text-green-600'}>
                              {option.price >= 0 ? '+' : ''}€{option.price.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="text-gray-600">Options Subtotal</span>
                        <span className={`font-medium ${optionsTotal >= 0 ? '' : 'text-green-600'}`}>
                          {optionsTotal >= 0 ? '+' : ''}€{optionsTotal.toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="py-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Estimated Total</span>
                  <span className="text-2xl font-bold text-[#1A365D]">
                    €{calculateTotal().toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  *Final price may vary based on site conditions and specifications
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/details')}
                  className="w-full bg-[#ED8936] hover:bg-[#DD6B20] text-white py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  Continue to Details
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-medium transition-colors"
                >
                  Change Model
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurePage;
