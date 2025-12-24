import React, { useState } from 'react';
import { Check, Home, Waves, Sparkles } from 'lucide-react';

interface Package {
  name: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
}

const containerPackages: Package[] = [
  {
    name: 'Starter',
    price: '25,000',
    description: '20ft container - Perfect for studio or office',
    features: [
      '20ft shipping container',
      'Basic insulation',
      'Electrical wiring',
      'Single door & window',
      'Interior painting',
      'Delivery & installation'
    ]
  },
  {
    name: 'Family',
    price: '52,000',
    description: '40ft High Cube - Ideal for family living',
    features: [
      '40ft High Cube container',
      'Premium insulation',
      'Full electrical system',
      'Panoramic windows',
      'Full kitchen setup',
      'Bathroom with fixtures',
      'Wooden deck',
      'Air conditioning'
    ],
    popular: true
  },
  {
    name: 'Luxury',
    price: '95,000',
    description: 'Double Stack - Ultimate modern living',
    features: [
      'Two 40ft containers stacked',
      'Premium everything',
      'Smart home system',
      'Solar panel integration',
      'Full kitchen & 2 bathrooms',
      'Master bedroom suite',
      'Rooftop terrace',
      'Landscaping included',
      '5-year warranty'
    ]
  }
];

const poolPackages: Package[] = [
  {
    name: 'Essential',
    price: '18,000',
    description: 'Compact Pool (4m x 2.5m)',
    features: [
      'Concrete pool construction',
      'Standard filtration system',
      'Basic tiling',
      'Pool ladder',
      'Water filling',
      '2-year warranty'
    ]
  },
  {
    name: 'Premium',
    price: '35,000',
    description: 'Family Pool (6m x 3m)',
    features: [
      'Reinforced concrete pool',
      'Advanced filtration',
      'Premium mosaic tiles',
      'LED underwater lighting',
      'Pool heating system',
      'Automatic cover',
      'Pool deck (10m²)',
      '3-year warranty'
    ],
    popular: true
  },
  {
    name: 'Resort',
    price: '75,000',
    description: 'Luxury Pool (10m x 4m)',
    features: [
      'Infinity edge design',
      'Premium everything',
      'Saltwater system',
      'Massage jets',
      'Waterfall feature',
      'Full pool deck (25m²)',
      'Tropical landscaping',
      'Smart pool controls',
      '5-year warranty'
    ]
  }
];

interface PricingPackagesProps {
  onGetQuote: () => void;
}

const PricingPackages: React.FC<PricingPackagesProps> = ({ onGetQuote }) => {
  const [activeTab, setActiveTab] = useState<'container' | 'pool'>('container');
  
  const packages = activeTab === 'container' ? containerPackages : poolPackages;

  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-[#1A365D] mb-4">Transparent Pricing</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose a package that fits your needs, or customize your own
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-12">
          <div className="bg-white p-2 rounded-full shadow-lg inline-flex">
            <button
              onClick={() => setActiveTab('container')}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all ${
                activeTab === 'container'
                  ? 'bg-[#1A365D] text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Home className="w-5 h-5" />
              Container Homes
            </button>
            <button
              onClick={() => setActiveTab('pool')}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all ${
                activeTab === 'pool'
                  ? 'bg-[#1A365D] text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Waves className="w-5 h-5" />
              Swimming Pools
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {packages.map((pkg, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl overflow-hidden transition-all duration-300 ${
                pkg.popular
                  ? 'shadow-2xl scale-105 border-2 border-[#ED8936]'
                  : 'shadow-lg hover:shadow-xl'
              }`}
            >
              {pkg.popular && (
                <div className="absolute top-0 right-0 bg-[#ED8936] text-white px-4 py-1 rounded-bl-lg font-semibold text-sm flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  Most Popular
                </div>
              )}
              
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{pkg.name}</h3>
                <p className="text-gray-500 mb-6">{pkg.description}</p>
                
                <div className="mb-6">
                  <span className="text-sm text-gray-500">Starting from</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[#1A365D]">€{pkg.price}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onGetQuote}
                  className={`w-full py-4 rounded-lg font-semibold transition-colors ${
                    pkg.popular
                      ? 'bg-[#ED8936] text-white hover:bg-[#DD7826]'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  Get Custom Quote
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Custom Quote Note */}
        <div className="text-center mt-12">
          <p className="text-gray-600">
            Need something different? 
            <button onClick={onGetQuote} className="text-[#ED8936] font-semibold ml-2 hover:underline">
              Create a fully customized quote
            </button>
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingPackages;
