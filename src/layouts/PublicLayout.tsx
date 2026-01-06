import { Link, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto flex justify-between items-center p-4">
          <Link to="/" className="text-2xl font-bold text-[#1A365D]">
            Sun<span className="text-orange-500">box</span>
          </Link>
          <nav className="hidden md:flex gap-6 text-sm">
            <Link to="/" className={navClass(location.pathname === '/')}>Accueil</Link>
            <Link to="/models" className={navClass(location.pathname === '/models')}>Modèles</Link>
            <Link to="/contact" className={navClass(location.pathname === '/contact')}>Contact</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 md:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#1A365D] text-white text-sm mt-12">
        <div className="container mx-auto py-6 px-4 text-center">
          &copy; {new Date().getFullYear()} Sunbox Mauritius. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}

function navClass(isActive: boolean) {
  return (
    'hover:text-orange-500 transition-colors' +
    (isActive ? ' text-orange-500 font-semibold' : ' text-gray-700')
  );
}
