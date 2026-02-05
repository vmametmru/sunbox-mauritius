import React, { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown, ZoomIn, Check } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useQuote, ModelOption } from '@/contexts/QuoteContext';
import { api } from '@/lib/api';
import { useSiteSettings, calculateTTC } from '@/hooks/use-site-settings';

interface BOQLine {
  id: number;
  description: string;
}

interface BOQBaseCategory {
  id: number;
  name: string;
  display_order: number;
  lines: BOQLine[];
}

interface BOQOption {
  id: number;
  name: string;
  display_order: number;
  price_ht: string;
}

// Constants for BOQ options handling
const BOQ_OPTION_ID_OFFSET = 1000000;
const BOQ_OPTIONS_CATEGORY_ID = -1;

interface ConfigureModalProps {
  open: boolean;
  onClose: () => void;
}

const ConfigureModal: React.FC<ConfigureModalProps> = ({ open, onClose }) => {
  const { quoteData, toggleOption } = useQuote();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [options, setOptions] = useState<ModelOption[]>([]);
  const [boqOptions, setBOQOptions] = useState<ModelOption[]>([]);
  const [baseCategories, setBaseCategories] = useState<BOQBaseCategory[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  
  const { data: siteSettings } = useSiteSettings();
  const vatRate = Number(siteSettings?.vat_rate) || 15;

  const model = quoteData.model;

  useEffect(() => {
    if (open && model?.id) {
      loadOptions();
      loadBOQOptions();
      loadBaseCategories();
    }
  }, [open, model?.id]);

  const loadOptions = async () => {
    try {
      const data = await api.getModelOptions(model!.id);
      const mapped: ModelOption[] = data.map((o: any) => ({
        id: Number(o.id),
        model_id: Number(o.model_id),
        category_id: Number(o.category_id),
        category_name: o.category_name,
        category_description: o.category_description || '',
        category_image_url: o.category_image_url || null,
        name: o.name,
        description: o.description,
        price: parseFloat(o.price), // 🔧 Corrigé ici
        is_active: Boolean(o.is_active),
      }));
      setOptions(mapped);
    } catch (err) {
      console.error(err);
    }
  };

  const loadBOQOptions = async () => {
    if (!model?.id) return;
    try {
      const data = await api.getBOQOptions(model.id);
      // Map BOQ options to ModelOption format with offset ID to avoid conflicts
      // Also fetch lines for each option category to build the description
      const mapped: ModelOption[] = await Promise.all(
        data.map(async (o: BOQOption) => {
          // Fetch lines for this option category
          let description = '';
          try {
            const lines = await api.getBOQCategoryLines(o.id);
            if (lines && lines.length > 0) {
              description = lines.map((line: BOQLine) => `• ${line.description}`).join('\n');
            }
          } catch (e) {
            console.error('Error loading BOQ lines for option', o.id, e);
          }
          return {
            id: Number(o.id) + BOQ_OPTION_ID_OFFSET,
            model_id: model.id,
            category_id: BOQ_OPTIONS_CATEGORY_ID,
            category_name: 'Options BOQ',
            name: o.name,
            description,
            price: parseFloat(o.price_ht),
            is_active: true,
          };
        })
      );
      setBOQOptions(mapped);
    } catch (err) {
      console.error(err);
    }
  };

  const loadBaseCategories = async () => {
    try {
      const data = await api.getBOQBaseCategories(model!.id);
      setBaseCategories(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Combine regular options and BOQ options
  const allOptions = [...options, ...boqOptions];

  const groupedOptions = allOptions
    .filter(opt => opt.is_active)
    .reduce((acc, opt) => {
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

  // Local TTC calculations
  const calculateOptionsTotalTTC = () => {
    return quoteData.selectedOptions.reduce((sum, opt) => sum + calculateTTC(Number(opt.price || 0), vatRate), 0);
  };

  const calculateTotalTTC = () => {
    const base = Number(model?.base_price ?? 0);
    return base + calculateOptionsTotalTTC();
  };

  if (!model) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl h-[90vh] overflow-y-auto">
        {/* Lightbox */}
        {lightbox && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
            <img src={lightbox} alt="Zoom" className="max-h-[90vh] object-contain rounded shadow" />
          </div>
        )}

        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-4">
            <div>
              <h2 className="text-2xl font-bold">{model.name}</h2>
              <p className="text-gray-600">{model.description}</p>
            </div>
          </div>

          {/* Images */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <img
                src={model.image_url}
                alt="Photo principale"
                className="w-full h-64 md:h-80 object-cover rounded shadow cursor-pointer"
                onClick={() => setLightbox(model.image_url)}
              />
              <ZoomIn className="absolute top-2 right-2 w-5 h-5 text-white bg-black/60 p-1 rounded-full" />
            </div>
            {model.plan_url && (
              <div className="relative">
                <img
                  src={model.plan_url}
                  alt="Plan"
                  className="w-full h-64 md:h-80 object-cover rounded shadow cursor-pointer"
                  onClick={() => setLightbox(model.plan_url!)}
                />
                <ZoomIn className="absolute top-2 right-2 w-5 h-5 text-white bg-black/60 p-1 rounded-full" />
              </div>
            )}
          </div>

          {/* INCLUS DANS LE PRIX DE BASE */}
          {baseCategories.length > 0 && (
            <div className="bg-green-50 border border-green-200 p-4 rounded">
              <h3 className="text-base font-semibold text-green-800 mb-3 flex items-center gap-2">
                <Check className="w-4 h-4" />
                Inclus dans le prix de base
              </h3>
              <div className="columns-1 md:columns-2 gap-4">
                {baseCategories.map(cat => (
                  <div key={cat.id} className="inline-block w-full mb-2 break-inside-avoid">
                    <span className="font-medium text-green-700 text-sm">{cat.name}</span>
                    {cat.lines.length > 0 && (
                      <>
                        <span className="text-gray-600 text-xs">: </span>
                        <span className="text-xs text-gray-600">
                          {cat.lines.map((line, idx) => (
                            <React.Fragment key={line.id}>
                              {line.description}
                              {idx < cat.lines.length - 1 && ', '}
                            </React.Fragment>
                          ))}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Prix de base TTC</p>
              <p className="text-sm font-medium text-gray-700">
                Rs {Number(model.base_price ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Total options TTC</p>
              <p className="text-sm font-medium text-gray-700">
                Rs {calculateOptionsTotalTTC().toLocaleString()}
              </p>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-500">Total général TTC</p>
              <p className="text-xl font-bold text-gray-800">
                Rs {calculateTotalTTC().toLocaleString()}
              </p>
            </div>
          </div>

          {/* Options */}
          {Object.entries(groupedOptions).map(([category, opts]) => {
            const isOpen = expandedCategories.includes(category);
            const categoryDescription = opts[0]?.category_description;
            const categoryImageUrl = opts[0]?.category_image_url;
            return (
              <div key={category} className="border rounded bg-white">
                <button
                  className="w-full flex justify-between items-center px-4 py-3 font-semibold border-b hover:bg-gray-50"
                  onClick={() => toggleCategory(category)}
                >
                  <span>{category}</span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
                {isOpen && (
                  <div className="divide-y">
                    {categoryDescription && (
                      <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600 whitespace-pre-line">
                        {categoryDescription}
                      </div>
                    )}
                    <div className="flex">
                      {/* Category Image */}
                      {categoryImageUrl && (
                        <div className="flex-shrink-0 p-4 border-r">
                          <img 
                            src={categoryImageUrl} 
                            alt={category}
                            className="w-[100px] h-[100px] object-cover rounded"
                          />
                        </div>
                      )}
                      {/* Options List */}
                      <div className="flex-1 divide-y">
                        {opts.map(opt => (
                          <label
                            key={opt.id}
                            className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
                          >
                            <div className="flex-1 mr-4">
                              <p className="font-medium">{opt.name}</p>
                              {opt.description && (
                                <p className="text-sm text-gray-500 whitespace-pre-line mt-1">
                                  {opt.description}
                                </p>
                              )}
                              <p className={`text-sm text-orange-600 font-medium ${opt.description ? 'mt-2' : 'mt-1'}`}>
                                Rs {calculateTTC(opt.price, vatRate).toLocaleString()}
                              </p>
                            </div>
                            <Switch
                              checked={isSelected(opt.id)}
                              onCheckedChange={() => toggleOption(opt)}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfigureModal;
