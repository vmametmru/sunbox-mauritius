import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, User, Mail, Phone, MapPin, MessageSquare, Loader2, Home, Waves } from 'lucide-react';
import { useQuote, GeneratedQuote } from '@/contexts/QuoteContext';
import { api } from '@/lib/api';
import ConstructionBanner from "@/components/ConstructionBanner";
import { useSiteSettings } from "@/hooks/use-site-settings";

const DetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { quoteData, setCustomerDetails, calculateTotal, setGeneratedQuote } = useQuote();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!quoteData.model) {
      navigate('/');
    }
  }, [quoteData.model, navigate]);

  if (!quoteData.model) {
    return null;
  }

  const model = quoteData.model;
  const optionsTotal = quoteData.selectedOptions.reduce((sum, opt) => sum + opt.price, 0);
  const { data: siteSettings } = useSiteSettings();
const underConstruction = siteSettings?.site_under_construction === "true";
const ucMessage =
  siteSettings?.under_construction_message ||
  "🚧 Page en construction — merci de revenir ultérieurement.";

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!quoteData.customerName.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!quoteData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quoteData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!quoteData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Submit to MySQL database via edge function
      const result = await api.query('submit_quote', {
        productType: model.category,
        modelId: model.id,
        modelName: model.name,
        selectedOptions: quoteData.selectedOptions.map(opt => ({
          id: opt.id,
          name: opt.name,
          price: opt.price,
          category: opt.category
        })),
        calculatedPrice: calculateTotal(),
        basePrice: model.basePrice,
        customerName: quoteData.customerName,
        email: quoteData.email,
        phone: quoteData.phone,
        location: quoteData.location || null,
        message: quoteData.message || null
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to submit quote');
      }

      // Create the generated quote object
      const generatedQuote: GeneratedQuote = {
        id: result.data.quote?.id,
        referenceNumber: result.data.quote?.referenceNumber || result.data.referenceNumber,
        model: model,
        selectedOptions: quoteData.selectedOptions,
        basePrice: model.basePrice,
        optionsTotal: optionsTotal,
        totalPrice: calculateTotal(),
        customerName: quoteData.customerName,
        email: quoteData.email,
        phone: quoteData.phone,
        location: quoteData.location,
        message: quoteData.message,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      setGeneratedQuote(generatedQuote);
      navigate('/quote');
    } catch (err: any) {
      console.error('Quote submission error:', err);
      setErrors({ submit: err.message || 'Failed to submit quote. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (

    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/configure')}
              className="flex items-center gap-2 text-gray-600 hover:text-[#1A365D] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Options</span>
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
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-900">Select Model</span>
            </div>
            <div className="w-12 h-0.5 bg-green-500"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-900">Configure Options</span>
            </div>
            <div className="w-12 h-0.5 bg-[#ED8936]"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#ED8936] text-white rounded-full flex items-center justify-center font-semibold">
                3
              </div>
              <span className="text-sm font-medium text-gray-900">Your Details</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold">
                4
              </div>
              <span className="text-sm font-medium text-gray-400">View Quote</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-[#1A365D] mb-2">
                Your Contact Details
              </h2>
              <p className="text-gray-600 mb-6">
                Please provide your details so we can send you the quote and follow up on your project.
              </p>

              {errors.submit && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {errors.submit}
                </div>
              )}

              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={quoteData.customerName}
                      onChange={(e) => setCustomerDetails({ customerName: e.target.value })}
                      className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#ED8936] focus:border-transparent ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="John Doe"
                    />
                  </div>
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={quoteData.email}
                      onChange={(e) => setCustomerDetails({ email: e.target.value })}
                      className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#ED8936] focus:border-transparent ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="john@example.com"
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={quoteData.phone}
                      onChange={(e) => setCustomerDetails({ phone: e.target.value })}
                      className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#ED8936] focus:border-transparent ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="+230 5XXX XXXX"
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={quoteData.location}
                      onChange={(e) => setCustomerDetails({ location: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED8936] focus:border-transparent"
                      placeholder="Grand Baie, Mauritius"
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                    <textarea
                      value={quoteData.message}
                      onChange={(e) => setCustomerDetails({ message: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ED8936] focus:border-transparent"
                      rows={4}
                      placeholder="Tell us more about your project, timeline, or any specific requirements..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
              {/* Model Info */}
              <div className="flex items-start gap-4 pb-6 border-b">
                <img 
                  src={model.image} 
                  alt={model.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
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
                  <h3 className="font-bold text-[#1A365D]">{model.name}</h3>
                  <p className="text-sm text-gray-500">
                    {model.specs.dimensions || model.specs.size}
                  </p>
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
                        <p className="text-sm font-medium text-gray-700 mb-2">Selected Options ({quoteData.selectedOptions.length}):</p>
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
                  *Final price may vary based on site conditions
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-[#ED8936] hover:bg-[#DD6B20] disabled:bg-gray-400 text-white py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating Quote...
                    </>
                  ) : (
                    <>
                      Generate Quote
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                <button
                  onClick={() => navigate('/configure')}
                  disabled={isSubmitting}
                  className="w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 text-gray-700 py-3 rounded-lg font-medium transition-colors"
                >
                  Back to Options
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailsPage;
