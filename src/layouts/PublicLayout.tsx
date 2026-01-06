import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useSettings } from "@/hooks/use-settings";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const settings = useSettings();

  const nav = [
    { name: "Accueil", href: "/" },
    { name: "Modèles", href: "/models" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {settings.site_logo_url ? (
                <img src={settings.site_logo_url} alt="Logo" className="h-10" />
              ) : (
                <div className="text-xl font-bold text-[#1A365D]">
                  Sun<span className="text-orange-500">box</span>
                </div>
              )}
              {settings.site_slogan && (
                <span className="text-sm text-gray-600">{settings.site_slogan}</span>
              )}
            </div>

            <nav className="hidden md:flex items-center gap-6">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`text-sm font-medium hover:text-orange-500 transition-colors ${
                    location.pathname === item.href ? "text-orange-600" : "text-gray-700"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {settings.site_under_construction === "true" && settings.under_construction_message && (
          <div className="bg-yellow-100 text-yellow-800 text-sm text-center py-2 border-t border-yellow-300">
            {settings.under_construction_message}
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 bg-white">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#1A365D] text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="font-semibold">Sunbox Mauritius</p>
              {settings.site_slogan && <p>{settings.site_slogan}</p>}
            </div>
            <div>
              <p className="font-semibold">Navigation</p>
              <ul className="mt-2 space-y-1">
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link to={item.href} className="hover:underline">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold">Contact</p>
              <p>Île Maurice</p>
              <p>
                <a href="mailto:contact@sunbox-mauritius.com" className="hover:underline">
                  contact@sunbox-mauritius.com
                </a>
              </p>
            </div>
          </div>

          <div className="text-center text-xs text-white/80 mt-6">
            &copy; {new Date().getFullYear()} Sunbox Mauritius. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}
