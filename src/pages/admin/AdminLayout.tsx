import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Package,
  Settings,
  Mail,
  Users,
  Menu,
  X,
  Home,
  Activity,
  Image as ImageIcon,
  Calculator,
  Building2,
  Lightbulb,
  Waves,
  DollarSign,
  FileCode,
  ShoppingCart,
  BookUser,
  ChevronDown,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  disabled?: boolean;
}

interface MenuGroup {
  icon: React.ElementType;
  label: string;
  key: string;
  children: MenuItem[];
}

type NavItem = MenuItem | MenuGroup;

function isGroup(item: NavItem): item is MenuGroup {
  return 'children' in item;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  {
    icon: ShoppingCart,
    label: 'Commerce',
    key: 'commerce',
    children: [
      { icon: FileText, label: 'Devis', path: '/admin/quotes' },
    ],
  },
  {
    icon: BookUser,
    label: 'Contacts',
    key: 'contacts',
    children: [
      { icon: Users, label: 'Clients', path: '/admin/contacts' },
      { icon: Building2, label: 'Fournisseurs', path: '/admin/suppliers' },
    ],
  },
  {
    icon: Settings,
    label: 'Paramètres',
    key: 'parametres',
    children: [
      { icon: Package, label: 'Modèles', path: '/admin/models' },
      { icon: ImageIcon, label: 'Photos', path: '/admin/media' },
      { icon: Calculator, label: 'BOQ', path: '/admin/boq' },
      { icon: DollarSign, label: 'Prix Piscine', path: '/admin/pool-prices' },
      { icon: Waves, label: 'Variables Piscine', path: '/admin/pool-variables' },
      { icon: FileCode, label: 'Modèles Piscine', path: '/admin/pool-template' },
      { icon: Mail, label: 'Email', path: '/admin/email' },
      { icon: Settings, label: 'Site', path: '/admin/site' },
    ],
  },
  { icon: Lightbulb, label: 'Idées Dev', path: '/admin/dev-ideas' },
  { icon: Activity, label: 'Activités', path: '/admin/activity', disabled: true },
];

// All paths that belong to each group (for auto-expand)
const groupPaths: Record<string, string[]> = {
  commerce: ['/admin/quotes'],
  contacts: ['/admin/contacts', '/admin/suppliers'],
  parametres: ['/admin/models', '/admin/media', '/admin/boq', '/admin/pool-prices', '/admin/pool-variables', '/admin/pool-template', '/admin/email', '/admin/site'],
};

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine which groups should be open by default based on current path
  const getInitialOpenGroups = () => {
    const open: Record<string, boolean> = {};
    for (const [key, paths] of Object.entries(groupPaths)) {
      if (paths.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'))) {
        open[key] = true;
      }
    }
    return open;
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(getInitialOpenGroups);

  // Auto-expand group when navigating to a child route
  useEffect(() => {
    for (const [key, paths] of Object.entries(groupPaths)) {
      if (paths.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'))) {
        setOpenGroups((prev) => ({ ...prev, [key]: true }));
      }
    }
  }, [location.pathname]);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper: active state also for subroutes (ex: /admin/media/123)
  // Special case for Dashboard (/admin): only exact match, not startsWith
  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth.php?action=logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore network errors, redirect anyway
    }
    navigate('/admin-login');
  };

  // ── Shared render helpers ──────────────────────────────────────────────────

  const renderNavLink = (item: MenuItem, indent = false, onClick?: () => void) => (
    <Link
      key={item.path}
      to={item.disabled ? '#' : item.path}
      onClick={item.disabled ? (e) => e.preventDefault() : onClick}
      aria-disabled={item.disabled}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors",
        indent && sidebarOpen && "pl-8",
        item.disabled
          ? "opacity-40 cursor-not-allowed"
          : isActive(item.path)
          ? "bg-orange-500 text-white"
          : "hover:bg-white/10"
      )}
    >
      <item.icon className="h-5 w-5 flex-shrink-0" />
      {sidebarOpen && <span>{item.label}</span>}
    </Link>
  );

  const renderGroupHeader = (group: MenuGroup) => (
    <button
      key={group.key}
      onClick={() => toggleGroup(group.key)}
      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-white/10 transition-colors"
    >
      <group.icon className="h-5 w-5 flex-shrink-0" />
      {sidebarOpen && (
        <>
          <span className="flex-1 text-left">{group.label}</span>
          {openGroups[group.key]
            ? <ChevronDown className="h-4 w-4 opacity-60" />
            : <ChevronRight className="h-4 w-4 opacity-60" />}
        </>
      )}
    </button>
  );

  // ── Mobile flat list (all items expanded) ─────────────────────────────────

  const renderMobileNav = () => (
    <nav className="p-4 space-y-1">
      {navItems.map((item) => {
        if (isGroup(item)) {
          return (
            <React.Fragment key={item.key}>
              <div className="flex items-center gap-3 px-4 py-2 text-xs uppercase tracking-wider opacity-50 mt-3">
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
              {item.children.map((child) => (
                <Link
                  key={child.path}
                  to={child.disabled ? '#' : child.path}
                  onClick={child.disabled ? (e) => e.preventDefault() : () => setMobileMenuOpen(false)}
                  aria-disabled={child.disabled}
                  className={cn(
                    "flex items-center gap-3 pl-8 pr-4 py-2.5 rounded-lg transition-colors",
                    child.disabled
                      ? "opacity-40 cursor-not-allowed"
                      : isActive(child.path)
                      ? "bg-orange-500 text-white"
                      : "hover:bg-white/10"
                  )}
                >
                  <child.icon className="h-5 w-5" />
                  <span>{child.label}</span>
                </Link>
              ))}
            </React.Fragment>
          );
        }
        return (
          <Link
            key={item.path}
            to={item.disabled ? '#' : item.path}
            onClick={item.disabled ? (e) => e.preventDefault() : () => setMobileMenuOpen(false)}
            aria-disabled={item.disabled}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors",
              item.disabled
                ? "opacity-40 cursor-not-allowed"
                : isActive(item.path)
                ? "bg-orange-500 text-white"
                : "hover:bg-white/10"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <div className="border-t border-white/20 pt-3 mt-3 space-y-1">
        <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-white/10">
          <Home className="h-5 w-5" />
          <span>Retour au site</span>
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-white/10 text-left">
          <LogOut className="h-5 w-5" />
          <span>Déconnexion</span>
        </button>
      </div>
    </nav>
  );

  // ── Desktop nav ───────────────────────────────────────────────────────────

  const renderDesktopNav = () => (
    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
      {navItems.map((item) => {
        if (isGroup(item)) {
          return (
            <React.Fragment key={item.key}>
              {renderGroupHeader(item)}
              {(openGroups[item.key] || !sidebarOpen) && (
                <div className={cn("space-y-1", sidebarOpen && "ml-1")}>
                  {item.children.map((child) => renderNavLink(child, true))}
                </div>
              )}
            </React.Fragment>
          );
        }
        return renderNavLink(item);
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Header */}
      <div className="lg:hidden bg-[#1A365D] text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">
            Sun<span className="text-orange-400">box</span>
          </span>
          <span className="text-sm opacity-75">Admin</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#1A365D] text-white">
          {renderMobileNav()}
        </div>
      )}

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "hidden lg:flex flex-col bg-[#1A365D] text-white min-h-screen transition-all duration-300",
            sidebarOpen ? "w-64" : "w-20"
          )}
        >
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center font-bold text-lg">
                S
              </div>
              {sidebarOpen && (
                <div>
                  <span className="text-xl font-bold">
                    Sun<span className="text-orange-400">box</span>
                  </span>
                  <p className="text-xs opacity-75">Administration</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          {renderDesktopNav()}

          {/* Footer */}
          <div className="p-4 border-t border-white/10 space-y-1">
            <Link
              to="/"
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Home className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span>Retour au site</span>}
            </Link>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-4 py-2.5 text-white hover:bg-white/10"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span>Réduire</span>}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-4 py-2.5 text-white hover:bg-white/10"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span>Déconnexion</span>}
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
