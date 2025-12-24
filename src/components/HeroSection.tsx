import React from 'react';
import { ArrowRight, Play, Home, Waves, Star } from 'lucide-react';

interface HeroSectionProps {
  onOpenQuote: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onOpenQuote }) => {
  const scrollToGallery = () => {
    const element = document.querySelector('#gallery');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src="https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765979356391_8d98a7c0.jpg"
          alt="Modern Container Home"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1A365D]/95 via-[#1A365D]/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <Star className="w-4 h-4 text-[#ED8936]" />
            <span className="text-white/90 text-sm font-medium">
              #1 Container Home & Pool Builder in Mauritius
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Build Your Dream
            <span className="text-[#ED8936]"> Container Home</span> or
            <span className="text-[#ED8936]"> Pool</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-white/80 mb-8 leading-relaxed">
            Transform shipping containers into stunning modern homes or create your perfect swimming pool. 
            Get an instant quote and bring your vision to life in beautiful Mauritius.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <button
              onClick={onOpenQuote}
              className="bg-[#ED8936] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#DD7826] transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
            >
              Get Your Free Quote
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={scrollToGallery}
              className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/20 transition-colors border border-white/30 flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              View Our Projects
            </button>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-8">
            <div>
              <div className="text-3xl font-bold text-white">150+</div>
              <div className="text-white/60">Projects Completed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">12+</div>
              <div className="text-white/60">Years Experience</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">98%</div>
              <div className="text-white/60">Happy Clients</div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Cards - Floating */}
      <div className="hidden xl:block absolute right-8 top-1/2 -translate-y-1/2 space-y-4">
        <div
          className="bg-white rounded-2xl p-6 shadow-2xl w-72 cursor-pointer transform hover:scale-105 transition-all"
          onClick={onOpenQuote}
        >
          <div className="w-12 h-12 bg-[#1A365D] rounded-xl flex items-center justify-center mb-4">
            <Home className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Container Homes</h3>
          <p className="text-gray-600 text-sm mb-4">
            Sustainable, modern living spaces starting from €25,000
          </p>
          <span className="text-[#ED8936] font-semibold text-sm flex items-center gap-1">
            Configure Now <ArrowRight className="w-4 h-4" />
          </span>
        </div>

        <div
          className="bg-white rounded-2xl p-6 shadow-2xl w-72 cursor-pointer transform hover:scale-105 transition-all"
          onClick={onOpenQuote}
        >
          <div className="w-12 h-12 bg-[#ED8936] rounded-xl flex items-center justify-center mb-4">
            <Waves className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Swimming Pools</h3>
          <p className="text-gray-600 text-sm mb-4">
            Custom pools for the tropical climate starting from €18,000
          </p>
          <span className="text-[#ED8936] font-semibold text-sm flex items-center gap-1">
            Configure Now <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-8 h-12 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-white/60 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
