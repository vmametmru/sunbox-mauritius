import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Cpu,
  Settings,
  Menu,
  X,
  LogOut,
  CreditCard,
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ProUser {
  id: number;
  name: string;
  email: string;
  company_name: string;
  credits: number;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Tableau de bord', path: '/pro' },
  { icon: FileText, label: 'Mes Devis', path: '/pro/quotes' },
  { icon: Cpu, label: 'Demande de Modèle', path: '/pro/model-request' },
  { icon: Settings, label: 'Mon Profil', path: '/pro/settings' },
];

export default function ProLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<ProUser | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/pro_auth.php?action=me', { credentials: 'include' });
        const j = await r.json();
        if (j?.data?.is_pro) setUser(j.data as ProUser);
      } catch { /* ignore */ }
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/pro_auth.php?action=logout', { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
    navigate('/pro-login');
  };

  const isActive = (path: string) => {
    if (path === '/pro') return location.pathname === '/pro';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const creditRules = [
    { label: 'Créer un devis', cost: '500 Rs' },
    { label: 'Valider + envoyer email', cost: '1 000 Rs' },
    { label: 'Demande BOQ', cost: '1 500 Rs' },
    { label: 'Demande de modèle', cost: '3 000 Rs' },
  ];

  const renderNav = (onClickLink?: () => void) => (
    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          onClick={onClickLink}
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors',
            isActive(item.path)
              ? 'bg-orange-500 text-white'
              : 'hover:bg-white/10'
          )}
        >
          <item.icon className="h-5 w-5 flex-shrink-0" />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Header */}
      <div className="lg:hidden bg-[#1A365D] text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">Sun<span className="text-orange-400">box</span></span>
          <span className="text-sm opacity-75">Pro</span>
        </div>
        <Button variant="ghost" size="icon" className="text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#1A365D] text-white">
          {renderNav(() => setMobileMenuOpen(false))}
          <div className="p-4 border-t border-white/20">
            <Button variant="ghost" className="w-full justify-start gap-3 text-white hover:bg-white/10" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
              Déconnexion
            </Button>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col bg-[#1A365D] text-white min-h-screen w-72">
          {/* Logo + Company */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center font-bold text-lg">
                S
              </div>
              <div>
                <span className="text-xl font-bold">Sun<span className="text-orange-400">box</span></span>
                <p className="text-xs opacity-75">Portail Pro</p>
              </div>
            </div>
            {user && (
              <div className="mt-2">
                <p className="font-semibold text-sm">{user.company_name || user.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <CreditCard className="h-4 w-4 text-orange-300" />
                  <Badge className="bg-orange-500 text-white text-xs">
                    {user.credits.toLocaleString()} Rs
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {renderNav()}

          {/* Credit rules */}
          <div className="p-4 border-t border-white/10">
            <p className="text-xs opacity-50 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Coins className="h-3 w-3" /> Tarifs crédits
            </p>
            <div className="space-y-1">
              {creditRules.map((rule) => (
                <div key={rule.label} className="flex justify-between text-xs opacity-70">
                  <span>{rule.label}</span>
                  <span className="text-orange-300 font-medium">{rule.cost}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-white hover:bg-white/10"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              Déconnexion
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
