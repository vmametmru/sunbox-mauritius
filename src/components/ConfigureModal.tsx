import React, { useEffect, useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ZoomIn, Check, User, Mail, Phone, MapPin, MessageSquare, Loader2, ArrowLeft, ArrowRight, CheckCircle, Ruler } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuote, ModelOption } from '@/contexts/QuoteContext';
import { api } from '@/lib/api';
import { useSiteSettings, calculateTTC } from '@/hooks/use-site-settings';
import { useToast } from '@/hooks/use-toast';
import { evaluatePoolVariables, evaluateFormula, type PoolDimensions, type PoolVariable } from '@/lib/pool-formulas';

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
  image_url?: string | null;
}

/** Full BOQ line with formulas for dynamic calculation */
interface BOQFullLine {
  id: number;
  description: string;
  quantity: number;
  quantity_formula: string | null;
  unit: string;
  unit_cost_ht: number;
  unit_cost_formula: string | null;
  price_list_id: number | null;
  price_list_unit_price: number | null;
  margin_percent: number;
  display_order: number;
}

/** Full BOQ category with lines */
interface BOQFullCategory {
  id: number;
  name: string;
  is_option: boolean;
  display_order: number;
  parent_id: number | null;
  lines: BOQFullLine[];
}

// Constants for BOQ options handling
const BOQ_OPTION_ID_OFFSET = 1000000;
const BOQ_OPTIONS_CATEGORY_ID = -1;

interface ConfigureModalProps {
  open: boolean;
  onClose: () => void;
}

const ConfigureModal: React.FC<ConfigureModalProps> = ({ open, onClose }) => {
  const { quoteData, toggleOption, setCustomerDetails, resetQuote } = useQuote();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [options, setOptions] = useState<ModelOption[]>([]);
  const [boqOptions, setBOQOptions] = useState<ModelOption[]>([]);
  const [baseCategories, setBaseCategories] = useState<BOQBaseCategory[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  
  // Pool dimensions state (for pool models)
  const [poolDimensions, setPoolDimensions] = useState<PoolDimensions>({
    longueur: 8,
    largeur: 4,
    profondeur: 1.5,
  });
  const [poolVariables, setPoolVariables] = useState<PoolVariable[]>([]);
  const [boqFullCategories, setBOQFullCategories] = useState<BOQFullCategory[]>([]);
  
  // Multi-step state
  const [step, setStep] = useState<'options' | 'details' | 'confirmation'>('options');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedQuote, setSubmittedQuote] = useState<{ id: number; reference_number: string } | null>(null);
  
  // Client info reuse state
  const [savedClientInfo, setSavedClientInfo] = useState<{
    name: string;
    email: string;
    phone: string;
    address: string;
  } | null>(null);
  const [useLastClientInfo, setUseLastClientInfo] = useState(false);
  
  const { toast } = useToast();
  const { data: siteSettings } = useSiteSettings();
  const vatRate = Number(siteSettings?.vat_rate) || 15;

  const model = quoteData.model;
  const isPoolModel = model?.type === 'pool';

  // Compute pool variable context (surface_m2, volume_m3, etc.) from dimensions
  const poolVarContext = useMemo(() => {
    if (!isPoolModel || poolVariables.length === 0) return {};
    return evaluatePoolVariables(poolDimensions, poolVariables);
  }, [isPoolModel, poolDimensions, poolVariables]);

  // Calculate dynamic base price for pool models from BOQ formulas
  const poolBasePrice = useMemo(() => {
    if (!isPoolModel || boqFullCategories.length === 0) return 0;
    
    // Sum up sale prices for all non-option categories (base categories)
    const baseCategories = boqFullCategories.filter(c => !c.is_option);
    let totalSaleHT = 0;
    
    for (const cat of baseCategories) {
      for (const line of cat.lines) {
        const qty = line.quantity_formula
          ? evaluateFormula(line.quantity_formula, poolVarContext)
          : line.quantity;
        const unitCost = line.unit_cost_formula
          ? evaluateFormula(line.unit_cost_formula, poolVarContext)
          : (line.price_list_id && line.price_list_unit_price
            ? Number(line.price_list_unit_price)
            : line.unit_cost_ht);
        const lineCost = qty * unitCost;
        totalSaleHT += lineCost * (1 + line.margin_percent / 100);
      }
    }
    
    return totalSaleHT;
  }, [isPoolModel, boqFullCategories, poolVarContext]);

  // Calculate dynamic option prices for pool BOQ options
  const poolOptionPrices = useMemo(() => {
    if (!isPoolModel || boqFullCategories.length === 0) return {};
    
    const optionCategories = boqFullCategories.filter(c => c.is_option);
    const prices: Record<number, number> = {};
    
    for (const cat of optionCategories) {
      let totalSaleHT = 0;
      for (const line of cat.lines) {
        const qty = line.quantity_formula
          ? evaluateFormula(line.quantity_formula, poolVarContext)
          : line.quantity;
        const unitCost = line.unit_cost_formula
          ? evaluateFormula(line.unit_cost_formula, poolVarContext)
          : (line.price_list_id && line.price_list_unit_price
            ? Number(line.price_list_unit_price)
            : line.unit_cost_ht);
        const lineCost = qty * unitCost;
        totalSaleHT += lineCost * (1 + line.margin_percent / 100);
      }
      prices[cat.id] = totalSaleHT;
    }
    
    return prices;
  }, [isPoolModel, boqFullCategories, poolVarContext]);
  
  // Generate or retrieve device ID for client info reuse
  const getDeviceId = () => {
    let deviceId = localStorage.getItem('sunbox_device_id');
    if (!deviceId) {
      // Use crypto.randomUUID if available, otherwise fallback to secure random
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        deviceId = 'device_' + crypto.randomUUID();
      } else {
        // Fallback using crypto.getRandomValues for older browsers
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        deviceId = 'device_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      }
      localStorage.setItem('sunbox_device_id', deviceId);
    }
    return deviceId;
  };
  
  // Load saved client info from API
  const loadSavedClientInfo = async () => {
    try {
      const deviceId = getDeviceId();
      const result = await api.getContactByDevice(deviceId);
      if (result && result.name) {
        setSavedClientInfo({
          name: result.name,
          email: result.email,
          phone: result.phone || '',
          address: result.address || '',
        });
      } else {
        setSavedClientInfo(null);
      }
    } catch (err) {
      console.error('Error loading saved client info:', err);
      setSavedClientInfo(null);
    }
  };

  useEffect(() => {
    if (open && model?.id) {
      loadOptions();
      loadBOQOptions();
      loadBaseCategories();
      loadSavedClientInfo();
      // Load pool-specific data for pool models
      if (model.type === 'pool') {
        loadPoolData(model.id);
      }
      // Reset to first step when opening
      setStep('options');
      setErrors({});
      setSubmittedQuote(null);
      setUseLastClientInfo(false);
    }
  }, [open, model?.id]);
  
  // Handle checkbox to use saved client info
  useEffect(() => {
    if (useLastClientInfo && savedClientInfo) {
      setCustomerDetails({
        customerName: savedClientInfo.name,
        customerEmail: savedClientInfo.email,
        customerPhone: savedClientInfo.phone,
        customerAddress: savedClientInfo.address,
      });
    }
  }, [useLastClientInfo, savedClientInfo]);

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!quoteData.customerName.trim()) {
      newErrors.name = 'Le nom est requis';
    }
    
    if (!quoteData.customerEmail.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(quoteData.customerEmail)) {
      newErrors.email = 'Veuillez entrer un email valide';
    }
    
    if (!quoteData.customerPhone.trim()) {
      newErrors.phone = 'Le téléphone est requis';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Map API errors to user-friendly messages
  const getErrorMessage = (error: any): string => {
    const errorMessage = error?.message || '';
    
    // Map common API errors to French messages
    if (errorMessage.includes('SQLSTATE') || errorMessage.includes('Database')) {
      return 'Une erreur technique s\'est produite. Veuillez réessayer plus tard.';
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Problème de connexion. Veuillez vérifier votre connexion internet.';
    }
    if (errorMessage.includes('timeout')) {
      return 'Le serveur met trop de temps à répondre. Veuillez réessayer.';
    }
    
    return 'Échec de la soumission du devis. Veuillez réessayer.';
  };

  // Submit quote
  const handleSubmit = async () => {
    if (!validateForm() || !model) return;
    
    setIsSubmitting(true);
    
    try {
      const optionsTotal = calculateOptionsTotalTTC();
      const totalPrice = calculateTotalTTC();
      const deviceId = getDeviceId();
      
      const result = await api.createQuote({
        model_id: model.id,
        model_name: model.name,
        model_type: model.type,
        base_price: Math.round(getEffectiveBasePrice()),
        options_total: optionsTotal,
        total_price: totalPrice,
        customer_name: quoteData.customerName,
        customer_email: quoteData.customerEmail,
        customer_phone: quoteData.customerPhone,
        customer_address: quoteData.customerAddress || '',
        customer_message: quoteData.customerMessage || '',
        device_id: deviceId,
        selected_options: quoteData.selectedOptions.map(opt => ({
          option_id: opt.id,
          option_name: opt.name,
          option_price: Math.round(getOptionDisplayPrice(opt)),
        })),
        // Include pool dimensions in quote if pool model
        ...(isPoolModel ? {
          pool_longueur: poolDimensions.longueur,
          pool_largeur: poolDimensions.largeur,
          pool_profondeur: poolDimensions.profondeur,
        } : {}),
      });
      
      setSubmittedQuote(result);
      setStep('confirmation');
      toast({ title: 'Succès', description: 'Votre devis a été créé avec succès!' });
    } catch (err: any) {
      console.error('Quote submission error:', err);
      const userMessage = getErrorMessage(err);
      setErrors({ submit: userMessage });
      toast({ title: 'Erreur', description: userMessage, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close and reset
  const handleClose = () => {
    if (step === 'confirmation') {
      resetQuote();
    }
    onClose();
  };

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
            category_name: o.name, // Use BOQ option name as category name for proper grouping
            category_image_url: o.image_url || null, // Include category image URL
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

  // Load pool-specific data (variables + full BOQ with formulas)
  const loadPoolData = async (modelId: number) => {
    try {
      const [variables, fullCategories] = await Promise.all([
        api.getPoolBOQVariables(),
        api.getPoolBOQFull(modelId),
      ]);
      setPoolVariables(variables);
      setBOQFullCategories(fullCategories);
    } catch (err) {
      console.error('Error loading pool data:', err);
    }
  };

  // Get the effective base price: for pool models use calculated price, otherwise use model base_price
  const getEffectiveBasePrice = () => {
    if (isPoolModel && boqFullCategories.length > 0) {
      return calculateTTC(poolBasePrice, vatRate);
    }
    return Number(model?.base_price ?? 0);
  };

  // For pool models, BOQ options have dynamic prices based on dimensions
  const getPoolOptionPrice = (optionId: number): number => {
    // optionId is offset by BOQ_OPTION_ID_OFFSET
    const realId = optionId - BOQ_OPTION_ID_OFFSET;
    return poolOptionPrices[realId] ?? 0;
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
    return quoteData.selectedOptions.reduce((sum, opt) => {
      // For pool BOQ options, use the dynamically calculated price based on dimensions
      if (isPoolModel && opt.id >= BOQ_OPTION_ID_OFFSET) {
        const dynamicPrice = getPoolOptionPrice(opt.id);
        return sum + calculateTTC(dynamicPrice, vatRate);
      }
      return sum + calculateTTC(Number(opt.price || 0), vatRate);
    }, 0);
  };

  const calculateTotalTTC = () => {
    const base = getEffectiveBasePrice();
    return base + calculateOptionsTotalTTC();
  };

  // Get the display price for an option (dynamic for pool models)
  const getOptionDisplayPrice = (opt: ModelOption) => {
    if (isPoolModel && opt.id >= BOQ_OPTION_ID_OFFSET) {
      const dynamicPrice = getPoolOptionPrice(opt.id);
      return calculateTTC(dynamicPrice, vatRate);
    }
    return calculateTTC(opt.price, vatRate);
  };

  if (!model) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-4xl h-[90vh] overflow-y-auto">
        {/* Accessibility: Hidden title and description for screen readers */}
        <VisuallyHidden>
          <DialogTitle>Configuration du modèle {model?.name}</DialogTitle>
          <DialogDescription>Configurez les options et vos coordonnées pour demander un devis</DialogDescription>
        </VisuallyHidden>

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

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 py-2">
            <div className={`flex items-center gap-2 ${step === 'options' ? 'text-orange-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === 'options' ? 'bg-orange-600 text-white' : 
                step === 'details' || step === 'confirmation' ? 'bg-green-500 text-white' : 'bg-gray-200'
              }`}>
                {step === 'details' || step === 'confirmation' ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className="text-sm font-medium hidden sm:inline">Options</span>
            </div>
            <div className={`w-8 h-0.5 ${step === 'details' || step === 'confirmation' ? 'bg-green-500' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center gap-2 ${step === 'details' ? 'text-orange-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === 'details' ? 'bg-orange-600 text-white' : 
                step === 'confirmation' ? 'bg-green-500 text-white' : 'bg-gray-200'
              }`}>
                {step === 'confirmation' ? <Check className="w-4 h-4" /> : '2'}
              </div>
              <span className="text-sm font-medium hidden sm:inline">Coordonnées</span>
            </div>
            <div className={`w-8 h-0.5 ${step === 'confirmation' ? 'bg-green-500' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center gap-2 ${step === 'confirmation' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === 'confirmation' ? 'bg-green-500 text-white' : 'bg-gray-200'
              }`}>
                {step === 'confirmation' ? <Check className="w-4 h-4" /> : '3'}
              </div>
              <span className="text-sm font-medium hidden sm:inline">Confirmation</span>
            </div>
          </div>

          {/* STEP 1: OPTIONS SELECTION */}
          {step === 'options' && (
            <>
              {/* Images */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <img
                    src={model.image_url}
                    alt="Photo principale"
                    className="h-[100px] object-contain rounded shadow cursor-pointer"
                    onClick={() => setLightbox(model.image_url)}
                  />
                  <ZoomIn className="absolute top-2 right-2 w-5 h-5 text-white bg-black/60 p-1 rounded-full" />
                </div>
                {model.plan_url && (
                  <div className="relative">
                    <img
                      src={model.plan_url}
                      alt="Plan"
                      className="h-[100px] object-contain rounded shadow cursor-pointer"
                      onClick={() => setLightbox(model.plan_url!)}
                    />
                    <ZoomIn className="absolute top-2 right-2 w-5 h-5 text-white bg-black/60 p-1 rounded-full" />
                  </div>
                )}
              </div>

              {/* POOL DIMENSIONS INPUT */}
              {isPoolModel && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                  <h3 className="text-base font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    Dimensions de votre piscine
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1">Longueur (m)</label>
                      <Input
                        type="number"
                        step="0.5"
                        min="2"
                        max="20"
                        value={poolDimensions.longueur}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (v > 0) setPoolDimensions(prev => ({ ...prev, longueur: v }));
                        }}
                        className="h-9 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1">Largeur (m)</label>
                      <Input
                        type="number"
                        step="0.5"
                        min="1"
                        max="15"
                        value={poolDimensions.largeur}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (v > 0) setPoolDimensions(prev => ({ ...prev, largeur: v }));
                        }}
                        className="h-9 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1">Profondeur (m)</label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="3"
                        value={poolDimensions.profondeur}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (v > 0) setPoolDimensions(prev => ({ ...prev, profondeur: v }));
                        }}
                        className="h-9 text-sm bg-white"
                      />
                    </div>
                  </div>
                  {(() => {
                    const surface = poolDimensions.longueur * poolDimensions.largeur;
                    return (
                      <p className="text-xs text-blue-600 mt-2">
                        Surface : {surface.toFixed(1)} m² • 
                        Volume : {(surface * poolDimensions.profondeur).toFixed(1)} m³
                      </p>
                    );
                  })()}
                </div>
              )}

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
                    Rs {Math.round(getEffectiveBasePrice()).toLocaleString()}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">Total options TTC</p>
                  <p className="text-sm font-medium text-gray-700">
                    Rs {Math.round(calculateOptionsTotalTTC()).toLocaleString()}
                  </p>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-500">Total général TTC</p>
                  <p className="text-xl font-bold text-gray-800">
                    Rs {Math.round(calculateTotalTTC()).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* OPTIONS DISPONIBLES label */}
              {Object.keys(groupedOptions).length > 0 && (
                <h3 className="text-lg font-semibold text-gray-800">OPTIONS DISPONIBLES :</h3>
              )}

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
                                    Rs {Math.round(getOptionDisplayPrice(opt)).toLocaleString()}
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

              {/* Next Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button 
                  onClick={() => setStep('details')}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Continuer
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          )}

          {/* STEP 2: CUSTOMER DETAILS */}
          {step === 'details' && (
            <>
              <div className="bg-white rounded-lg p-6 border">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Vos coordonnées
                </h3>
                <p className="text-gray-600 mb-6">
                  Veuillez remplir vos informations pour recevoir votre devis.
                </p>

                {/* Checkbox to use saved client info - always show this section */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  {savedClientInfo ? (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useLastClientInfo}
                        onChange={(e) => setUseLastClientInfo(e.target.checked)}
                        className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                      />
                      <div>
                        <span className="font-medium text-blue-800">Utiliser mes informations précédentes</span>
                        <p className="text-sm text-blue-600 mt-0.5">
                          {savedClientInfo.name} • {savedClientInfo.email}
                        </p>
                      </div>
                    </label>
                  ) : (
                    <div className="text-blue-700 text-sm">
                      <span className="font-medium" aria-label="Astuce">💡 Astuce :</span> Lors de votre prochaine demande de devis, vos informations seront pré-remplies automatiquement.
                    </div>
                  )}
                </div>

                {errors.submit && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {errors.submit}
                  </div>
                )}

                <div className="space-y-5">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom complet <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={quoteData.customerName}
                        onChange={(e) => setCustomerDetails({ customerName: e.target.value })}
                        className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          errors.name ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Jean Dupont"
                      />
                    </div>
                    {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={quoteData.customerEmail}
                        onChange={(e) => setCustomerDetails({ customerEmail: e.target.value })}
                        className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          errors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="jean@exemple.com"
                      />
                    </div>
                    {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Numéro de téléphone <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={quoteData.customerPhone}
                        onChange={(e) => setCustomerDetails({ customerPhone: e.target.value })}
                        className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          errors.phone ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="+230 5XXX XXXX"
                      />
                    </div>
                    {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse du projet
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={quoteData.customerAddress || ''}
                        onChange={(e) => setCustomerDetails({ customerAddress: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Grand Baie, Maurice"
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message / Notes supplémentaires
                    </label>
                    <div className="relative">
                      <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                      <textarea
                        value={quoteData.customerMessage || ''}
                        onChange={(e) => setCustomerDetails({ customerMessage: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        rows={4}
                        placeholder="Décrivez votre projet, vos délais ou toute autre information..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-gray-900 mb-3">Récapitulatif</h4>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Modèle</span>
                  <span className="font-medium">{model.name}</span>
                </div>
                {isPoolModel && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Dimensions</span>
                    <span className="font-medium">{poolDimensions.longueur}m × {poolDimensions.largeur}m × {poolDimensions.profondeur}m</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Prix de base TTC</span>
                  <span className="font-medium">Rs {Math.round(getEffectiveBasePrice()).toLocaleString()}</span>
                </div>
                {quoteData.selectedOptions.length > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Options ({quoteData.selectedOptions.length})</span>
                    <span className="font-medium">Rs {Math.round(calculateOptionsTotalTTC()).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="font-semibold">Total TTC</span>
                  <span className="text-xl font-bold text-orange-600">Rs {Math.round(calculateTotalTTC()).toLocaleString()}</span>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4 border-t">
                <Button 
                  variant="outline"
                  onClick={() => setStep('options')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      Demander le devis
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* STEP 3: CONFIRMATION */}
          {step === 'confirmation' && submittedQuote && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Devis envoyé avec succès!
              </h3>
              <p className="text-gray-600 mb-6">
                Votre demande de devis a été enregistrée. Notre équipe vous contactera dans les plus brefs délais.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-6 text-left max-w-md mx-auto mb-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Référence</span>
                    <span className="font-mono font-bold text-blue-600">{submittedQuote.reference_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Modèle</span>
                    <span className="font-medium">{model.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total TTC</span>
                    <span className="font-bold text-orange-600">Rs {Math.round(calculateTotalTTC()).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleClose}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Fermer
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfigureModal;
