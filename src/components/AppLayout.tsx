import React, { useState } from 'react';
import Header from './Header';
import HeroSection from './HeroSection';
import ProductShowcase from './ProductShowcase';
import ProcessSection from './ProcessSection';
import ProjectGallery from './ProjectGallery';
import PricingPackages from './PricingPackages';
import Features from './Features';
import Testimonials from './Testimonials';
import ContactSection from './ContactSection';
import Footer from './Footer';
import QuoteBuilder from './QuoteBuilder';

const AppLayout: React.FC = () => {
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'container' | 'pool'>('all');

  const openQuote = () => setIsQuoteOpen(true);
  const closeQuote = () => setIsQuoteOpen(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Header onOpenQuote={openQuote} />

      {/* Hero Section */}
      <HeroSection onOpenQuote={openQuote} />

      {/* Product Showcase */}
      <ProductShowcase onOpenQuote={openQuote} />

      {/* Process Section */}
      <ProcessSection />

      {/* Project Gallery */}
      <ProjectGallery filter={galleryFilter} onFilterChange={setGalleryFilter} />

      {/* Pricing Packages */}
      <PricingPackages onGetQuote={openQuote} />

      {/* Features */}
      <Features />

      {/* Testimonials */}
      <Testimonials />

      {/* Contact Section */}
      <ContactSection />

      {/* Footer */}
      <Footer />

      {/* Quote Builder Modal */}
      <QuoteBuilder isOpen={isQuoteOpen} onClose={closeQuote} />
    </div>
  );
};

export default AppLayout;
