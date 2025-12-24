import React, { useState, useEffect } from 'react';
import { Menu, X, Phone, Home, Waves, Calculator } from 'lucide-react';

interface HeaderProps {
  onOpenQuote: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenQuote }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', href: '#' },
    { label: 'Container Homes', href: '#container', icon: Home },
    { label: 'Swimming Pools', href: '#pool', icon: Waves },
    { label: 'Projects', href: '#gallery' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Contact', href: '#contact' },
  ];

  const scrollToSection = (href: string) => {
    setIsMobileMenuOpen(false);
    if (href === '#') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white shadow-lg py-2'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="#" onClick={() => scrollToSection('#')} className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              isScrolled ? 'bg-[#ED8936]' : 'bg-white'
            }`}>
              <span className={`font-bold text-xl ${isScrolled ? 'text-white' : 'text-[#1A365D]'}`}>S</span>
            </div>
            <span className={`text-2xl font-bold transition-colors ${
              isScrolled ? 'text-[#1A365D]' : 'text-white'
            }`}>
              Sunbox
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollToSection(link.href)}
                className={`font-medium transition-colors ${
                  isScrolled
                    ? 'text-gray-700 hover:text-[#ED8936]'
                    : 'text-white/90 hover:text-white'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <a
              href="tel:+23052XXXXXX"
              className={`flex items-center gap-2 font-medium transition-colors ${
                isScrolled ? 'text-gray-700 hover:text-[#ED8936]' : 'text-white/90 hover:text-white'
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>+230 5XXX XXXX</span>
            </a>
            <button
              onClick={onOpenQuote}
              className="bg-[#ED8936] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[#DD7826] transition-colors flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Get Quote
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              isScrolled ? 'text-gray-700' : 'text-white'
            }`}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-4">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => scrollToSection(link.href)}
                  className={`text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    isScrolled
                      ? 'text-gray-700 hover:bg-gray-100'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenQuote();
                }}
                className="mt-4 bg-[#ED8936] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#DD7826] transition-colors flex items-center justify-center gap-2"
              >
                <Calculator className="w-5 h-5" />
                Get Your Quote
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
