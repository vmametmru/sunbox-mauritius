import React, { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useQuote, ModelOption } from '@/contexts/QuoteContext';
import { api } from '@/lib/api';
import { useSiteSettings, calculateTTC } from '@/hooks/use-site-settings';

interface ConfigureModalProps {
  open: boolean;
  onClose: () => void;
}

const ConfigureModal: React.FC<ConfigureModalProps> = ({ open, onClose }) => {
  const { quoteData, toggleOption, calculateTotal } = useQuote();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [options, setOptions] = useState<ModelOption[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  
  const { data: siteSettings } = useSiteSettings();
  const vatRate = Number(siteSettings?.vat_rate) || 15;

  const model = quoteData.model;

  useEffect(() => {
    const loadOptions = async () => {
      if (!open || !model?.id) return;
      try {
        // Load options from BOQ categories marked as is_option=true
        const data = await api.getBOQOptions(model.id);
        const mapped: ModelOption[] = data.map((o: Record<string, unknown>) => ({
          id: Number(o.id),
          model_id: model.id,
          category_id: Number(o.id), // BOQ category id
          category_name: String(o.name), // BOQ category name
          name: String(o.name),
          description: '',
          // Calculate TTC from HT price
          price: calculateTTC(Number(o.price_ht || 0), vatRate),
          is_active: true,
        }));
        setOptions(mapped);
      } catch (err) {
        console.error(err);
      }
    };
    loadOptions();
  }, [open, model?.id, vatRate]);

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

          {/* Total */}
          <div className="bg-gray-50 rounded-lg p-4 flex justify-between items-center">
            <p className="text-sm text-gray-500">Total estimé TTC</p>
            <p className="text-xl font-bold text-gray-800">
              Rs {calculateTotal().toLocaleString()}
            </p>
          </div>

          {/* Options */}
          {Object.entries(groupedOptions).map(([category, opts]) => {
            const isOpen = expandedCategories.includes(category);
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
                    {opts.map(opt => (
                      <label
                        key={opt.id}
                        className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <div>
                          <p className="font-medium">{opt.name}</p>
                          <p className="text-sm text-gray-500">
                            Rs {opt.price.toLocaleString()}
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
      </DialogContent>
    </Dialog>
  );
};

export default ConfigureModal;
