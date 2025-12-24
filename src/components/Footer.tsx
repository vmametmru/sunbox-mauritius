import React from 'react';
import { Home, Waves, MapPin, Phone, Mail, ArrowUp } from 'lucide-react';

const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#0F1F3D] text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-[#ED8936] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <span className="text-2xl font-bold">Sunbox</span>
            </div>
            <p className="text-gray-400 mb-6">
              Transforming dreams into reality with innovative container homes and stunning swimming pools across Mauritius.
            </p>
            <div className="flex gap-4">
              {['facebook', 'instagram', 'linkedin', 'youtube'].map((social) => (
                <a
                  key={social}
                  href={`#${social}`}
                  className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#ED8936] transition-colors"
                >
                  <span className="sr-only">{social}</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    {social === 'facebook' && (
                      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                    )}
                    {social === 'instagram' && (
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    )}
                    {social === 'linkedin' && (
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    )}
                    {social === 'youtube' && (
                      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    )}
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Products */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Our Products</h4>
            <ul className="space-y-4">
              <li>
                <a href="#" className="text-gray-400 hover:text-[#ED8936] transition-colors flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Container Homes
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#ED8936] transition-colors flex items-center gap-2">
                  <Waves className="w-4 h-4" />
                  Swimming Pools
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#ED8936] transition-colors">
                  Container Offices
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#ED8936] transition-colors">
                  Pool Renovations
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#ED8936] transition-colors">
                  Custom Projects
                </a>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Quick Links</h4>
            <ul className="space-y-4">
              <li>
                <a href="#" className="text-gray-400 hover:text-[#ED8936] transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#gallery" className="text-gray-400 hover:text-[#ED8936] transition-colors">
                  Our Projects
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-gray-400 hover:text-[#ED8936] transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#contact" className="text-gray-400 hover:text-[#ED8936] transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#ED8936] transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-[#ED8936] transition-colors">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#ED8936] flex-shrink-0 mt-0.5" />
                <span className="text-gray-400">
                  Royal Road, Grand Baie<br />
                  Mauritius
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#ED8936] flex-shrink-0" />
                <a href="tel:+23052XXXXXX" className="text-gray-400 hover:text-[#ED8936] transition-colors">
                  +230 5XXX XXXX
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#ED8936] flex-shrink-0" />
                <a href="mailto:info@sunbox-mauritius.com" className="text-gray-400 hover:text-[#ED8936] transition-colors">
                  info@sunbox-mauritius.com
                </a>
              </li>
            </ul>

            {/* Newsletter */}
            <div className="mt-8">
              <h5 className="font-semibold mb-3">Subscribe to Newsletter</h5>
              <form className="flex gap-2">
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-[#ED8936] text-white placeholder-gray-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#ED8936] rounded-lg hover:bg-[#DD7826] transition-colors"
                >
                  <Mail className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © 2025 Sunbox Mauritius. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-[#ED8936] transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-400 hover:text-[#ED8936] transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-gray-400 hover:text-[#ED8936] transition-colors">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-8 right-8 w-12 h-12 bg-[#ED8936] rounded-full shadow-lg flex items-center justify-center hover:bg-[#DD7826] transition-colors z-40"
      >
        <ArrowUp className="w-6 h-6 text-white" />
      </button>
    </footer>
  );
};

export default Footer;
