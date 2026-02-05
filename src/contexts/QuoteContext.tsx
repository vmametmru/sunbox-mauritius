import React, { createContext, useContext, useState, ReactNode } from 'react';

/* ======================================================
   TYPES
====================================================== */

export interface Model {
  id: number;
  name: string;
  type: 'container' | 'pool';
  description: string;
  base_price: number;
  calculated_base_price?: number; // BOQ-calculated price if available
  price_source?: 'boq' | 'manual';
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

export interface ModelOption {
  id: number;
  model_id: number;
  category_id: number;
  category_name?: string; // jointure API
  name: string;
  description?: string;
  price: number;
  is_active: boolean;
}

export interface QuoteData {
  model: Model | null;
  selectedOptions: ModelOption[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  customerMessage?: string;
}

export interface GeneratedQuote {
  id?: number;
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
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  created_at?: string;
}

/* ======================================================
   CONTEXT TYPE
====================================================== */

interface QuoteContextType {
  quoteData: QuoteData;
  generatedQuote: GeneratedQuote | null;

  setSelectedModel: (model: Model) => void;
  toggleOption: (option: ModelOption) => void;
  setCustomerDetails: (details: Partial<QuoteData>) => void;

  calculateOptionsTotal: () => number;
  calculateTotal: () => number;

  setGeneratedQuote: (quote: GeneratedQuote) => void;
  resetQuote: () => void;
}

/* ======================================================
   DEFAULT STATE
====================================================== */

const defaultQuoteData: QuoteData = {
  model: null,
  selectedOptions: [],
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerAddress: '',
  customerMessage: '',
};

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

/* ======================================================
   HOOK
====================================================== */

export const useQuote = () => {
  const context = useContext(QuoteContext);
  if (!context) {
    throw new Error('useQuote must be used within a QuoteProvider');
  }
  return context;
};

/* ======================================================
   PROVIDER
====================================================== */

export const QuoteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [quoteData, setQuoteData] = useState<QuoteData>(defaultQuoteData);
  const [generatedQuote, setGeneratedQuote] = useState<GeneratedQuote | null>(null);

  /* ============================
     MODEL
  ============================ */

  const setSelectedModel = (model: Model) => {
    setQuoteData({
      ...defaultQuoteData,
      model,
    });
    setGeneratedQuote(null);
  };

  /* ============================
     OPTIONS
  ============================ */

  const toggleOption = (option: ModelOption) => {
    setQuoteData(prev => {
      const exists = prev.selectedOptions.some(o => o.id === option.id);

      if (exists) {
        return {
          ...prev,
          selectedOptions: prev.selectedOptions.filter(o => o.id !== option.id),
        };
      }

      return {
        ...prev,
        selectedOptions: [...prev.selectedOptions, option],
      };
    });
  };

  /* ============================
     CUSTOMER
  ============================ */

  const setCustomerDetails = (details: Partial<QuoteData>) => {
    setQuoteData(prev => ({
      ...prev,
      ...details,
    }));
  };

  /* ============================
     CALCULATIONS
  ============================ */

  const calculateOptionsTotal = () => {
    return quoteData.selectedOptions.reduce((sum, opt) => sum + Number(opt.price || 0), 0);
  };

  const calculateTotal = () => {
    const base = Number(quoteData.model?.base_price ?? 0);
    return base + calculateOptionsTotal();
  };

  /* ============================
     RESET
  ============================ */

  const resetQuote = () => {
    setQuoteData(defaultQuoteData);
    setGeneratedQuote(null);
  };

  /* ============================
     CONTEXT VALUE
  ============================ */

  return (
    <QuoteContext.Provider
      value={{
        quoteData,
        generatedQuote,

        setSelectedModel,
        toggleOption,
        setCustomerDetails,

        calculateOptionsTotal,
        calculateTotal,

        setGeneratedQuote,
        resetQuote,
      }}
    >
      {children}
    </QuoteContext.Provider>
  );
};
