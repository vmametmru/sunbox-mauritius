import React, { useState } from 'react';
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
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';


const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: FileText, label: 'Devis', path: '/admin/quotes' },
  { icon: Package, label: 'Modèles', path: '/admin/models' },

  // ✅ NEW: Gestion photos (modèles + plans)
  { icon: ImageIcon, label: 'Photos', path: '/admin/media' },

  // ✅ NEW: BOQ Management
  { icon: Calculator, label: 'BOQ', path: '/admin/boq' },

  // ✅ NEW: Suppliers Management  
  { icon: Building2, label: 'Fournisseurs', path: '/admin/suppliers' },

  // ✅ NEW: Option Categories Management
  { icon: Tag, label: 'Catégories Options', path: '/admin/option-categories' },

  { icon: Users, label: 'Contacts', path: '/admin/contacts' },
  { icon: Mail, label: 'Email', path: '/admin/email' },
  { icon: Settings, label: 'Site', path: '/admin/site' },
  { icon: Activity, label: 'Activité', path: '/admin/activity' },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Helper: active state also for subroutes (ex: /admin/media/123)
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

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
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive(item.path)
                    ? "bg-orange-500 text-white"
                    : "hover:bg-white/10"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="border-t border-white/20 pt-4 mt-4">
              <Link
                to="/"
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10"
              >
                <Home className="h-5 w-5" />
                <span>Retour au site</span>
              </Link>
            </div>
          </nav>
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
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive(item.path)
                    ? "bg-orange-500 text-white"
                    : "hover:bg-white/10"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 space-y-2">
            <Link
              to="/"
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Home className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span>Retour au site</span>}
            </Link>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-4 py-3 text-white hover:bg-white/10"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span>Réduire</span>}
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
