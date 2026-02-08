import React, { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown, ZoomIn, Check, User, Mail, Phone, MapPin, MessageSquare, Loader2, ArrowLeft, ArrowRight, CheckCircle, Users, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useSiteSettings, calculateTTC } from '@/hooks/use-site-settings';
import { useToast } from '@/hooks/use-toast';
import { BOQ_OPTION_ID_OFFSET } from '@/lib/utils';

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

interface ModelOption {
  id: number;
  model_id: number;
  category_id: number;
  category_name?: string;
  category_description?: string;
  category_image_url?: string | null;
  name: string;
  description?: string;
  price: number;
  is_active: boolean;
}

interface Model {
  id: number;
  name: string;
  type: 'container' | 'pool';
  description: string;
  base_price: number;
  calculated_base_price?: number;
  surface_m2: number;
  bedrooms?: number;
  bathrooms?: number;
  container_20ft_count?: number;
  container_40ft_count?: number;
  pool_shape?: string;
  has_overflow?: boolean;
  image_url: string;
  plan_url?: string;
}

interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface ExistingQuote {
  id: number;
  model_id: number;
  model_name: string;
  model_type: 'container' | 'pool';
  base_price: number;
  options_total: number;
  total_price: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address?: string;
  customer_message?: string;
  contact_id?: number;
  status: string;
  options?: Array<{ option_id: number; option_name: string; option_price: number }>;
}

// Constants for BOQ options handling
const BOQ_OPTIONS_CATEGORY_ID = -1;

interface AdminConfigureModalProps {
  open: boolean;
  onClose: () => void;
  quoteId?: number; // If provided, we're editing an existing quote
  onSaved?: () => void; // Called after a successful save
}

const AdminConfigureModal: React.FC<AdminConfigureModalProps> = ({ open, onClose, quoteId, onSaved }) => {
  // State
  const [model, setModel] = useState<Model | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<ModelOption[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');
  const [contactId, setContactId] = useState<number | null>(null);
  
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [options, setOptions] = useState<ModelOption[]>([]);
  const [boqOptions, setBOQOptions] = useState<ModelOption[]>([]);
  const [baseCategories, setBaseCategories] = useState<BOQBaseCategory[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Pending option IDs to be selected after options load (using ref instead of sessionStorage)
  const pendingOptionIdsRef = React.useRef<number[]>([]);
  
  // Contact selection
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  
  // Multi-step state
  const [step, setStep] = useState<'options' | 'details' | 'confirmation'>('options');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedQuote, setSavedQuote] = useState<{ id: number; reference_number: string } | null>(null);
  
  const { toast } = useToast();
  const { data: siteSettings } = useSiteSettings();
  const vatRate = Number(siteSettings?.vat_rate) || 15;

  // Load quote data when opening for edit
  useEffect(() => {
    if (open && quoteId) {
      loadQuoteData(quoteId);
      loadContacts();
    }
    if (open) {
      setStep('options');
      setErrors({});
      setSavedQuote(null);
    }
  }, [open, quoteId]);

  // Load options when model is set
  useEffect(() => {
    if (model?.id) {
      loadOptions();
      loadBOQOptions();
      loadBaseCategories();
    }
  }, [model?.id]);

  const loadContacts = async () => {
    try {
      const data = await api.getContacts();
      setContacts(data || []);
    } catch (err) {
      console.error('Error loading contacts:', err);
    }
  };

  const loadQuoteData = async (id: number) => {
    setLoading(true);
    // Reset selected options when loading a new quote
    setSelectedOptions([]);
    pendingOptionIdsRef.current = [];
    
    try {
      const quote = await api.getQuoteWithDetails(id);
      
      // Load model info
      const models = await api.getModels(quote.model_type, true);
      const modelData = models.find((m: Model) => m.id === quote.model_id);
      
      if (modelData) {
        // Update base_price with TTC calculation
        // Uses calculated_base_price (from BOQ) if available, otherwise falls back to manual base_price
        const priceHT = Number(modelData.calculated_base_price ?? modelData.base_price ?? 0);
        setModel({
          ...modelData,
          base_price: calculateTTC(priceHT, vatRate),
        });
      }
      
      // Set customer info
      setCustomerName(quote.customer_name || '');
      setCustomerEmail(quote.customer_email || '');
      setCustomerPhone(quote.customer_phone || '');
      setCustomerAddress(quote.customer_address || '');
      setCustomerMessage(quote.customer_message || '');
      setContactId(quote.contact_id || null);
      
      // Store option IDs to be selected after options are loaded
      if (quote.options && quote.options.length > 0) {
        const optionIds = quote.options.map((o: any) => o.option_id);
        pendingOptionIdsRef.current = optionIds;
      }
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    if (!model?.id) return;
    try {
      const data = await api.getModelOptions(model.id);
      const mapped: ModelOption[] = data.map((o: any) => ({
        id: Number(o.id),
        model_id: Number(o.model_id),
        category_id: Number(o.category_id),
        category_name: o.category_name,
        category_description: o.category_description || '',
        category_image_url: o.category_image_url || null,
        name: o.name,
        description: o.description,
        price: parseFloat(o.price),
        is_active: Boolean(o.is_active),
      }));
      setOptions(mapped);
      
      // Apply pre-selected options from pending IDs ref
      if (pendingOptionIdsRef.current.length > 0) {
        const preselected = mapped.filter(o => pendingOptionIdsRef.current.includes(o.id));
        if (preselected.length > 0) {
          setSelectedOptions(prev => {
            const newOptions = preselected.filter(p => !prev.some(s => s.id === p.id));
            return [...prev, ...newOptions];
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadBOQOptions = async () => {
    if (!model?.id) return;
    try {
      const data = await api.getBOQOptions(model.id);
      const mapped: ModelOption[] = await Promise.all(
        data.map(async (o: BOQOption) => {
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
          };
        })
      );
      setBOQOptions(mapped);
      
      // Apply pre-selected BOQ options from pending IDs ref
      if (pendingOptionIdsRef.current.length > 0) {
        const preselected = mapped.filter(o => pendingOptionIdsRef.current.includes(o.id));
        if (preselected.length > 0) {
          setSelectedOptions(prev => {
            const newOptions = preselected.filter(p => !prev.some(s => s.id === p.id));
            return [...prev, ...newOptions];
          });
        }
        // Clear the ref after BOQ options are processed (both regular and BOQ are now loaded)
        pendingOptionIdsRef.current = [];
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadBaseCategories = async () => {
    if (!model?.id) return;
    try {
      const data = await api.getBOQBaseCategories(model.id);
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

  const toggleOption = (option: ModelOption) => {
    setSelectedOptions(prev => {
      const exists = prev.some(o => o.id === option.id);
      if (exists) {
        return prev.filter(o => o.id !== option.id);
      }
      return [...prev, option];
    });
  };

  const isSelected = (id: number) => selectedOptions.some(o => o.id === id);

  // Calculations
  const calculateOptionsTotalTTC = () => {
    return selectedOptions.reduce((sum, opt) => sum + calculateTTC(Number(opt.price || 0), vatRate), 0);
  };

  const calculateTotalTTC = () => {
    const base = Number(model?.base_price ?? 0);
    return base + calculateOptionsTotalTTC();
  };

  // Contact selection
  const selectContact = (contact: Contact) => {
    setContactId(contact.id);
    setCustomerName(contact.name);
    setCustomerEmail(contact.email);
    setCustomerPhone(contact.phone || '');
    setCustomerAddress(contact.address || '');
    setShowContactSelector(false);
    toast({ title: 'Contact sélectionné', description: contact.name });
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(contactSearchTerm.toLowerCase())
  );

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!customerName.trim()) {
      newErrors.name = 'Le nom est requis';
    }
    
    if (!customerEmail.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(customerEmail)) {
      newErrors.email = 'Veuillez entrer un email valide';
    }
    
    if (!customerPhone.trim()) {
      newErrors.phone = 'Le téléphone est requis';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = async () => {
    if (!validateForm() || !model) return;
    
    setIsSubmitting(true);
    
    try {
      const optionsTotal = calculateOptionsTotalTTC();
      const totalPrice = calculateTotalTTC();
      
      const quoteData = {
        model_id: model.id,
        model_name: model.name,
        model_type: model.type,
        base_price: Number(model.base_price ?? 0),
        options_total: optionsTotal,
        total_price: totalPrice,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_address: customerAddress || '',
        customer_message: customerMessage || '',
        contact_id: contactId || undefined,
        selected_options: selectedOptions.map(opt => ({
          option_id: opt.id,
          option_name: opt.name,
          option_price: calculateTTC(opt.price, vatRate),
        })),
      };
      
      let result;
      if (quoteId) {
        // Update existing quote
        result = await api.updateAdminQuote({
          id: quoteId,
          ...quoteData,
        });
        toast({ title: 'Succès', description: 'Le devis a été mis à jour avec succès!' });
      } else {
        // Create new quote
        result = await api.createAdminQuote({
          ...quoteData,
          is_free_quote: false,
        });
        toast({ title: 'Succès', description: 'Le devis a été créé avec succès!' });
      }
      
      setSavedQuote(result);
      setStep('confirmation');
      onSaved?.();
    } catch (err: any) {
      console.error('Quote submission error:', err);
      setErrors({ submit: err.message || 'Échec de la sauvegarde du devis. Veuillez réessayer.' });
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setSelectedOptions([]);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerMessage('');
    setContactId(null);
    setModel(null);
    setOptions([]);
    setBOQOptions([]);
    setBaseCategories([]);
    setStep('options');
    pendingOptionIdsRef.current = [];
    setErrors({});
    setSavedQuote(null);
    onClose();
  };

  if (!model && !loading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <VisuallyHidden>
            <DialogTitle>Chargement</DialogTitle>
            <DialogDescription>Chargement du devis en cours</DialogDescription>
          </VisuallyHidden>
          <div className="text-center py-8 text-gray-500">
            Chargement du devis...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-4xl h-[90vh] overflow-y-auto">
        <VisuallyHidden>
          <DialogTitle>{quoteId ? 'Modifier le devis' : 'Nouveau devis'} - {model?.name}</DialogTitle>
          <DialogDescription>Configurez les options et les informations client</DialogDescription>
        </VisuallyHidden>

        {/* Lightbox */}
        {lightbox && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
            <img src={lightbox} alt="Zoom" className="max-h-[90vh] object-contain rounded shadow" />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : model && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">{model.name}</h2>
                  {quoteId && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Mode édition</span>
                  )}
                </div>
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
                <span className="text-sm font-medium hidden sm:inline">Client</span>
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

                {/* Base inclusions */}
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
                {Object.keys(groupedOptions).length > 0 && (
                  <h3 className="text-lg font-semibold text-gray-800">OPTIONS DISPONIBLES :</h3>
                )}

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
                        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                      {isOpen && (
                        <div className="divide-y">
                          {categoryDescription && (
                            <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600 whitespace-pre-line">
                              {categoryDescription}
                            </div>
                          )}
                          <div className="flex">
                            {categoryImageUrl && (
                              <div className="flex-shrink-0 p-4 border-r">
                                <img 
                                  src={categoryImageUrl} 
                                  alt={category}
                                  className="w-[100px] h-[100px] object-cover rounded"
                                />
                              </div>
                            )}
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
                    Informations Client
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Renseignez les informations du client pour ce devis.
                  </p>

                  {/* Contact Selector Button */}
                  <div className="mb-6">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowContactSelector(true)}
                      className="w-full justify-start text-left"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      {contactId ? 'Changer de contact' : 'Sélectionner un contact existant'}
                    </Button>
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
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
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
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
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
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
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
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Grand Baie, Maurice"
                        />
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes / Message
                      </label>
                      <div className="relative">
                        <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                        <textarea
                          value={customerMessage}
                          onChange={(e) => setCustomerMessage(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          rows={4}
                          placeholder="Notes supplémentaires..."
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
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Prix de base TTC</span>
                    <span className="font-medium">Rs {Number(model.base_price ?? 0).toLocaleString()}</span>
                  </div>
                  {selectedOptions.length > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Options ({selectedOptions.length})</span>
                      <span className="font-medium">Rs {calculateOptionsTotalTTC().toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="font-semibold">Total TTC</span>
                    <span className="text-xl font-bold text-orange-600">Rs {calculateTotalTTC().toLocaleString()}</span>
                  </div>
                </div>

                {/* Navigation */}
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
                        Sauvegarde en cours...
                      </>
                    ) : (
                      <>
                        {quoteId ? 'Mettre à jour le devis' : 'Créer le devis'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            {/* STEP 3: CONFIRMATION */}
            {step === 'confirmation' && savedQuote && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {quoteId ? 'Devis mis à jour!' : 'Devis créé avec succès!'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {quoteId 
                    ? 'Les modifications ont été enregistrées.'
                    : 'Le devis a été enregistré dans le système.'
                  }
                </p>
                
                <div className="bg-gray-50 rounded-lg p-6 text-left max-w-md mx-auto mb-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Référence</span>
                      <span className="font-mono font-bold text-blue-600">{savedQuote.reference_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Modèle</span>
                      <span className="font-medium">{model.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total TTC</span>
                      <span className="font-bold text-orange-600">Rs {calculateTotalTTC().toLocaleString()}</span>
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
        )}

        {/* Contact Selector Dialog */}
        <Dialog open={showContactSelector} onOpenChange={setShowContactSelector}>
          <DialogContent className="max-w-md">
            <VisuallyHidden>
              <DialogTitle>Sélectionner un contact</DialogTitle>
              <DialogDescription>Choisissez un contact existant pour ce devis</DialogDescription>
            </VisuallyHidden>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Sélectionner un contact</h3>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom ou email..."
                  value={contactSearchTerm}
                  onChange={(e) => setContactSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="max-h-[300px] overflow-y-auto border rounded-lg divide-y">
                {filteredContacts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Aucun contact trouvé
                  </div>
                ) : (
                  filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => selectContact(contact)}
                      className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
                    >
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-sm text-gray-500">{contact.email}</p>
                      {contact.phone && (
                        <p className="text-sm text-gray-400">{contact.phone}</p>
                      )}
                    </button>
                  ))
                )}
              </div>
              
              <Button variant="outline" onClick={() => setShowContactSelector(false)} className="w-full">
                Annuler
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default AdminConfigureModal;
