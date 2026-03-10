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
  DollarSign,
  Package,
  Users,
  Mail,
  Tag,
  Home,
  ShoppingCart,
  BookUser,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Bug,
  UserCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { API_BASE_URL } from '@/lib/api';

interface ProUser {
  id: number;
  name: string;
  email: string;
  company_name: string;
  credits: number;
}

// ── Sunbox portal nav (when pro user is logged in on sunbox-mauritius.com) ────
const sunboxNavItems = [
  { icon: LayoutDashboard, label: 'Tableau de bord', path: '/pro' },
  { icon: FileText,        label: 'Mes Devis',       path: '/pro/quotes' },
  { icon: Package,         label: 'Mes Modèles',     path: '/pro/models' },
  { icon: Cpu,             label: 'Demande de Modèle', path: '/pro/model-request' },
  { icon: Settings,        label: 'Mon Profil',      path: '/pro/settings' },
  { icon: Bug,             label: 'Débogage',        path: '/pro/debug' },
];

// ── Deployed pro site admin nav (when window.__PRO_SITE__ === true) ───────────
const proSiteNavGroups = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/pro', isItem: true as const },
  { icon: ShoppingCart, label: 'Commerce', key: 'commerce', isItem: false as const,
    children: [
      { icon: FileText,      label: 'Devis',                 path: '/pro/quotes' },
      { icon: ClipboardList, label: "Rapports d'Achat",      path: '/pro/reports' },
      { icon: Cpu,           label: 'Demandes de Modèles',   path: '/pro/model-request' },
    ],
  },
  {
    icon: BookUser, label: 'Contact', key: 'contact', isItem: false as const,
    children: [
      { icon: Users, label: 'Clients', path: '/pro/contacts' },
    ],
  },
  {
    icon: Settings, label: 'Paramètres', key: 'parametres', isItem: false as const,
    children: [
      { icon: UserCircle,  label: 'Mon Profil & Bandeau', path: '/pro/settings' },
      { icon: Tag,         label: 'Remises',   path: '/pro/discounts' },
      { icon: Mail,        label: 'Email',     path: '/pro/email' },
      { icon: CreditCard,  label: 'Paiements', path: '/pro/payments' },
      { icon: Settings,    label: 'Site',      path: '/pro/site' },
      { icon: Bug,         label: 'Débogage',  path: '/pro/debug' },
    ],
  },
];

export default function ProLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isProSite = !!(window as any).__PRO_SITE__;
  const proLogoUrl: string = (window as any).__PRO_LOGO_URL__ || '';
  const proCompany: string = (window as any).__PRO_COMPANY_NAME__ || '';
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ commerce: true, contact: false, parametres: false });
  const [user, setUser] = useState<ProUser | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/pro_auth.php?action=me`, { credentials: 'include' });
        const j = await r.json();
        if (j?.data?.is_pro) setUser(j.data as ProUser);
      } catch { /* ignore */ }
    })();
  }, []);

  // Auto-expand group whose child is active
  useEffect(() => {
    proSiteNavGroups.forEach((g) => {
      if (!g.isItem && g.children) {
        if (g.children.some((c) => location.pathname === c.path || location.pathname.startsWith(c.path + '/'))) {
          setOpenGroups((prev) => ({ ...prev, [g.key]: true }));
        }
      }
    });
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/pro_auth.php?action=logout`, { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
    navigate('/pro-login');
  };

  const isActive = (path: string) => {
    if (path === '/pro') return location.pathname === '/pro';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const toggleGroup = (key: string) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Sunbox portal nav (flat) ─────────────────────────────────────────────
  const renderSunboxNav = (onClickLink?: () => void) => (
    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
      {sunboxNavItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          onClick={onClickLink}
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors',
            isActive(item.path) ? 'bg-orange-500 text-white' : 'hover:bg-white/10'
          )}
        >
          <item.icon className="h-5 w-5 flex-shrink-0" />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );

  // ── Pro site admin nav (grouped, collapsible) ────────────────────────────
  const renderProSiteNav = (onClickLink?: () => void) => (
    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
      {proSiteNavGroups.map((g) => {
        if (g.isItem) {
          return (
            <Link
              key={g.path}
              to={g.path}
              onClick={onClickLink}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors',
                isActive(g.path) ? 'bg-orange-500 text-white' : 'hover:bg-white/10'
              )}
            >
              <g.icon className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span>{g.label}</span>}
            </Link>
          );
        }
        return (
          <React.Fragment key={g.key}>
            <button
              onClick={() => toggleGroup(g.key)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <g.icon className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left">{g.label}</span>
                  {openGroups[g.key]
                    ? <ChevronDown className="h-4 w-4 opacity-60" />
                    : <ChevronRight className="h-4 w-4 opacity-60" />}
                </>
              )}
            </button>
            {(openGroups[g.key] || !sidebarOpen) && (
              <div className={cn('space-y-1', sidebarOpen && 'ml-1')}>
                {g.children.map((child) => (
                  <Link
                    key={child.path}
                    to={child.path}
                    onClick={onClickLink}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors',
                      sidebarOpen && 'pl-8',
                      isActive(child.path) ? 'bg-orange-500 text-white' : 'hover:bg-white/10'
                    )}
                  >
                    <child.icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && <span>{child.label}</span>}
                  </Link>
                ))}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );

  const renderNav = (onClickLink?: () => void) =>
    isProSite ? renderProSiteNav(onClickLink) : renderSunboxNav(onClickLink);


  // ── Sidebar header content ───────────────────────────────────────────────
  const creditRules = [
    { label: 'Demande de modèle', cost: '5 000 Rs' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Header */}
      <div className="lg:hidden bg-[#1A365D] text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isProSite && proLogoUrl
            ? <img src={proLogoUrl} alt={proCompany} className="h-8 w-auto" />
            : <span className="text-xl font-bold">Sun<span className="text-orange-400">box</span></span>}
          <span className="text-sm opacity-75">{isProSite ? 'Admin' : 'Pro'}</span>
        </div>
        <Button variant="ghost" size="icon" className="text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#1A365D] text-white">
          {renderNav(() => setMobileMenuOpen(false))}
          <div className="p-4 border-t border-white/20 space-y-1">
            {isProSite && (
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-white/10">
                <Home className="h-5 w-5" /><span>Retour au site</span>
              </Link>
            )}
            <Button variant="ghost" className="w-full justify-start gap-3 text-white hover:bg-white/10" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />Déconnexion
            </Button>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className={cn(
          'hidden lg:flex flex-col bg-[#1A365D] text-white min-h-screen transition-all duration-300',
          isProSite ? (sidebarOpen ? 'w-64' : 'w-20') : 'w-72'
        )}>
          {/* Logo / Company */}
          <div className="p-6 border-b border-white/10">
            {isProSite ? (
              <div className="flex items-center gap-3">
                {proLogoUrl
                  ? <img src={proLogoUrl} alt={proCompany} className="h-10 w-auto" />
                  : <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center font-bold text-lg">A</div>}
                {sidebarOpen && (
                  <div>
                    <p className="font-bold text-sm leading-tight">{proCompany || 'Administration'}</p>
                    <p className="text-xs opacity-75">Administration</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center font-bold text-lg">S</div>
                <div>
                  <span className="text-xl font-bold">Sun<span className="text-orange-400">box</span></span>
                  <p className="text-xs opacity-75">Portail Pro</p>
                </div>
              </div>
            )}
            {!isProSite && user && (
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

          {/* Credit rules — only on Sunbox portal */}
          {!isProSite && (
            <div className="p-4 border-t border-white/10">
              <p className="text-xs opacity-50 uppercase tracking-wider mb-2 flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Tarifs crédits
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
          )}

          {/* Footer */}
          <div className="p-4 border-t border-white/10 space-y-1">
            {isProSite && (
              <Link
                to="/"
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Home className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>Retour au site</span>}
              </Link>
            )}
            {isProSite && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-4 py-2.5 text-white hover:bg-white/10"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>Réduire</span>}
              </Button>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-4 py-2.5 text-white hover:bg-white/10"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {(isProSite ? sidebarOpen : true) && <span>Déconnexion</span>}
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
