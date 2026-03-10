import React, { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useSiteSettings } from "@/hooks/use-settings";

/* ── Pro theme applied via window.__PRO_THEME__ at deploy time ── */
interface ProThemeConfig {
  logo_position?: 'left' | 'center' | 'right';
  header_height?: 'small' | 'medium' | 'large' | 'hero';
  header_bg_color?: string;
  header_text_color?: string;
  font_family?: string;
  nav_position?: 'left' | 'center' | 'right';
  nav_has_background?: boolean;
  nav_bg_color?: string;
  nav_text_color?: string;
  nav_hover_color?: string;
  button_color?: string;
  button_text_color?: string;
  footer_bg_color?: string;
  footer_text_color?: string;
  /** Managed per pro user; array of image URLs for the header slideshow */
  header_images?: string[];
}

const HEADER_HEIGHT_MAP: Record<string, string> = {
  small: '64px', medium: '80px', large: '120px', hero: '200px',
};

const LOGO_ALIGN_MAP: Record<string, string> = {
  left: 'flex-start', center: 'center', right: 'flex-end',
};

const NAV_JUSTIFY_MAP: Record<string, string> = {
  left: 'flex-start', center: 'center', right: 'flex-end',
};

export default function PublicLayout({ children }: { children: ReactNode }) {
  const { data: settings } = useSiteSettings();

  const isProSite = typeof window !== 'undefined' && !!(window as any).__PRO_SITE__;
  const proTheme: ProThemeConfig | null =
    typeof window !== 'undefined' ? ((window as any).__PRO_THEME__ ?? null) : null;

  const siteLogo = isProSite
    ? ((window as any).__PRO_LOGO_URL__ || '')
    : (settings?.site_logo || '/logo.png');
  const companyName = isProSite
    ? ((window as any).__PRO_COMPANY_NAME__ || '')
    : 'Sunbox';
  const siteSlogan = isProSite ? '' : (settings?.site_slogan || 'container home - swimming-pools');
  const siteUnderConstruction = settings?.site_under_construction === 'true';
  const constructionMessage = settings?.under_construction_message || '';

  /* ── When a pro theme is active, derive inline styles ── */
  if (isProSite && proTheme) {
    const headerH    = HEADER_HEIGHT_MAP[proTheme.header_height ?? 'medium'] ?? '80px';
    const logoAlign  = LOGO_ALIGN_MAP[proTheme.logo_position ?? 'left'] ?? 'flex-start';
    const navJustify = NAV_JUSTIFY_MAP[proTheme.nav_position ?? 'right'] ?? 'flex-end';
    const font       = proTheme.font_family ?? 'Inter';

    return (
      <div
        className="flex flex-col min-h-screen"
        style={{ fontFamily: `'${font}', sans-serif`, color: '#374151' }}
      >
        {/* ===== HEADER ===== */}
        <header
          style={{
            background: proTheme.header_bg_color ?? '#FFFFFF',
            minHeight: headerH,
            display: 'flex',
            alignItems: 'center',
            padding: '0 1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <Link
            to="/"
            className="flex items-center gap-3"
            style={{ marginInlineEnd: 'auto', justifyContent: logoAlign }}
          >
            {siteLogo && (
              <img src={siteLogo} alt={companyName} className="h-10 w-auto" />
            )}
            <div className="text-sm leading-tight">
              <div
                className="text-lg font-bold"
                style={{ color: proTheme.header_text_color ?? '#1A365D' }}
              >
                {companyName}
              </div>
              {siteSlogan && (
                <div className="text-xs" style={{ color: proTheme.header_text_color ?? '#1A365D', opacity: 0.7 }}>
                  {siteSlogan}
                </div>
              )}
            </div>
          </Link>

          {/* Navigation */}
          <nav
            style={{
              display: 'flex',
              gap: '1.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              justifyContent: navJustify,
              background: proTheme.nav_has_background ? (proTheme.nav_bg_color ?? '#FFFFFF') : 'transparent',
              padding: proTheme.nav_has_background ? '0.5rem 1rem' : '0',
              borderRadius: proTheme.nav_has_background ? '0.5rem' : '0',
            }}
          >
            {[
              { to: '/', label: 'Accueil' },
              { to: '/models', label: 'Modèles' },
              { to: '/about', label: 'À propos' },
              { to: '/contact', label: 'Contact' },
              { to: '/legal', label: 'Mentions légales' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                style={{ color: proTheme.nav_text_color ?? '#1A365D', transition: 'color 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = proTheme.nav_hover_color ?? '#F97316')}
                onMouseLeave={(e) => (e.currentTarget.style.color = proTheme.nav_text_color ?? '#1A365D')}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        {/* ===== UNDER CONSTRUCTION ===== */}
        {siteUnderConstruction && (
          <div className="bg-yellow-100 text-yellow-800 text-sm text-center py-2 px-4">
            {constructionMessage}
          </div>
        )}

        {/* ===== MAIN ===== */}
        <main className="flex-1">{children}</main>

        {/* ===== FOOTER ===== */}
        <footer
          className="text-center text-sm py-6 mt-12"
          style={{
            background: proTheme.footer_bg_color ?? '#1A365D',
            color: proTheme.footer_text_color ?? '#FFFFFF',
          }}
        >
          © {new Date().getFullYear()} {companyName} — Tous droits réservés
        </footer>
      </div>
    );
  }

  /* ── Default layout — current Sunbox theme, untouched ── */
  return (
    <div className="flex flex-col min-h-screen text-gray-800">
      {/* ================= HEADER ================= */}
      <header className="bg-white shadow-sm py-4 px-6 flex items-center justify-between">
        {/* Logo + slogan */}
        <Link to="/" className="flex items-center gap-3">
          {siteLogo && (
            <img
              src={siteLogo}
              alt={companyName}
              className="h-10 w-auto"
            />
          )}
          <div className="text-sm leading-tight">
            <div className="text-lg font-bold text-[#1A365D]">{companyName}</div>
            {siteSlogan && (
              <div className="text-xs text-gray-500">{siteSlogan}</div>
            )}
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
        © {new Date().getFullYear()} {companyName} — Tous droits réservés
      </footer>
    </div>
  );
}
