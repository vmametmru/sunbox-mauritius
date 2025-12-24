import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Waves, ArrowRight, Phone, Mail, MapPin, Check, Menu, X, FileText } from 'lucide-react';
import { containerModels, poolModels, allModels } from '@/data/models';
import { useQuote, Model } from '@/contexts/QuoteContext';
import ConstructionBanner from "@/components/ConstructionBanner";
import { useSiteSettings } from "@/hooks/use-site-settings";

const ModelsPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSelectedModel } = useQuote();
  const [filter, setFilter] = useState<'all' | 'container' | 'pool'>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: siteSettings } = useSiteSettings();
const underConstruction = siteSettings?.site_under_construction === "true";
const ucMessage =
  siteSettings?.under_construction_message ||
  "🚧 Page en construction — merci de revenir ultérieurement.";

  const filteredModels = filter === 'all' 
    ? allModels 
    : filter === 'container' 
      ? containerModels 
      : poolModels;

  const handleSelectModel = (model: Model) => {
    setSelectedModel(model);
    navigate('/configure');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#ED8936] to-[#DD6B20] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-[#1A365D]">Sunbox</span>
            </div>
            
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#models" className="text-gray-600 hover:text-[#1A365D] font-medium">Models</a>
              <a href="#about" className="text-gray-600 hover:text-[#1A365D] font-medium">About</a>
              <a href="#contact" className="text-gray-600 hover:text-[#1A365D] font-medium">Contact</a>
            </nav>

            <div className="hidden md:flex items-center gap-4">
              <a href="tel:+23052501234" className="flex items-center gap-2 text-gray-600 hover:text-[#1A365D]">
                <Phone className="w-4 h-4" />
                <span>+230 5250 1234</span>
              </a>
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-4 py-4 space-y-3">
              <a href="#models" className="block text-gray-600 hover:text-[#1A365D] font-medium">Models</a>
              <a href="#about" className="block text-gray-600 hover:text-[#1A365D] font-medium">About</a>
              <a href="#contact" className="block text-gray-600 hover:text-[#1A365D] font-medium">Contact</a>
              <a href="tel:+23052501234" className="flex items-center gap-2 text-[#ED8936]">
                <Phone className="w-4 h-4" />
                <span>+230 5250 1234</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {underConstruction && <ConstructionBanner message={ucMessage} />}

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#1A365D] via-[#2D4A7C] to-[#1A365D] text-white py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              Build Your Dream
              <span className="text-[#ED8936]"> Container Home</span> or
              <span className="text-[#ED8936]"> Swimming Pool</span>
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Select from our range of premium models and customize with options to match your lifestyle. 
              Get an instant quote in minutes.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a 
                href="#models"
                className="bg-[#ED8936] hover:bg-[#DD6B20] text-white px-8 py-4 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                Browse Models
                <ArrowRight className="w-5 h-5" />
              </a>
              <a 
                href="#about"
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg font-semibold transition-colors border border-white/30"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white py-8 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-[#1A365D]">150+</div>
              <div className="text-gray-600">Projects Completed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#1A365D]">12+</div>
              <div className="text-gray-600">Years Experience</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#1A365D]">98%</div>
              <div className="text-gray-600">Client Satisfaction</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#1A365D]">5 Year</div>
              <div className="text-gray-600">Warranty</div>
            </div>
          </div>
        </div>
      </section>

      {/* Models Section */}
      <section id="models" className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#1A365D] mb-4">
              Choose Your Model
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Browse our collection of container homes and swimming pools. 
              Select a model to customize and get your personalized quote.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex justify-center gap-2 mb-12">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-[#1A365D] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              All Models
            </button>
            <button
              onClick={() => setFilter('container')}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                filter === 'container'
                  ? 'bg-[#1A365D] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Home className="w-4 h-4" />
              Container Homes
            </button>
            <button
              onClick={() => setFilter('pool')}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                filter === 'pool'
                  ? 'bg-[#1A365D] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Waves className="w-4 h-4" />
              Swimming Pools
            </button>
          </div>

          {/* Models Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredModels.map((model) => (
              <div 
                key={model.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow group"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img 
                    src={model.image} 
                    alt={model.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      model.category === 'container' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-cyan-100 text-cyan-800'
                    }`}>
                      {model.category === 'container' ? 'Container Home' : 'Swimming Pool'}
                    </span>
                  </div>
                  
                  {/* Floor Plan Thumbnail - Inset */}
                  <div className="absolute bottom-3 right-3 w-16 h-16 rounded-lg overflow-hidden border-2 border-white shadow-lg bg-white">
                    <img 
                      src={model.floorPlan} 
                      alt={`${model.name} floor plan`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                      <FileText className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                  </div>
                </div>
                
                <div className="p-5">
                  <h3 className="text-xl font-bold text-[#1A365D] mb-2">{model.name}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{model.description}</p>
                  
                  {/* Specs */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {model.specs.sqm && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {model.specs.sqm} m²
                      </span>
                    )}
                    {model.specs.bedrooms !== undefined && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {model.specs.bedrooms} Bed
                      </span>
                    )}
                    {model.specs.bathrooms !== undefined && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {model.specs.bathrooms} Bath
                      </span>
                    )}
                    {model.specs.dimensions && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {model.specs.dimensions}
                      </span>
                    )}
                    {model.specs.depth && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        Depth: {model.specs.depth}
                      </span>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-1 mb-4">
                    {model.features.slice(0, 3).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-500" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  {/* Price & CTA */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <p className="text-xs text-gray-500">Starting from</p>
                      <p className="text-2xl font-bold text-[#1A365D]">
                        €{model.basePrice.toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleSelectModel(model)}
                      className="bg-[#ED8936] hover:bg-[#DD6B20] text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                    >
                      Configure
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-[#1A365D] mb-6">
                Why Choose Sunbox Mauritius?
              </h2>
              <p className="text-gray-600 text-lg mb-8">
                We specialize in creating sustainable, modern living spaces and luxury pools 
                tailored to the tropical Mauritius climate. Our team combines innovative design 
                with quality craftsmanship to deliver exceptional results.
              </p>
              <div className="space-y-4">
                {[
                  'Premium quality materials and finishes',
                  'Experienced team with 12+ years in construction',
                  'Full project management from design to completion',
                  'Comprehensive 5-year warranty on all projects',
                  'Sustainable and eco-friendly building practices',
                  'Transparent pricing with no hidden costs'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <img 
                src="https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765980636599_1ccd97e7.jpg"
                alt="Container Home"
                className="rounded-xl shadow-lg"
              />
              <img 
                src="https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765980706271_f4390598.jpg"
                alt="Swimming Pool"
                className="rounded-xl shadow-lg mt-8"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#1A365D] mb-4">
              Get In Touch
            </h2>
            <p className="text-gray-600 text-lg">
              Have questions? Our team is here to help you with your project.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl p-6 text-center shadow-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-[#1A365D]" />
              </div>
              <h3 className="font-semibold text-[#1A365D] mb-2">Phone</h3>
              <a href="tel:+23052501234" className="text-gray-600 hover:text-[#ED8936]">
                +230 5250 1234
              </a>
            </div>
            <div className="bg-white rounded-xl p-6 text-center shadow-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-[#1A365D]" />
              </div>
              <h3 className="font-semibold text-[#1A365D] mb-2">Email</h3>
              <a href="mailto:info@sunbox-mauritius.com" className="text-gray-600 hover:text-[#ED8936]">
                info@sunbox-mauritius.com
              </a>
            </div>
            <div className="bg-white rounded-xl p-6 text-center shadow-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-[#1A365D]" />
              </div>
              <h3 className="font-semibold text-[#1A365D] mb-2">Location</h3>
              <p className="text-gray-600">
                Grand Baie, Mauritius
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A365D] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#ED8936] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <span className="text-xl font-bold">Sunbox</span>
              </div>
              <p className="text-blue-200 text-sm">
                Premium container homes and swimming pools in Mauritius.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Products</h4>
              <ul className="space-y-2 text-blue-200 text-sm">
                <li><a href="#models" className="hover:text-white">Container Homes</a></li>
                <li><a href="#models" className="hover:text-white">Swimming Pools</a></li>
                <li><a href="#models" className="hover:text-white">Custom Projects</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-blue-200 text-sm">
                <li><a href="#about" className="hover:text-white">About Us</a></li>
                <li><a href="#contact" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-blue-200 text-sm">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-blue-800 mt-8 pt-8 text-center text-blue-200 text-sm">
            © {new Date().getFullYear()} Sunbox Mauritius. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ModelsPage;
