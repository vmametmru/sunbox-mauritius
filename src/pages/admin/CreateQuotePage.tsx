import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Save,
  Copy,
  UserPlus,
  Image as ImageIcon,
  FileText,
  Calculator,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { BOQ_OPTION_ID_OFFSET } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSiteSettings, calculateTTC } from '@/hooks/use-site-settings';

/* ======================================================
   TYPES
====================================================== */
interface Model {
  id: number;
  name: string;
  type: 'container' | 'pool';
  base_price: number;
  description?: string;
  image_url?: string;
}

interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface QuoteLine {
  id?: number;
  description: string;
  quantity: number;
  unit: string;
  unit_cost_ht: number;
  margin_percent: number;
}

interface QuoteCategory {
  id?: number;
  name: string;
  lines: QuoteLine[];
  expanded?: boolean;
}

interface Option {
  id: number;
  name: string;
  description?: string;
  price: number;
}

interface BOQOption {
  id: number;
  name: string;
  total_sale_price_ht: number;
}

const UNITS = ['unité', 'm²', 'm³', 'm', 'kg', 'l', 'h', 'jour', 'forfait'];

const emptyLine: QuoteLine = {
  description: '',
  quantity: 1,
  unit: 'unité',
  unit_cost_ht: 0,
  margin_percent: 30,
};

const emptyCategory: QuoteCategory = {
  name: '',
  lines: [],
  expanded: true,
};

/* ======================================================
   COMPONENT
====================================================== */
export default function CreateQuotePage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: siteSettings } = useSiteSettings();
  const vatRate = Number(siteSettings?.vat_rate) || 15;

  // Mode: 'free' for free-form quote, 'model' for model-based quote
  const [quoteMode, setQuoteMode] = useState<'free' | 'model'>('free');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Edit mode
  const editQuoteId = searchParams.get('edit');
  const cloneQuoteId = searchParams.get('clone');
  const isEditMode = !!editQuoteId;

  // Data
  const [models, setModels] = useState<Model[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

  // Quote info
  const [quoteTitle, setQuoteTitle] = useState('');
  const [marginPercent, setMarginPercent] = useState(30);
  const [photoUrl, setPhotoUrl] = useState('');
  const [planUrl, setPlanUrl] = useState('');

  // Model-based quote
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [modelOptions, setModelOptions] = useState<Option[]>([]);
  const [boqOptions, setBoqOptions] = useState<BOQOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);

  // Free quote
  const [categories, setCategories] = useState<QuoteCategory[]>([]);

  // Dialogs
  const [isContactSelectorOpen, setIsContactSelectorOpen] = useState(false);
  const [contactSearchTerm, setContactSearchTerm] = useState('');

  /* ======================================================
     LOAD DATA
  ====================================================== */
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (editQuoteId) {
      loadQuoteForEdit(parseInt(editQuoteId));
    } else if (cloneQuoteId) {
      loadQuoteForClone(parseInt(cloneQuoteId));
    }
  }, [editQuoteId, cloneQuoteId]);

  useEffect(() => {
    if (selectedModelId && quoteMode === 'model') {
      loadModelOptions(selectedModelId);
    }
  }, [selectedModelId, quoteMode]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [modelsData, contactsData] = await Promise.all([
        api.getModels('container', true), // Only active container models
        api.getContacts(),
      ]);
      setModels(modelsData || []);
      setContacts(contactsData || []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadModelOptions = async (modelId: number) => {
    try {
      const [options, boqOpts] = await Promise.all([
        api.getModelOptions(modelId),
        api.getBOQOptions(modelId),
      ]);
      setModelOptions(options || []);
      setBoqOptions(boqOpts || []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const loadQuoteForEdit = async (id: number) => {
    try {
      setLoading(true);
      const quote = await api.getQuoteWithDetails(id);
      
      // Set customer info
      setCustomerName(quote.customer_name || '');
      setCustomerEmail(quote.customer_email || '');
      setCustomerPhone(quote.customer_phone || '');
      setCustomerAddress(quote.customer_address || '');
      setCustomerMessage(quote.customer_message || '');
      setSelectedContactId(quote.contact_id || null);
      
      // Set quote info
      setQuoteTitle(quote.quote_title || '');
      setMarginPercent(quote.margin_percent || 30);
      setPhotoUrl(quote.photo_url || '');
      setPlanUrl(quote.plan_url || '');
      
      if (quote.is_free_quote) {
        setQuoteMode('free');
        // Load categories
        if (quote.categories) {
          setCategories(quote.categories.map((c: any) => ({
            id: c.id,
            name: c.name,
            lines: c.lines || [],
            expanded: true,
          })));
        }
      } else {
        setQuoteMode('model');
        setSelectedModelId(quote.model_id);
        // Load options
        if (quote.options) {
          setSelectedOptions(quote.options.map((o: any) => o.option_id).filter(Boolean));
        }
      }
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadQuoteForClone = async (id: number) => {
    try {
      setLoading(true);
      const quote = await api.getQuoteWithDetails(id);
      
      // Set customer info (copy)
      setCustomerName(quote.customer_name || '');
      setCustomerEmail(quote.customer_email || '');
      setCustomerPhone(quote.customer_phone || '');
      setCustomerAddress(quote.customer_address || '');
      setCustomerMessage(quote.customer_message || '');
      setSelectedContactId(quote.contact_id || null);
      
      // Set quote info (copy with modified title)
      setQuoteTitle((quote.quote_title || 'Devis') + ' (copie)');
      setMarginPercent(quote.margin_percent || 30);
      setPhotoUrl(quote.photo_url || '');
      setPlanUrl(quote.plan_url || '');
      
      if (quote.is_free_quote) {
        setQuoteMode('free');
        // Load categories
        if (quote.categories) {
          setCategories(quote.categories.map((c: any) => ({
            name: c.name,
            lines: (c.lines || []).map((l: any) => ({
              description: l.description,
              quantity: l.quantity,
              unit: l.unit,
              unit_cost_ht: l.unit_cost_ht,
              margin_percent: l.margin_percent,
            })),
            expanded: true,
          })));
        }
      } else {
        setQuoteMode('model');
        setSelectedModelId(quote.model_id);
        // Load options
        if (quote.options) {
          setSelectedOptions(quote.options.map((o: any) => o.option_id).filter(Boolean));
        }
      }
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     CONTACT SELECTION
  ====================================================== */
  const selectContact = (contact: Contact) => {
    setSelectedContactId(contact.id);
    setCustomerName(contact.name);
    setCustomerEmail(contact.email);
    setCustomerPhone(contact.phone || '');
    setCustomerAddress(contact.address || '');
    setIsContactSelectorOpen(false);
    toast({ title: 'Contact sélectionné', description: contact.name });
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(contactSearchTerm.toLowerCase())
  );

  /* ======================================================
     CATEGORIES & LINES (FREE QUOTE)
  ====================================================== */
  const addCategory = () => {
    setCategories([...categories, { ...emptyCategory, name: `Catégorie ${categories.length + 1}` }]);
  };

  const updateCategory = (index: number, updates: Partial<QuoteCategory>) => {
    const newCategories = [...categories];
    newCategories[index] = { ...newCategories[index], ...updates };
    setCategories(newCategories);
  };

  const deleteCategory = (index: number) => {
    if (!confirm('Supprimer cette catégorie et toutes ses lignes ?')) return;
    setCategories(categories.filter((_, i) => i !== index));
  };

  const toggleCategory = (index: number) => {
    const newCategories = [...categories];
    newCategories[index] = { ...newCategories[index], expanded: !newCategories[index].expanded };
    setCategories(newCategories);
  };

  const addLine = (categoryIndex: number) => {
    const newCategories = [...categories];
    newCategories[categoryIndex].lines.push({ ...emptyLine, margin_percent: marginPercent });
    setCategories(newCategories);
  };

  const updateLine = (categoryIndex: number, lineIndex: number, updates: Partial<QuoteLine>) => {
    const newCategories = [...categories];
    newCategories[categoryIndex].lines[lineIndex] = {
      ...newCategories[categoryIndex].lines[lineIndex],
      ...updates,
    };
    setCategories(newCategories);
  };

  const deleteLine = (categoryIndex: number, lineIndex: number) => {
    const newCategories = [...categories];
    newCategories[categoryIndex].lines = newCategories[categoryIndex].lines.filter((_, i) => i !== lineIndex);
    setCategories(newCategories);
  };

  /* ======================================================
     MODEL OPTIONS
  ====================================================== */
  const toggleOption = (optionId: number) => {
    if (selectedOptions.includes(optionId)) {
      setSelectedOptions(selectedOptions.filter(id => id !== optionId));
    } else {
      setSelectedOptions([...selectedOptions, optionId]);
    }
  };

  /* ======================================================
     CALCULATIONS
  ====================================================== */
  const calculateLineTotalCost = (line: QuoteLine) => {
    return line.quantity * line.unit_cost_ht;
  };

  const calculateLineSalePrice = (line: QuoteLine) => {
    return line.quantity * line.unit_cost_ht * (1 + line.margin_percent / 100);
  };

  const calculateCategoryTotalCost = (category: QuoteCategory) => {
    return category.lines.reduce((sum, line) => sum + calculateLineTotalCost(line), 0);
  };

  const calculateCategorySalePrice = (category: QuoteCategory) => {
    return category.lines.reduce((sum, line) => sum + calculateLineSalePrice(line), 0);
  };

  // Free quote totals
  const totalCostHT = categories.reduce((sum, cat) => sum + calculateCategoryTotalCost(cat), 0);
  const totalSalePriceHT = categories.reduce((sum, cat) => sum + calculateCategorySalePrice(cat), 0);
  const totalProfitHT = totalSalePriceHT - totalCostHT;
  const totalPriceTTC = calculateTTC(totalSalePriceHT, vatRate);

  // Model quote totals
  const selectedModel = models.find(m => m.id === selectedModelId);
  const modelBasePrice = selectedModel?.base_price || 0;
  
  const selectedModelOptionsTotal = selectedOptions
    .filter(id => id < BOQ_OPTION_ID_OFFSET)
    .reduce((sum, id) => {
      const opt = modelOptions.find(o => o.id === id);
      return sum + (opt?.price || 0);
    }, 0);
  
  const selectedBOQOptionsTotal = selectedOptions
    .filter(id => id >= BOQ_OPTION_ID_OFFSET)
    .reduce((sum, id) => {
      const opt = boqOptions.find(o => o.id === id);
      return sum + (opt?.total_sale_price_ht || 0);
    }, 0);
  
  const modelOptionsTotal = selectedModelOptionsTotal + selectedBOQOptionsTotal;
  const modelTotalPrice = modelBasePrice + modelOptionsTotal;

  const formatPrice = (price: number) => `Rs ${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  /* ======================================================
     SAVE QUOTE
  ====================================================== */
  const validateForm = () => {
    if (!customerName.trim()) {
      toast({ title: 'Erreur', description: 'Le nom du client est requis', variant: 'destructive' });
      return false;
    }
    if (!customerEmail.trim()) {
      toast({ title: 'Erreur', description: 'L\'email du client est requis', variant: 'destructive' });
      return false;
    }
    if (!customerPhone.trim()) {
      toast({ title: 'Erreur', description: 'Le téléphone du client est requis', variant: 'destructive' });
      return false;
    }
    if (quoteMode === 'model' && !selectedModelId) {
      toast({ title: 'Erreur', description: 'Veuillez sélectionner un modèle', variant: 'destructive' });
      return false;
    }
    if (quoteMode === 'free' && categories.length === 0) {
      toast({ title: 'Erreur', description: 'Ajoutez au moins une catégorie', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const saveQuote = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      if (isEditMode && editQuoteId) {
        // Update existing quote
        const updateData: any = {
          id: parseInt(editQuoteId),
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          customer_message: customerMessage,
          quote_title: quoteTitle,
          margin_percent: marginPercent,
          photo_url: photoUrl,
          plan_url: planUrl,
        };

        if (quoteMode === 'free') {
          updateData.total_price = totalSalePriceHT;
          updateData.categories = categories.map(cat => ({
            name: cat.name,
            lines: cat.lines.map(line => ({
              description: line.description,
              quantity: line.quantity,
              unit: line.unit,
              unit_cost_ht: line.unit_cost_ht,
              margin_percent: line.margin_percent,
            })),
          }));
        } else {
          updateData.model_id = selectedModelId;
          updateData.model_name = selectedModel?.name;
          updateData.model_type = 'container';
          updateData.base_price = modelBasePrice;
          updateData.options_total = modelOptionsTotal;
          updateData.total_price = modelTotalPrice;
          updateData.selected_options = selectedOptions.map(id => {
            if (id >= BOQ_OPTION_ID_OFFSET) {
              const opt = boqOptions.find(o => o.id === id);
              return {
                option_id: id,
                option_name: opt?.name || '',
                option_price: opt?.total_sale_price_ht || 0,
              };
            } else {
              const opt = modelOptions.find(o => o.id === id);
              return {
                option_id: id,
                option_name: opt?.name || '',
                option_price: opt?.price || 0,
              };
            }
          });
        }

        await api.updateAdminQuote(updateData);
        toast({ title: 'Succès', description: 'Devis mis à jour' });
      } else {
        // Create new quote
        const quoteData: any = {
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          customer_message: customerMessage,
          contact_id: selectedContactId || undefined,
          is_free_quote: quoteMode === 'free',
          quote_title: quoteTitle,
          margin_percent: marginPercent,
          photo_url: photoUrl,
          plan_url: planUrl,
          cloned_from_id: cloneQuoteId ? parseInt(cloneQuoteId) : undefined,
        };

        if (quoteMode === 'free') {
          quoteData.model_type = 'container';
          quoteData.model_name = quoteTitle || 'Devis libre';
          quoteData.total_price = totalSalePriceHT;
          quoteData.categories = categories.map(cat => ({
            name: cat.name,
            lines: cat.lines.map(line => ({
              description: line.description,
              quantity: line.quantity,
              unit: line.unit,
              unit_cost_ht: line.unit_cost_ht,
              margin_percent: line.margin_percent,
            })),
          }));
        } else {
          quoteData.model_id = selectedModelId;
          quoteData.model_name = selectedModel?.name;
          quoteData.model_type = 'container';
          quoteData.base_price = modelBasePrice;
          quoteData.options_total = modelOptionsTotal;
          quoteData.total_price = modelTotalPrice;
          quoteData.selected_options = selectedOptions.map(id => {
            if (id >= BOQ_OPTION_ID_OFFSET) {
              const opt = boqOptions.find(o => o.id === id);
              return {
                option_id: id,
                option_name: opt?.name || '',
                option_price: opt?.total_sale_price_ht || 0,
              };
            } else {
              const opt = modelOptions.find(o => o.id === id);
              return {
                option_id: id,
                option_name: opt?.name || '',
                option_price: opt?.price || 0,
              };
            }
          });
        }

        const result = await api.createAdminQuote(quoteData);
        toast({ 
          title: 'Succès', 
          description: `Devis ${result.reference_number} créé avec succès` 
        });
      }

      navigate('/admin/quotes');
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  /* ======================================================
     RENDER
  ====================================================== */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/quotes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditMode ? 'Modifier le devis' : cloneQuoteId ? 'Cloner le devis' : 'Nouveau Devis'}
            </h1>
            <p className="text-gray-500 mt-1">
              {quoteMode === 'free' ? 'Devis libre avec catégories personnalisées' : 'Devis basé sur un modèle'}
            </p>
          </div>
        </div>
        <Button onClick={saveQuote} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Enregistrement...' : (isEditMode ? 'Mettre à jour' : 'Créer le devis')}
        </Button>
      </div>

      {/* Quote Mode Selection (only for new quotes) */}
      {!isEditMode && !cloneQuoteId && (
        <Tabs value={quoteMode} onValueChange={(v) => setQuoteMode(v as 'free' | 'model')}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="free">
              <Calculator className="h-4 w-4 mr-2" />
              Devis Libre
            </TabsTrigger>
            <TabsTrigger value="model">
              <FileText className="h-4 w-4 mr-2" />
              Depuis Modèle
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Informations Client</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setIsContactSelectorOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Charger un contact
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Nom *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nom du client"
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Téléphone *</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+230 5xxx xxxx"
                  />
                </div>
                <div>
                  <Label htmlFor="customerAddress">Adresse</Label>
                  <Input
                    id="customerAddress"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Adresse complète"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="customerMessage">Message / Notes</Label>
                <Textarea
                  id="customerMessage"
                  value={customerMessage}
                  onChange={(e) => setCustomerMessage(e.target.value)}
                  placeholder="Notes ou demandes particulières..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quote Details */}
          <Card>
            <CardHeader>
              <CardTitle>Détails du Devis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quoteTitle">Titre du devis</Label>
                  <Input
                    id="quoteTitle"
                    value={quoteTitle}
                    onChange={(e) => setQuoteTitle(e.target.value)}
                    placeholder="Ex: Maison container T2"
                  />
                </div>
                <div>
                  <Label htmlFor="marginPercent">Marge par défaut (%)</Label>
                  <Input
                    id="marginPercent"
                    type="number"
                    min="0"
                    max="100"
                    value={marginPercent}
                    onChange={(e) => setMarginPercent(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="photoUrl">URL Photo (optionnel)</Label>
                  <Input
                    id="photoUrl"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="planUrl">URL Plan (optionnel)</Label>
                  <Input
                    id="planUrl"
                    value={planUrl}
                    onChange={(e) => setPlanUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Free Quote: Categories & Lines */}
          {quoteMode === 'free' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Catégories et Lignes</h2>
                <Button onClick={addCategory} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une catégorie
                </Button>
              </div>

              {categories.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune catégorie. Cliquez sur "Ajouter une catégorie" pour commencer.</p>
                  </CardContent>
                </Card>
              ) : (
                categories.map((category, catIndex) => (
                  <Card key={catIndex}>
                    <CardHeader
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleCategory(catIndex)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {category.expanded ? (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-500" />
                          )}
                          <Input
                            value={category.name}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateCategory(catIndex, { name: e.target.value });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold max-w-xs"
                          />
                          <Badge variant="secondary">{category.lines.length} lignes</Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-orange-600">
                            {formatPrice(calculateCategorySalePrice(category))}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCategory(catIndex);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {category.expanded && (
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[40%]">Description</TableHead>
                              <TableHead className="w-[10%]">Qté</TableHead>
                              <TableHead className="w-[10%]">Unité</TableHead>
                              <TableHead className="w-[15%]">Coût unit. HT</TableHead>
                              <TableHead className="w-[10%]">Marge %</TableHead>
                              <TableHead className="w-[10%] text-right">Total HT</TableHead>
                              <TableHead className="w-[5%]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {category.lines.map((line, lineIndex) => (
                              <TableRow key={lineIndex}>
                                <TableCell>
                                  <Input
                                    value={line.description}
                                    onChange={(e) => updateLine(catIndex, lineIndex, { description: e.target.value })}
                                    placeholder="Description"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={line.quantity}
                                    onChange={(e) => updateLine(catIndex, lineIndex, { quantity: Number(e.target.value) })}
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={line.unit}
                                    onValueChange={(v) => updateLine(catIndex, lineIndex, { unit: v })}
                                  >
                                    <SelectTrigger className="w-24">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {UNITS.map(u => (
                                        <SelectItem key={u} value={u}>{u}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={line.unit_cost_ht}
                                    onChange={(e) => updateLine(catIndex, lineIndex, { unit_cost_ht: Number(e.target.value) })}
                                    className="w-28"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={line.margin_percent}
                                    onChange={(e) => updateLine(catIndex, lineIndex, { margin_percent: Number(e.target.value) })}
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatPrice(calculateLineSalePrice(line))}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => deleteLine(catIndex, lineIndex)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="mt-4">
                          <Button variant="outline" size="sm" onClick={() => addLine(catIndex)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Ajouter une ligne
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Model-based Quote: Model Selection & Options */}
          {quoteMode === 'model' && (
            <div className="space-y-4">
              {/* Model Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Sélection du Modèle</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={selectedModelId?.toString() || ''}
                    onValueChange={(v) => setSelectedModelId(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un modèle..." />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map(model => (
                        <SelectItem key={model.id} value={model.id.toString()}>
                          {model.name} - {formatPrice(model.base_price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedModel && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium">{selectedModel.name}</h4>
                      {selectedModel.description && (
                        <p className="text-sm text-gray-600 mt-1">{selectedModel.description}</p>
                      )}
                      <p className="text-lg font-bold text-orange-600 mt-2">
                        Prix de base: {formatPrice(selectedModel.base_price)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Options Selection */}
              {selectedModelId && (modelOptions.length > 0 || boqOptions.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Options Disponibles</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Standard Options */}
                    {modelOptions.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Options Standard</h4>
                        <div className="space-y-2">
                          {modelOptions.map(option => (
                            <div
                              key={option.id}
                              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedOptions.includes(option.id)
                                  ? 'border-orange-500 bg-orange-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => toggleOption(option.id)}
                            >
                              <div className="flex items-center gap-3">
                                <Switch checked={selectedOptions.includes(option.id)} />
                                <div>
                                  <p className="font-medium">{option.name}</p>
                                  {option.description && (
                                    <p className="text-sm text-gray-500">{option.description}</p>
                                  )}
                                </div>
                              </div>
                              <span className="font-semibold">{formatPrice(option.price)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* BOQ Options */}
                    {boqOptions.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Options BOQ</h4>
                        <div className="space-y-2">
                          {boqOptions.map(option => (
                            <div
                              key={option.id}
                              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedOptions.includes(option.id)
                                  ? 'border-orange-500 bg-orange-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => toggleOption(option.id)}
                            >
                              <div className="flex items-center gap-3">
                                <Switch checked={selectedOptions.includes(option.id)} />
                                <p className="font-medium">{option.name}</p>
                              </div>
                              <span className="font-semibold">{formatPrice(option.total_sale_price_ht)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: Summary */}
        <div className="space-y-6">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quoteMode === 'free' ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Catégories</span>
                      <span>{categories.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Lignes</span>
                      <span>{categories.reduce((sum, c) => sum + c.lines.length, 0)}</span>
                    </div>
                  </div>
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Coût Total HT</span>
                      <span>{formatPrice(totalCostHT)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Marge</span>
                      <span className="text-green-600">+{formatPrice(totalProfitHT)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Total HT</span>
                      <span>{formatPrice(totalSalePriceHT)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>TVA ({vatRate}%)</span>
                      <span>{formatPrice(totalPriceTTC - totalSalePriceHT)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-orange-600 pt-2 border-t">
                      <span>Total TTC</span>
                      <span>{formatPrice(totalPriceTTC)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prix de base</span>
                      <span>{formatPrice(modelBasePrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Options ({selectedOptions.length})</span>
                      <span>{formatPrice(modelOptionsTotal)}</span>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold text-orange-600">
                      <span>Total HT</span>
                      <span>{formatPrice(modelTotalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>TVA ({vatRate}%)</span>
                      <span>{formatPrice(calculateTTC(modelTotalPrice, vatRate) - modelTotalPrice)}</span>
                    </div>
                    <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                      <span>Total TTC</span>
                      <span>{formatPrice(calculateTTC(modelTotalPrice, vatRate))}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Media Preview */}
              {(photoUrl || planUrl) && (
                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-medium text-sm">Médias</h4>
                  {photoUrl && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Photo</p>
                      <img src={photoUrl} alt="Photo" className="w-full h-24 object-cover rounded-lg" />
                    </div>
                  )}
                  {planUrl && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Plan</p>
                      <img src={planUrl} alt="Plan" className="w-full h-24 object-cover rounded-lg" />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contact Selector Dialog */}
      <Dialog open={isContactSelectorOpen} onOpenChange={setIsContactSelectorOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Sélectionner un contact</DialogTitle>
            <DialogDescription>
              Choisissez un contact existant pour pré-remplir les informations client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Rechercher par nom ou email..."
              value={contactSearchTerm}
              onChange={(e) => setContactSearchTerm(e.target.value)}
            />
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredContacts.map(contact => (
                <div
                  key={contact.id}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => selectContact(contact)}
                >
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-gray-500">{contact.email}</p>
                  {contact.phone && (
                    <p className="text-sm text-gray-500">{contact.phone}</p>
                  )}
                </div>
              ))}
              {filteredContacts.length === 0 && (
                <p className="text-center text-gray-500 py-4">Aucun contact trouvé</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
