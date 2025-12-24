import React from 'react';
import { ArrowRight, Check, Home, Waves } from 'lucide-react';

interface ProductShowcaseProps {
  onOpenQuote: () => void;
}

const ProductShowcase: React.FC<ProductShowcaseProps> = ({ onOpenQuote }) => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Container Homes Section */}
        <div id="container" className="grid lg:grid-cols-2 gap-12 items-center mb-24">
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 bg-[#1A365D]/10 px-4 py-2 rounded-full mb-6">
              <Home className="w-4 h-4 text-[#1A365D]" />
              <span className="text-[#1A365D] font-medium">Container Homes</span>
            </div>
            <h2 className="text-4xl font-bold text-[#1A365D] mb-6">
              Modern Living in Sustainable Style
            </h2>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              Our container homes combine industrial aesthetics with modern comfort. 
              Built from recycled shipping containers, these eco-friendly homes are 
              perfect for the Mauritius climate and can be customized to your exact specifications.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                'Quick 8-12 week build time',
                'Fully customizable layouts',
                'Solar panel integration',
                'Hurricane-resistant design',
                'Smart home compatible',
                'Eco-friendly materials'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onOpenQuote}
                className="bg-[#1A365D] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#2D4A7C] transition-colors flex items-center justify-center gap-2"
              >
                Configure Your Home
                <ArrowRight className="w-5 h-5" />
              </button>
              <div className="text-center sm:text-left">
                <p className="text-sm text-gray-500">Starting from</p>
                <p className="text-2xl font-bold text-[#1A365D]">€25,000</p>
              </div>
            </div>
          </div>
          
          <div className="order-1 lg:order-2 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765979501439_a64eda3d.jpg"
                alt="Container Home"
                className="w-full h-96 object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl p-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#ED8936] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">40</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Container Size</p>
                  <p className="font-bold text-gray-800">40ft High Cube</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Swimming Pools Section */}
        <div id="pool" className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765979414636_574096eb.png"
                alt="Swimming Pool"
                className="w-full h-96 object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-white rounded-xl p-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#1A365D] rounded-lg flex items-center justify-center">
                  <Waves className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pool Type</p>
                  <p className="font-bold text-gray-800">Infinity Edge</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <div className="inline-flex items-center gap-2 bg-[#ED8936]/10 px-4 py-2 rounded-full mb-6">
              <Waves className="w-4 h-4 text-[#ED8936]" />
              <span className="text-[#ED8936] font-medium">Swimming Pools</span>
            </div>
            <h2 className="text-4xl font-bold text-[#1A365D] mb-6">
              Your Personal Paradise Awaits
            </h2>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              Create the ultimate backyard retreat with our custom swimming pools. 
              From compact plunge pools to resort-style infinity edges, we design 
              and build pools that perfectly complement the tropical Mauritius lifestyle.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                '4-6 week installation',
                'Multiple pool types',
                'LED lighting systems',
                'Saltwater options',
                'Heating systems',
                'Automatic covers'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onOpenQuote}
                className="bg-[#ED8936] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#DD7826] transition-colors flex items-center justify-center gap-2"
              >
                Design Your Pool
                <ArrowRight className="w-5 h-5" />
              </button>
              <div className="text-center sm:text-left">
                <p className="text-sm text-gray-500">Starting from</p>
                <p className="text-2xl font-bold text-[#ED8936]">€18,000</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductShowcase;
