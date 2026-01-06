
import React, { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useSettings } from "@/hooks/use-settings";

export default function PublicLayout({ children }: { children: ReactNode }) {
  const { siteLogo, siteSlogan, siteUnderConstruction, constructionMessage } = useSettings();

  return (
    <div className="flex flex-col min-h-screen text-gray-800">
      <header className="bg-white shadow-sm py-4 px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={siteLogo} alt="Logo" className="h-10 w-auto" />
          <div className="text-lg font-bold text-[#1A365D]">{siteSlogan}</div>
        </Link>
        <nav className="flex gap-6">
          <Link to="/" className="hover:text-orange-500">Accueil</Link>
          <Link to="/models" className="hover:text-orange-500">Modèles</Link>
          <Link to="/contact" className="hover:text-orange-500">Contact</Link>
          <Link to="/legal" className="hover:text-orange-500">Mentions légales</Link>
        </nav>
      </header>

      {siteUnderConstruction && (
        <div className="bg-yellow-100 text-yellow-800 text-sm text-center py-2 px-4">
          {constructionMessage}
        </div>
      )}

      <main className="flex-1">{children}</main>

      <footer className="bg-[#1A365D] text-white text-center text-sm py-6 mt-12">
        © {new Date().getFullYear()} Sunbox Mauritius — Tous droits réservés
      </footer>
    </div>
  );
}
