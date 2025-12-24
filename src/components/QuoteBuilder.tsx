import React, { useState } from 'react';
import { Home, Waves, ChevronRight, ChevronLeft, Check, Calculator, User, Mail, Phone, MapPin, Loader2, Copy, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface QuoteData {
  productType: 'container' | 'pool' | null;
  containerSize: string;
  containerFeatures: string[];
  poolSize: string;
  poolType: string;

  poolFeatures: string[];
  name: string;
  email: string;
  phone: string;
  location: string;
  message: string;
}

interface QuoteResult {
  referenceNumber: string;
  calculatedPrice: number;
  emailSent: boolean;
}

const containerSizes = [
  { id: '20ft', name: '20ft Container', price: 25000, sqm: '15 m²', description: 'Perfect for studio or office' },
  { id: '40ft', name: '40ft Container', price: 45000, sqm: '30 m²', description: 'Ideal for 1-2 bedroom home' },
  { id: '40ft-hc', name: '40ft High Cube', price: 52000, sqm: '30 m²', description: 'Extra height for spacious living' },
  { id: 'double', name: 'Double Stack', price: 85000, sqm: '60 m²', description: 'Two-story modern living' },
];

const containerFeatures = [
  { id: 'solar', name: 'Solar Panels', price: 8000 },
  { id: 'ac', name: 'Air Conditioning', price: 3500 },
  { id: 'kitchen', name: 'Full Kitchen', price: 12000 },
  { id: 'bathroom', name: 'Bathroom Suite', price: 8500 },
  { id: 'deck', name: 'Wooden Deck', price: 5000 },
  { id: 'insulation', name: 'Premium Insulation', price: 4000 },
  { id: 'windows', name: 'Panoramic Windows', price: 6500 },
  { id: 'smart', name: 'Smart Home System', price: 7500 },
];

const poolSizes = [
  { id: 'small', name: 'Compact Pool', dimensions: '4m x 2.5m', price: 18000, description: 'Perfect for small gardens' },
  { id: 'medium', name: 'Family Pool', dimensions: '6m x 3m', price: 28000, description: 'Ideal for families' },
  { id: 'large', name: 'Luxury Pool', dimensions: '8m x 4m', price: 42000, description: 'Spacious swimming experience' },
  { id: 'xl', name: 'Resort Pool', dimensions: '12m x 5m', price: 65000, description: 'Ultimate luxury' },
];

const poolTypes = [
  { id: 'concrete', name: 'Concrete Pool', priceMultiplier: 1 },
  { id: 'fiberglass', name: 'Fiberglass Pool', priceMultiplier: 0.85 },
  { id: 'vinyl', name: 'Vinyl Liner Pool', priceMultiplier: 0.7 },
  { id: 'container', name: 'Container Pool', priceMultiplier: 0.9 },
];

const poolFeatures = [
  { id: 'heating', name: 'Pool Heating', price: 5500 },
  { id: 'lighting', name: 'LED Lighting', price: 2500 },
  { id: 'jets', name: 'Massage Jets', price: 4000 },
  { id: 'cover', name: 'Automatic Cover', price: 8000 },
  { id: 'infinity', name: 'Infinity Edge', price: 12000 },
  { id: 'saltwater', name: 'Saltwater System', price: 3500 },
  { id: 'waterfall', name: 'Waterfall Feature', price: 6000 },
  { id: 'deck', name: 'Pool Deck', price: 9000 },
];

interface QuoteBuilderProps {
  isOpen: boolean;
  onClose: () => void;
}

const QuoteBuilder: React.FC<QuoteBuilderProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [quoteData, setQuoteData] = useState<QuoteData>({
    productType: null,
    containerSize: '',
    containerFeatures: [],
    poolSize: '',
    poolType: 'concrete',
    poolFeatures: [],
    name: '',
    email: '',
    phone: '',
    location: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const calculateTotal = () => {
    let total = 0;
    
    if (quoteData.productType === 'container') {
      const size = containerSizes.find(s => s.id === quoteData.containerSize);
      if (size) total += size.price;
      quoteData.containerFeatures.forEach(f => {
        const feature = containerFeatures.find(cf => cf.id === f);
        if (feature) total += feature.price;
      });
    } else if (quoteData.productType === 'pool') {
      const size = poolSizes.find(s => s.id === quoteData.poolSize);
      const type = poolTypes.find(t => t.id === quoteData.poolType);
      if (size && type) total += size.price * type.priceMultiplier;
      quoteData.poolFeatures.forEach(f => {
        const feature = poolFeatures.find(pf => pf.id === f);
        if (feature) total += feature.price;
      });
    }
    
    return total;
  };

  const toggleFeature = (featureId: string, type: 'container' | 'pool') => {
    if (type === 'container') {
      setQuoteData(prev => ({
        ...prev,
        containerFeatures: prev.containerFeatures.includes(featureId)
          ? prev.containerFeatures.filter(f => f !== featureId)
          : [...prev.containerFeatures, featureId]
      }));
    } else {
      setQuoteData(prev => ({
        ...prev,
        poolFeatures: prev.poolFeatures.includes(featureId)
          ? prev.poolFeatures.filter(f => f !== featureId)
          : [...prev.poolFeatures, featureId]
      }));
    }
  };

  const buildSelectedOptions = () => {
    if (quoteData.productType === 'container') {
      const size = containerSizes.find(s => s.id === quoteData.containerSize);
      const features = quoteData.containerFeatures.map(f => {
        const feature = containerFeatures.find(cf => cf.id === f);
        return feature ? { id: f, name: feature.name, price: feature.price } : null;
      }).filter(Boolean);
      
      return {
        size: size ? { id: size.id, name: size.name, price: size.price, sqm: size.sqm } : null,
        features
      };
    } else {
      const size = poolSizes.find(s => s.id === quoteData.poolSize);
      const type = poolTypes.find(t => t.id === quoteData.poolType);
      const features = quoteData.poolFeatures.map(f => {
        const feature = poolFeatures.find(pf => pf.id === f);
        return feature ? { id: f, name: feature.name, price: feature.price } : null;
      }).filter(Boolean);
      
      return {
        size: size ? { id: size.id, name: size.name, dimensions: size.dimensions, price: size.price } : null,
        type: type ? { id: type.id, name: type.name, priceMultiplier: type.priceMultiplier } : null,
        features
      };
    }
  };
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const selectedOptions = buildSelectedOptions();
      const calculatedPrice = calculateTotal();
      
      // Get model name based on selection
      let modelName = '';
      let basePrice = 0;
      let optionsTotal = 0;
      
      if (quoteData.productType === 'container') {
        const size = containerSizes.find(s => s.id === quoteData.containerSize);
        modelName = size?.name || 'Container Home';
        basePrice = size?.price || 0;
        optionsTotal = quoteData.containerFeatures.reduce((sum, f) => {
          const feature = containerFeatures.find(cf => cf.id === f);
          return sum + (feature?.price || 0);
        }, 0);
      } else {
        const size = poolSizes.find(s => s.id === quoteData.poolSize);
        const type = poolTypes.find(t => t.id === quoteData.poolType);
        modelName = `${size?.name || 'Pool'} - ${type?.name || 'Concrete'}`;
        basePrice = (size?.price || 0) * (type?.priceMultiplier || 1);
        optionsTotal = quoteData.poolFeatures.reduce((sum, f) => {
          const feature = poolFeatures.find(pf => pf.id === f);
          return sum + (feature?.price || 0);
        }, 0);
      }

      // Create quote via API
      const result = await api.createQuote({
        model_name: modelName,
        model_type: quoteData.productType as 'container' | 'pool',
        base_price: basePrice,
        options_total: optionsTotal,
        total_price: calculatedPrice,
        customer_name: quoteData.name,
        customer_email: quoteData.email,
        customer_phone: quoteData.phone,
        customer_address: quoteData.location || undefined,
        customer_message: quoteData.message || undefined,
        options: quoteData.productType === 'container' 
          ? quoteData.containerFeatures.map(f => {
              const feature = containerFeatures.find(cf => cf.id === f);
              return { name: feature?.name || f, price: feature?.price || 0 };
            })
          : quoteData.poolFeatures.map(f => {
              const feature = poolFeatures.find(pf => pf.id === f);
              return { name: feature?.name || f, price: feature?.price || 0 };
            })
      });

      setQuoteResult({
        referenceNumber: result.reference || result.id?.toString() || 'N/A',
        calculatedPrice: calculatedPrice,
        emailSent: false // Will be handled separately
      });
      setSubmitted(true);
      
      // Try to send confirmation email
      try {
        await api.sendTemplateEmail({
          to: quoteData.email,
          template_key: 'quote_confirmation',
          data: {
            customer_name: quoteData.name,
            reference: result.reference,
            model_name: modelName,
            base_price: basePrice.toLocaleString(),
            options_total: optionsTotal.toLocaleString(),
            total_price: calculatedPrice.toLocaleString(),
            valid_until: result.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
          }
        });
        setQuoteResult(prev => prev ? { ...prev, emailSent: true } : null);
      } catch (emailErr) {
        console.log('Email not sent:', emailErr);
      }
      
    } catch (err: any) {
      console.error('Quote submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyReferenceNumber = () => {
    if (quoteResult?.referenceNumber) {
      navigator.clipboard.writeText(quoteResult.referenceNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };


  const resetQuote = () => {
    setStep(1);
    setQuoteData({
      productType: null,
      containerSize: '',
      containerFeatures: [],
      poolSize: '',
      poolType: 'concrete',
      poolFeatures: [],
      name: '',
      email: '',
      phone: '',
      location: '',
      message: '',
    });
    setSubmitted(false);
    setQuoteResult(null);
    setError(null);
  };

  const canProceed = () => {
    switch (step) {
      case 1: return quoteData.productType !== null;
      case 2: return quoteData.productType === 'container' ? quoteData.containerSize !== '' : quoteData.poolSize !== '';
      case 3: return true;
      case 4: return quoteData.name && quoteData.email && quoteData.phone;
      default: return true;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1A365D] to-[#2D4A7C] text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Create Your Quote</h2>
              <p className="text-blue-200 mt-1">{submitted ? 'Quote Submitted!' : `Step ${step} of 4`}</p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">&times;</button>
          </div>
          {/* Progress Bar */}
          {!submitted && (
            <div className="mt-4 flex gap-2">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={`h-2 flex-1 rounded-full transition-all ${s <= step ? 'bg-[#ED8936]' : 'bg-white/30'}`} />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {submitted && quoteResult ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Quote Request Submitted!</h3>
              <p className="text-gray-600 mb-6">
                {quoteResult.emailSent 
                  ? `A confirmation email has been sent to ${quoteData.email}`
                  : 'Your quote has been saved. Our team will contact you shortly.'}
              </p>
              
              {/* Reference Number */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6 max-w-md mx-auto">
                <p className="text-sm text-gray-500 mb-2">Your Quote Reference Number</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl font-bold text-[#1A365D] font-mono">
                    {quoteResult.referenceNumber}
                  </span>
                  <button
                    onClick={copyReferenceNumber}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Copy reference number"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Save this number for tracking your quote</p>
              </div>

              <p className="text-3xl font-bold text-[#1A365D] mb-6">
                Estimated Total: €{quoteResult.calculatedPrice.toLocaleString()}
              </p>

              <div className="bg-blue-50 rounded-lg p-4 mb-6 max-w-md mx-auto text-left">
                <h4 className="font-semibold text-[#1A365D] mb-2">What happens next?</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Our team will review your quote within 24 hours</li>
                  <li>• We'll contact you to discuss your requirements</li>
                  <li>• A detailed proposal will be sent to your email</li>
                </ul>
              </div>

              <button
                onClick={resetQuote}
                className="bg-[#ED8936] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#DD7826] transition-colors"
              >
                Create Another Quote
              </button>
            </div>
          ) : (
            <>
              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              {/* Step 1: Product Selection */}
              {step === 1 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-6">What would you like to build?</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <button
                      onClick={() => setQuoteData(prev => ({ ...prev, productType: 'container' }))}
                      className={`p-8 rounded-xl border-2 transition-all text-left ${
                        quoteData.productType === 'container'
                          ? 'border-[#ED8936] bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Home className={`w-12 h-12 mb-4 ${quoteData.productType === 'container' ? 'text-[#ED8936]' : 'text-gray-400'}`} />
                      <h4 className="text-lg font-semibold text-gray-800">Container Home</h4>
                      <p className="text-gray-600 mt-2">Modern, sustainable living spaces built from shipping containers</p>
                      <p className="text-[#1A365D] font-semibold mt-4">Starting from €25,000</p>
                    </button>
                    <button
                      onClick={() => setQuoteData(prev => ({ ...prev, productType: 'pool' }))}
                      className={`p-8 rounded-xl border-2 transition-all text-left ${
                        quoteData.productType === 'pool'
                          ? 'border-[#ED8936] bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Waves className={`w-12 h-12 mb-4 ${quoteData.productType === 'pool' ? 'text-[#ED8936]' : 'text-gray-400'}`} />
                      <h4 className="text-lg font-semibold text-gray-800">Swimming Pool</h4>
                      <p className="text-gray-600 mt-2">Custom pools designed for the tropical Mauritius climate</p>
                      <p className="text-[#1A365D] font-semibold mt-4">Starting from €18,000</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Size Selection */}
              {step === 2 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-6">
                    {quoteData.productType === 'container' ? 'Select Container Size' : 'Select Pool Size'}
                  </h3>
                  
                  {quoteData.productType === 'container' ? (
                    <div className="grid md:grid-cols-2 gap-4">
                      {containerSizes.map(size => (
                        <button
                          key={size.id}
                          onClick={() => setQuoteData(prev => ({ ...prev, containerSize: size.id }))}
                          className={`p-6 rounded-xl border-2 transition-all text-left ${
                            quoteData.containerSize === size.id
                              ? 'border-[#ED8936] bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-gray-800">{size.name}</h4>
                              <p className="text-sm text-gray-500">{size.sqm}</p>
                            </div>
                            <span className="text-[#1A365D] font-bold">€{size.price.toLocaleString()}</span>
                          </div>
                          <p className="text-gray-600 text-sm mt-2">{size.description}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="grid md:grid-cols-2 gap-4 mb-6">
                        {poolSizes.map(size => (
                          <button
                            key={size.id}
                            onClick={() => setQuoteData(prev => ({ ...prev, poolSize: size.id }))}
                            className={`p-6 rounded-xl border-2 transition-all text-left ${
                              quoteData.poolSize === size.id
                                ? 'border-[#ED8936] bg-orange-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-gray-800">{size.name}</h4>
                                <p className="text-sm text-gray-500">{size.dimensions}</p>
                              </div>
                              <span className="text-[#1A365D] font-bold">€{size.price.toLocaleString()}</span>
                            </div>
                            <p className="text-gray-600 text-sm mt-2">{size.description}</p>
                          </button>
                        ))}
                      </div>
                      
                      <h4 className="font-semibold text-gray-800 mb-3">Pool Type</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {poolTypes.map(type => (
                          <button
                            key={type.id}
                            onClick={() => setQuoteData(prev => ({ ...prev, poolType: type.id }))}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              quoteData.poolType === type.id
                                ? 'border-[#ED8936] bg-orange-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span className="text-sm font-medium text-gray-800">{type.name}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 3: Features */}
              {step === 3 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-6">Select Additional Features</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {(quoteData.productType === 'container' ? containerFeatures : poolFeatures).map(feature => (
                      <button
                        key={feature.id}
                        onClick={() => toggleFeature(feature.id, quoteData.productType!)}
                        className={`p-4 rounded-lg border-2 transition-all flex justify-between items-center ${
                          (quoteData.productType === 'container' ? quoteData.containerFeatures : quoteData.poolFeatures).includes(feature.id)
                            ? 'border-[#ED8936] bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="font-medium text-gray-800">{feature.name}</span>
                        <span className="text-[#1A365D] font-semibold">+€{feature.price.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Contact Details */}
              {step === 4 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-6">Your Contact Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={quoteData.name}
                          onChange={e => setQuoteData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED8936] focus:border-transparent"
                          placeholder="John Doe"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={quoteData.email}
                          onChange={e => setQuoteData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED8936] focus:border-transparent"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          value={quoteData.phone}
                          onChange={e => setQuoteData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED8936] focus:border-transparent"
                          placeholder="+230 5XXX XXXX"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Project Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={quoteData.location}
                          onChange={e => setQuoteData(prev => ({ ...prev, location: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED8936] focus:border-transparent"
                          placeholder="Grand Baie, Mauritius"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                      <textarea
                        value={quoteData.message}
                        onChange={e => setQuoteData(prev => ({ ...prev, message: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED8936] focus:border-transparent"
                        rows={3}
                        placeholder="Tell us more about your project..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex justify-between items-center">
              <div>
                {step > 1 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                    disabled={isSubmitting}
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Back
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-6">
                {calculateTotal() > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Estimated Total</p>
                    <p className="text-2xl font-bold text-[#1A365D]">€{calculateTotal().toLocaleString()}</p>
                  </div>
                )}
                
                {step < 4 ? (
                  <button
                    onClick={() => setStep(step + 1)}
                    disabled={!canProceed()}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                      canProceed()
                        ? 'bg-[#ED8936] text-white hover:bg-[#DD7826]'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Continue
                    <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={!canProceed() || isSubmitting}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                      canProceed() && !isSubmitting
                        ? 'bg-[#ED8936] text-white hover:bg-[#DD7826]'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Calculator className="w-5 h-5" />
                        Get My Quote
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteBuilder;
