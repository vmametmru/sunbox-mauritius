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
  parent_id: number | null;
  lines: BOQLine[];
}

interface BOQOption {
  id: number;
  name: string;
  display_order: number;
  parent_id: number | null;
  qty_editable: boolean;
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
  qty_editable: boolean;
  display_order: number;
  parent_id: number | null;
  lines: BOQFullLine[];
}

// Constants for BOQ options handling
const BOQ_OPTION_ID_OFFSET = 1000000;
const BOQ_OPTIONS_CATEGORY_ID = -1;
const MIN_OPTION_QTY = 1;
const MAX_OPTION_QTY = 99;

interface ConfigureModalProps {
  open: boolean;
  onClose: () => void;
}

const ConfigureModal: React.FC<ConfigureModalProps> = ({ open, onClose }) => {
  const { quoteData, toggleOption, setCustomerDetails, resetQuote } = useQuote();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [expandedSubOptions, setExpandedSubOptions] = useState<number[]>([]);
  const [options, setOptions] = useState<ModelOption[]>([]);
  const [boqOptions, setBOQOptions] = useState<ModelOption[]>([]);
  const [baseCategories, setBaseCategories] = useState<BOQBaseCategory[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  
  // Option quantities for qty_editable options (keyed by option id)
  const [optionQuantities, setOptionQuantities] = useState<Record<number, number>>({});
  
  // Pool dimensions state (for pool models) — start empty so user must enter them
  const [poolDimensions, setPoolDimensions] = useState<PoolDimensions>({
    longueur: 0,
    largeur: 0,
    profondeur: 0,
  });
  const [poolVariables, setPoolVariables] = useState<PoolVariable[]>([]);
  const [boqFullCategories, setBOQFullCategories] = useState<BOQFullCategory[]>([]);
  const [isLoadingPoolData, setIsLoadingPoolData] = useState(false);
  
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
  const poolShape = model?.pool_shape || 'Rectangulaire';

  // All required dimensions must be filled before we show prices / options
  const poolDimensionsReady = isPoolModel && (() => {
    if (poolShape === 'L') {
      return (poolDimensions.longueur_la ?? 0) > 0
        && (poolDimensions.largeur_la ?? 0) > 0
        && (poolDimensions.profondeur_la ?? 0) > 0
        && (poolDimensions.longueur_lb ?? 0) > 0
        && (poolDimensions.largeur_lb ?? 0) > 0
        && (poolDimensions.profondeur_lb ?? 0) > 0;
    }
    if (poolShape === 'T') {
      return (poolDimensions.longueur_ta ?? 0) > 0
        && (poolDimensions.largeur_ta ?? 0) > 0
        && (poolDimensions.profondeur_ta ?? 0) > 0
        && (poolDimensions.longueur_tb ?? 0) > 0
        && (poolDimensions.largeur_tb ?? 0) > 0
        && (poolDimensions.profondeur_tb ?? 0) > 0;
    }
    return poolDimensions.longueur > 0
      && poolDimensions.largeur > 0
      && poolDimensions.profondeur > 0;
  })();

  // True while we have dimensions but BOQ data hasn't loaded yet
  const isCalculatingPrice = isPoolModel && poolDimensionsReady && isLoadingPoolData;

  // Compute pool variable context (surface_m2, volume_m3, etc.) from dimensions
  const poolVarContext = useMemo(() => {
    if (!isPoolModel) return {};
    return evaluatePoolVariables(poolDimensions, poolVariables);
  }, [isPoolModel, poolDimensions, poolVariables]);

  // Calculate dynamic base price for pool models from BOQ formulas
  const poolBasePrice = useMemo(() => {
    if (!isPoolModel || boqFullCategories.length === 0) return 0;
    
    // Sum up sale prices for all non-option categories (base categories)
    const baseCats = boqFullCategories.filter(c => !c.is_option);
    let totalSaleHT = 0;
    
    for (const cat of baseCats) {
      for (const line of cat.lines) {
        const qty = line.quantity_formula
          ? evaluateFormula(line.quantity_formula, poolVarContext)
          : Number(line.quantity);
        const unitCost = line.unit_cost_formula
          ? evaluateFormula(line.unit_cost_formula, poolVarContext)
          : (line.price_list_id && line.price_list_unit_price != null
            ? Number(line.price_list_unit_price)
            : Number(line.unit_cost_ht));
        const lineCost = qty * unitCost;
        totalSaleHT += lineCost * (1 + Number(line.margin_percent) / 100);
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
          : Number(line.quantity);
        const unitCost = line.unit_cost_formula
          ? evaluateFormula(line.unit_cost_formula, poolVarContext)
          : (line.price_list_id && line.price_list_unit_price != null
            ? Number(line.price_list_unit_price)
            : Number(line.unit_cost_ht));
        const lineCost = qty * unitCost;
        totalSaleHT += lineCost * (1 + Number(line.margin_percent) / 100);
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
        // Reset dimensions so the user must enter them
        setPoolDimensions({ longueur: 0, largeur: 0, profondeur: 0 });
      }
      // Reset to first step when opening
      setStep('options');
      setErrors({});
      setSubmittedQuote(null);
      setUseLastClientInfo(false);
      setOptionQuantities({});
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
          quantity: getOptionQty(opt.id),
        })),
        // Include pool dimensions in quote if pool model
        ...(isPoolModel ? {
          pool_longueur: poolDimensions.longueur,
          pool_largeur: poolDimensions.largeur,
          pool_profondeur: poolDimensions.profondeur,
          ...(poolShape === 'L' ? {
            pool_longueur_la: poolDimensions.longueur_la,
            pool_largeur_la: poolDimensions.largeur_la,
            pool_profondeur_la: poolDimensions.profondeur_la,
            pool_longueur_lb: poolDimensions.longueur_lb,
            pool_largeur_lb: poolDimensions.largeur_lb,
            pool_profondeur_lb: poolDimensions.profondeur_lb,
          } : {}),
          ...(poolShape === 'T' ? {
            pool_longueur_ta: poolDimensions.longueur_ta,
            pool_largeur_ta: poolDimensions.largeur_ta,
            pool_profondeur_ta: poolDimensions.profondeur_ta,
            pool_longueur_tb: poolDimensions.longueur_tb,
            pool_largeur_tb: poolDimensions.largeur_tb,
            pool_profondeur_tb: poolDimensions.profondeur_tb,
          } : {}),
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
      const data: BOQOption[] = await api.getBOQOptions(model.id);
      
      // Separate parent categories (no parent_id) and sub-categories
      const parentOptions = data.filter(o => !o.parent_id);
      const childOptions = data.filter(o => o.parent_id);
      
      // Build mapped options: sub-categories become selectable options, grouped under parent name
      const mapped: ModelOption[] = await Promise.all(
        childOptions.map(async (o: BOQOption) => {
          // Find parent category name
          const parent = parentOptions.find(p => p.id === o.parent_id);
          const parentName = parent ? parent.name : 'Options';
          
          // Fetch lines for this option sub-category
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
            category_name: parentName, // Group under parent category name
            category_image_url: o.image_url || null,
            name: o.name,
            description,
            price: parseFloat(o.price_ht),
            is_active: true,
            qty_editable: o.qty_editable || false,
          };
        })
      );
      
      // If there are parent options with no children (leaf categories), include them directly
      const parentIdsWithChildren = new Set(childOptions.map(c => c.parent_id).filter(Boolean));
      const leafParents = parentOptions.filter(p => !parentIdsWithChildren.has(p.id));
      
      const leafMapped: ModelOption[] = await Promise.all(
        leafParents.map(async (o: BOQOption) => {
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
            category_name: o.name,
            category_image_url: o.image_url || null,
            name: o.name,
            description,
            price: parseFloat(o.price_ht),
            is_active: true,
            qty_editable: o.qty_editable || false,
          };
        })
      );
      
      setBOQOptions([...mapped, ...leafMapped]);
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
    setIsLoadingPoolData(true);
    try {
      const [variables, fullCategories] = await Promise.all([
        api.getPoolBOQVariables(),
        api.getPoolBOQFull(modelId),
      ]);
      setPoolVariables(variables);
      setBOQFullCategories(fullCategories);
    } catch (err) {
      console.error('Error loading pool data:', err);
    } finally {
      setIsLoadingPoolData(false);
    }
  };

  // Get the effective base price: for pool models use calculated price, otherwise use model base_price
  const getEffectiveBasePrice = () => {
    if (isPoolModel && boqFullCategories.length > 0) {
      // Apply unforeseen cost percentage to the base HT price
      const unforeseen = Number(model?.unforeseen_cost_percent ?? 10);
      const basePriceHTWithUnforeseen = poolBasePrice * (1 + unforeseen / 100);
      return calculateTTC(basePriceHTWithUnforeseen, vatRate);
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
    .sort((a, b) => (a.category_name || '').localeCompare(b.category_name || '', 'fr') || a.name.localeCompare(b.name, 'fr'))
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

  const toggleSubOption = (optId: number) => {
    setExpandedSubOptions(prev =>
      prev.includes(optId) ? prev.filter(id => id !== optId) : [...prev, optId]
    );
  };

  const isSelected = (id: number) =>
    quoteData.selectedOptions.some(o => o.id === id);

  // Get the quantity multiplier for an option (1 if not qty_editable)
  const getOptionQty = (optId: number) => optionQuantities[optId] || 1;

  // Local TTC calculations
  const calculateOptionsTotalTTC = () => {
    return quoteData.selectedOptions.reduce((sum, opt) => {
      const qty = getOptionQty(opt.id);
      // For pool BOQ options, use the dynamically calculated price based on dimensions
      if (isPoolModel && opt.id >= BOQ_OPTION_ID_OFFSET) {
        const dynamicPrice = getPoolOptionPrice(opt.id);
        return sum + calculateTTC(dynamicPrice, vatRate) * qty;
      }
      return sum + calculateTTC(Number(opt.price || 0), vatRate) * qty;
    }, 0);
  };

  const calculateTotalTTC = () => {
    const base = getEffectiveBasePrice();
    return base + calculateOptionsTotalTTC();
  };

  // Get the display price for an option (dynamic for pool models), includes quantity multiplier
  const getOptionDisplayPrice = (opt: ModelOption) => {
    const qty = getOptionQty(opt.id);
    if (isPoolModel && opt.id >= BOQ_OPTION_ID_OFFSET) {
      const dynamicPrice = getPoolOptionPrice(opt.id);
      return calculateTTC(dynamicPrice, vatRate) * qty;
    }
    return calculateTTC(opt.price, vatRate) * qty;
  };

  // Get the unit price for an option (without quantity multiplier)
  const getOptionUnitPrice = (opt: ModelOption) => {
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

                  {/* Rectangular pool */}
                  {poolShape === 'Rectangulaire' && (
                    <>
                      <p className="text-xs text-blue-600 mb-3">Veuillez saisir les 3 dimensions pour voir le prix estimé.</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-blue-700 mb-1">Longueur (m)</label>
                          <Input
                            type="number"
                            step="0.5"
                            min="2"
                            max="20"
                            value={poolDimensions.longueur || ''}
                            placeholder="ex: 8"
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setPoolDimensions(prev => ({ ...prev, longueur: v >= 0 ? v : 0 }));
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
                            value={poolDimensions.largeur || ''}
                            placeholder="ex: 4"
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setPoolDimensions(prev => ({ ...prev, largeur: v >= 0 ? v : 0 }));
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
                            value={poolDimensions.profondeur || ''}
                            placeholder="ex: 1.5"
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setPoolDimensions(prev => ({ ...prev, profondeur: v >= 0 ? v : 0 }));
                            }}
                            className="h-9 text-sm bg-white"
                          />
                        </div>
                      </div>
                      {poolDimensionsReady && (
                        <p className="text-xs text-blue-600 mt-2">
                          Surface : {(poolDimensions.longueur * poolDimensions.largeur).toFixed(1)} m² •
                          Volume : {(poolDimensions.longueur * poolDimensions.largeur * poolDimensions.profondeur).toFixed(1)} m³
                        </p>
                      )}
                    </>
                  )}

                  {/* L-shape pool */}
                  {/* Note: longueur/largeur/profondeur base fields are kept in sync with LA (primary part)
                      so existing BOQ formulas that reference these base names continue to work. */}
                  {poolShape === 'L' && (
                    <>
                      <p className="text-xs text-blue-600 mb-3">Veuillez saisir les 6 dimensions pour voir le prix estimé.</p>
                      <p className="text-xs font-semibold text-blue-700 mb-2">Partie LA (piscine principale)</p>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-blue-700 mb-1">Longueur LA (m)</label>
                          <Input type="number" step="0.5" min="2" max="20"
                            value={poolDimensions.longueur_la || ''} placeholder="ex: 8"
                            onChange={(e) => { const v = Number(e.target.value); setPoolDimensions(prev => ({ ...prev, longueur_la: v >= 0 ? v : 0, longueur: v >= 0 ? v : 0 })); }}
                            className="h-9 text-sm bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-700 mb-1">Largeur LA (m)</label>
                          <Input type="number" step="0.5" min="1" max="15"
                            value={poolDimensions.largeur_la || ''} placeholder="ex: 4"
                            onChange={(e) => { const v = Number(e.target.value); setPoolDimensions(prev => ({ ...prev, largeur_la: v >= 0 ? v : 0, largeur: v >= 0 ? v : 0 })); }}
                            className="h-9 text-sm bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-700 mb-1">Profondeur LA (m)</label>
                          <Input type="number" step="0.1" min="0.5" max="3"
                            value={poolDimensions.profondeur_la || ''} placeholder="ex: 1.5"
                            onChange={(e) => { const v = Number(e.target.value); setPoolDimensions(prev => ({ ...prev, profondeur_la: v >= 0 ? v : 0, profondeur: v >= 0 ? v : 0 })); }}
                            className="h-9 text-sm bg-white" />
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-blue-700 mb-2">Partie LB (bout qui dépasse)</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-blue-700 mb-1">Longueur LB (m)</label>
                          <Input type="number" step="0.5" min="1" max="20"
                            value={poolDimensions.longueur_lb || ''} placeholder="ex: 3"
                            onChange={(e) => { const v = Number(e.target.value); setPoolDimensions(prev => ({ ...prev, longueur_lb: v >= 0 ? v : 0 })); }}
                            className="h-9 text-sm bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-700 mb-1">Largeur LB (m)</label>
                          <Input type="number" step="0.5" min="1" max="15"
                            value={poolDimensions.largeur_lb || ''} placeholder="ex: 2"
                            onChange={(e) => { const v = Number(e.target.value); setPoolDimensions(prev => ({ ...prev, largeur_lb: v >= 0 ? v : 0 })); }}
                            className="h-9 text-sm bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-700 mb-1">Profondeur LB (m)</label>
                          <Input type="number" step="0.1" min="0.5" max="3"
                            value={poolDimensions.profondeur_lb || ''} placeholder="ex: 1.5"
                            onChange={(e) => { const v = Number(e.target.value); setPoolDimensions(prev => ({ ...prev, profondeur_lb: v >= 0 ? v : 0 })); }}
                            className="h-9 text-sm bg-white" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* T-shape pool */}
                  {/* Note: longueur/largeur/profondeur base fields are kept in sync with TA (primary part)
                      so existing BOQ formulas that reference these base names continue to work. */}
                  {poolShape === 'T' && (
                    <>
                      <p className="text-xs text-blue-600 mb-3">Veuillez saisir les 6 dimensions pour voir le prix estimé.</p>
                      <p className="text-xs font-semibold text-blue-700 mb-2">Partie TA (piscine 1)</p>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-blue-700 mb-1">Longueur TA (m)</label>
                          <Input type="number" step="0.5" min="2" max="20"
                            value={poolDimensions.longueur_ta || ''} placeholder="ex: 8"
                            onChange={(e) => { const v = Number(e.target.value); setPoolDimensions(prev => ({ ...prev, longueur_ta: v >= 0 ? v : 0, longueur: v >= 0 ? v : 0 })); }}
                            className="h-9 text-sm bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-700 mb-1">Largeur TA (m)</label>
                          <Input type="number" step="0.5" min="1" max="15"
                            value={poolDimensions.largeur_ta || ''} placeholder="ex: 4"
                            onChange={(e) => { const v = Number(e.target.value); setPoolDimensions(prev => ({ ...prev, largeur_ta: v >= 0 ? v : 0, largeur: v >= 0 ? v : 0 })); }}
                            className="h-9 text-sm bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-700 mb-1">Profondeur TA (m)</label>
                          <Input type="number" step="0.1" min="0.5" max="3"
                            value={poolDimensions.profondeur_ta || ''} placeholder="ex: 1.5"
                            onChange={(e) => { const v = Number(e.target.value); setPoolDimensions(prev => ({ ...prev, profondeur_ta: v >= 0 ? v : 0, profondeur: v >= 0 ? v : 0 })); }}
                            className="h-9 text-sm bg-white" />
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-blue-700 mb-2">Partie TB (piscine 2)</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-blue-700 mb-1">Longueur TB (m)</label>
                          <Input type="number" step="0.5" min="1" max="20"
                            value={poolDimensions.longueur_tb || ''} placeholder="ex: 4"
                            onChange={(e) => { const v = Number(e.target.value); setPoolDimensions(prev => ({ ...prev, longueur_tb: v >= 0 ? v : 0 })); }}
                            className="h-9 text-sm bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-700 mb-1">Largeur TB (m)</label>
                          <Input type="number" step="0.5" min="1" max="15"
                            value={poolDimensions.largeur_tb || ''} placeholder="ex: 3"
                            onChange={(e) => { const v = Number(e.target.value); setPoolDimensions(prev => ({ ...prev, largeur_tb: v >= 0 ? v : 0 })); }}
                            className="h-9 text-sm bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-700 mb-1">Profondeur TB (m)</label>
                          <Input type="number" step="0.1" min="0.5" max="3"
                            value={poolDimensions.profondeur_tb || ''} placeholder="ex: 1.5"
                            onChange={(e) => { const v = Number(e.target.value); setPoolDimensions(prev => ({ ...prev, profondeur_tb: v >= 0 ? v : 0 })); }}
                            className="h-9 text-sm bg-white" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* For pool models: show calculating indicator or hide sections until dimensions are ready */}
              {isPoolModel && !poolDimensionsReady && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-center">
                  <p className="text-sm text-yellow-700">
                    {poolShape === 'L' || poolShape === 'T'
                      ? 'Renseignez les 6 dimensions ci-dessus pour voir le prix estimé et les options disponibles.'
                      : 'Renseignez les 3 dimensions ci-dessus pour voir le prix estimé et les options disponibles.'}
                  </p>
                </div>
              )}

              {isPoolModel && poolDimensionsReady && isCalculatingPrice && (
                <div className="bg-blue-50 border border-blue-200 p-6 rounded text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-blue-700">Calculs en cours…</p>
                  <p className="text-xs text-blue-500 mt-1">Estimation du prix en fonction de vos dimensions</p>
                </div>
              )}

              {/* Show content when: not a pool model OR (pool with dimensions ready and not loading) */}
              {(!isPoolModel || (poolDimensionsReady && !isCalculatingPrice)) && (
                <>
              {/* INCLUS DANS LE PRIX DE BASE */}
              {baseCategories.length > 0 && (
                <div className="bg-green-50 border border-green-200 p-4 rounded">
                  <h3 className="text-base font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Inclus dans le prix de base
                  </h3>
                  <div className="space-y-3">
                    {/* Parent categories (no parent_id), sorted alphabetically */}
                    {baseCategories
                      .filter(c => !c.parent_id)
                      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
                      .map(parentCat => {
                      const subCats = baseCategories
                        .filter(c => c.parent_id === parentCat.id)
                        .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
                      const sortedParentLines = [...parentCat.lines].sort((a, b) => a.description.localeCompare(b.description, 'fr'));
                      return (
                        <div key={parentCat.id}>
                          <p className="font-semibold text-green-800 text-sm mb-1">{parentCat.name}</p>
                          {subCats.length > 0 ? (
                            <div className="pl-4 space-y-1">
                              {subCats.map(subCat => {
                                const sortedLines = [...subCat.lines].sort((a, b) => a.description.localeCompare(b.description, 'fr'));
                                return (
                                  <div key={subCat.id} className="flex items-start gap-1">
                                    <span className="text-green-600 text-xs mt-0.5">–</span>
                                    <div>
                                      <span className="font-medium text-green-700 text-xs">{subCat.name}</span>
                                      {sortedLines.length > 0 && (
                                        <span className="text-xs text-gray-500">
                                          {' ('}
                                          {sortedLines.map((line, idx) => (
                                            <React.Fragment key={line.id}>
                                              {line.description}
                                              {idx < sortedLines.length - 1 && ', '}
                                            </React.Fragment>
                                          ))}
                                          {')'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            sortedParentLines.length > 0 && (
                              <div className="pl-4">
                                <span className="text-xs text-gray-500">
                                  {sortedParentLines.map((line, idx) => (
                                    <React.Fragment key={line.id}>
                                      {line.description}
                                      {idx < sortedParentLines.length - 1 && ', '}
                                    </React.Fragment>
                                  ))}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
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

              {/* Options — Category → Sub-category (expandable with lines) → Switch */}
              {Object.entries(groupedOptions)
                .sort(([a], [b]) => a.localeCompare(b, 'fr'))
                .map(([category, opts]) => {
                const isOpen = expandedCategories.includes(category);
                const categoryImageUrl = opts[0]?.category_image_url;
                return (
                  <div key={category} className="border rounded bg-white">
                    {/* Parent category header */}
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
                      <div>
                        {/* Category Image */}
                        {categoryImageUrl && (
                          <div className="px-4 py-3 border-b bg-gray-50 flex justify-center">
                            <img 
                              src={categoryImageUrl} 
                              alt={category}
                              className="w-[100px] h-[100px] object-cover rounded"
                            />
                          </div>
                        )}
                        {/* Sub-category options */}
                        <div className="divide-y">
                          {opts.sort((a, b) => a.name.localeCompare(b.name, 'fr')).map(opt => {
                            const isSubExpanded = expandedSubOptions.includes(opt.id);
                            const optQty = getOptionQty(opt.id);
                            return (
                              <div key={opt.id} className="px-4">
                                {/* Sub-category name (expandable) */}
                                <div className="flex justify-between items-center py-3">
                                  <button
                                    className="flex items-center gap-2 text-left flex-1 mr-4"
                                    onClick={() => toggleSubOption(opt.id)}
                                  >
                                    {isSubExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    )}
                                    <div>
                                      <p className="font-medium text-sm">{opt.name}</p>
                                      <p className="text-sm text-orange-600 font-medium mt-0.5">
                                        Rs {Math.round(getOptionDisplayPrice(opt)).toLocaleString()}
                                        {opt.qty_editable && optQty > 1 && (
                                          <span className="text-xs text-gray-400 ml-1">
                                            ({optQty} × Rs {Math.round(getOptionUnitPrice(opt)).toLocaleString()})
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </button>
                                  <div className="flex items-center gap-2">
                                    {opt.qty_editable && isSelected(opt.id) && (
                                      <Input
                                        type="number"
                                        min={String(MIN_OPTION_QTY)}
                                        max={String(MAX_OPTION_QTY)}
                                        value={optQty}
                                        onChange={(e) => {
                                          const v = Math.max(MIN_OPTION_QTY, Math.min(MAX_OPTION_QTY, Number(e.target.value) || MIN_OPTION_QTY));
                                          setOptionQuantities(prev => ({ ...prev, [opt.id]: v }));
                                        }}
                                        className="w-16 h-8 text-center text-sm"
                                      />
                                    )}
                                    <Switch
                                      checked={isSelected(opt.id)}
                                      onCheckedChange={() => toggleOption(opt)}
                                    />
                                  </div>
                                </div>
                                {/* Expanded lines */}
                                {isSubExpanded && opt.description && (
                                  <div className="pl-8 pb-3">
                                    <div className="text-xs text-gray-500 space-y-0.5">
                                      {opt.description.split('\n').sort((a, b) => a.localeCompare(b, 'fr')).map((line, idx) => (
                                        <p key={idx}>{line}</p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
                    <span className="font-medium">
                      {poolShape === 'L'
                        ? `LA: ${poolDimensions.longueur_la ?? 0}×${poolDimensions.largeur_la ?? 0}×${poolDimensions.profondeur_la ?? 0}m / LB: ${poolDimensions.longueur_lb ?? 0}×${poolDimensions.largeur_lb ?? 0}×${poolDimensions.profondeur_lb ?? 0}m`
                        : poolShape === 'T'
                        ? `TA: ${poolDimensions.longueur_ta ?? 0}×${poolDimensions.largeur_ta ?? 0}×${poolDimensions.profondeur_ta ?? 0}m / TB: ${poolDimensions.longueur_tb ?? 0}×${poolDimensions.largeur_tb ?? 0}×${poolDimensions.profondeur_tb ?? 0}m`
                        : `${poolDimensions.longueur}m × ${poolDimensions.largeur}m × ${poolDimensions.profondeur}m`}
                    </span>
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
