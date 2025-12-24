import React, { createContext, useContext, useState, ReactNode } from 'react';

// Model types
export interface Model {
  id: string;
  name: string;
  category: 'container' | 'pool';
  description: string;
  basePrice: number;
  image: string;
  floorPlan: string;
  specs: {
    size?: string;
    dimensions?: string;
    bedrooms?: number;
    bathrooms?: number;
    sqm?: number;
    depth?: string;
  };
  features: string[];
}

export interface ModelOption {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
}

export interface QuoteData {
  model: Model | null;
  selectedOptions: ModelOption[];
  customerName: string;
  email: string;
  phone: string;
  location: string;
  message: string;
}

export interface GeneratedQuote {
  id?: number;
  referenceNumber: string;
  model: Model;
  selectedOptions: ModelOption[];
  basePrice: number;
  optionsTotal: number;
  totalPrice: number;
  customerName: string;
  email: string;
  phone: string;
  location: string;
  message: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'declined';
}


interface QuoteContextType {
  quoteData: QuoteData;
  generatedQuote: GeneratedQuote | null;
  setSelectedModel: (model: Model) => void;
  toggleOption: (option: ModelOption) => void;
  setCustomerDetails: (details: Partial<QuoteData>) => void;
  calculateTotal: () => number;
  setGeneratedQuote: (quote: GeneratedQuote) => void;
  resetQuote: () => void;
}

const defaultQuoteData: QuoteData = {
  model: null,
  selectedOptions: [],
  customerName: '',
  email: '',
  phone: '',
  location: '',
  message: '',
};

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export const useQuote = () => {
  const context = useContext(QuoteContext);
  if (!context) {
    throw new Error('useQuote must be used within a QuoteProvider');
  }
  return context;
};

export const QuoteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [quoteData, setQuoteData] = useState<QuoteData>(defaultQuoteData);
  const [generatedQuote, setGeneratedQuote] = useState<GeneratedQuote | null>(null);

  const setSelectedModel = (model: Model) => {
    setQuoteData(prev => ({ ...prev, model, selectedOptions: [] }));
  };

  const toggleOption = (option: ModelOption) => {
    setQuoteData(prev => {
      const exists = prev.selectedOptions.find(o => o.id === option.id);
      if (exists) {
        return { ...prev, selectedOptions: prev.selectedOptions.filter(o => o.id !== option.id) };
      }
      return { ...prev, selectedOptions: [...prev.selectedOptions, option] };
    });
  };

  const setCustomerDetails = (details: Partial<QuoteData>) => {
    setQuoteData(prev => ({ ...prev, ...details }));
  };

  const calculateTotal = () => {
    const basePrice = quoteData.model?.basePrice || 0;
    const optionsTotal = quoteData.selectedOptions.reduce((sum, opt) => sum + opt.price, 0);
    return basePrice + optionsTotal;
  };

  const resetQuote = () => {
    setQuoteData(defaultQuoteData);
    setGeneratedQuote(null);
  };

  return (
    <QuoteContext.Provider
      value={{
        quoteData,
        generatedQuote,
        setSelectedModel,
        toggleOption,
        setCustomerDetails,
        calculateTotal,
        setGeneratedQuote,
        resetQuote,
      }}
    >
      {children}
    </QuoteContext.Provider>
  );
};
