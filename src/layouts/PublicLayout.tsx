import React, { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useSettings } from "@/hooks/use-settings";

export default function PublicLayout({ children }: { children: ReactNode }) {
  const {
    siteLogo,
    siteSlogan,
    siteUnderConstruction,
    constructionMessage,
  } = useSettings();

  return (
    <div className="flex flex-col min-h-screen text-gray-800">
      {/* ================= HEADER ================= */}
      <header className="bg-white shadow-sm py-4 px-6 flex items-center justify-between">
        {/* Logo + slogan */}
        <Link to="/" className="flex items-center gap-3">
          {siteLogo && (
            <img
              src={siteLogo}
              alt="Sunbox Mauritius"
              className="h-10 w-auto"
            />
          )}
          <div className="text-sm leading-tight">
            <div className="text-lg font-bold text-[#1A365D]">Sunbox</div>
            <div className="text-xs text-gray-500">
              {siteSlogan || "container home - swimming-pools"}
            </div>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex gap-6 text-sm font-medium">
          <Link to="/" className="hover:text-orange-500 transition-colors">
            Accueil
          </Link>
          <Link to="/models" className="hover:text-orange-500 transition-colors">
            Modèles
          </Link>
          <Link to="/about" className="hover:text-orange-500 transition-colors">
            À propos
          </Link>
          <Link to="/contact" className="hover:text-orange-500 transition-colors">
            Contact
          </Link>
          <Link to="/legal" className="hover:text-orange-500 transition-colors">
            Mentions légales
          </Link>
        </nav>
      </header>

      {/* ============ UNDER CONSTRUCTION BANNER ============ */}
      {siteUnderConstruction && (
        <div className="bg-yellow-100 text-yellow-800 text-sm text-center py-2 px-4">
          {constructionMessage}
        </div>
      )}

      {/* ================= MAIN ================= */}
      <main className="flex-1">{children}</main>

      {/* ================= FOOTER ================= */}
      <footer className="bg-[#1A365D] text-white text-center text-sm py-6 mt-12">
        © {new Date().getFullYear()} Sunbox Mauritius — Tous droits réservés
      </footer>
    </div>
  );
}
