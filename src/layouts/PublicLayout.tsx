import React, { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useSiteSettings } from "@/hooks/use-settings";

/* ── Pro theme applied via window.__PRO_THEME__ at runtime ── */
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
}

const HEADER_HEIGHT_MAP: Record<string, string> = {
  small: '64px', medium: '80px', large: '120px', hero: '200px',
};

/* ── Shared nav links ── */
const NAV_LINKS = [
  { to: '/',       label: 'Accueil' },
  { to: '/models', label: 'Nos Solutions' },
  { to: '/about',  label: 'À propos' },
  { to: '/contact', label: 'Contact' },
  { to: '/legal',  label: 'Mentions légales' },
];

/* ── Header image slider removed: BannerCarousel in HomePage.tsx now handles
   the pro-site banner using window.__PRO_HEADER_IMAGES__, keeping the banner
   on the homepage only (not on every layout page). ── */

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
    const headerH  = HEADER_HEIGHT_MAP[proTheme.header_height ?? 'medium'] ?? '80px';
    const logoPos  = (proTheme.logo_position ?? 'left') as 'left' | 'center' | 'right';
    const navPos   = (proTheme.nav_position  ?? 'right') as 'left' | 'center' | 'right';
    const font     = proTheme.font_family ?? 'Inter';

    /* ── Logo ── */
    const LogoEl = (
      <Link to="/" className="flex items-center gap-3" style={{ textDecoration: 'none', flexShrink: 0 }}>
        {siteLogo && <img src={siteLogo} alt={companyName} className="h-10 w-auto" />}
        <div className="text-sm leading-tight">
          <div className="text-lg font-bold" style={{ color: proTheme.header_text_color ?? '#1A365D' }}>
            {companyName}
          </div>
          {siteSlogan && (
            <div className="text-xs" style={{ color: proTheme.header_text_color ?? '#1A365D', opacity: 0.7 }}>
              {siteSlogan}
            </div>
          )}
        </div>
      </Link>
    );

    /* ── Nav ── */
    const NavEl = (
      <nav style={{
        display: 'flex',
        gap: '1.5rem',
        fontSize: '0.875rem',
        fontWeight: 500,
        alignItems: 'center',
        flexShrink: 0,
        background: proTheme.nav_has_background ? (proTheme.nav_bg_color ?? '#FFFFFF') : 'transparent',
        padding: proTheme.nav_has_background ? '0.5rem 1rem' : '0',
        borderRadius: proTheme.nav_has_background ? '0.5rem' : '0',
      }}>
        {NAV_LINKS.map((item) => (
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
    );

    /* ── Distribute logo + nav into the 3 header slots ── */
    const slots: Record<'left' | 'center' | 'right', React.ReactNode[]> = { left: [], center: [], right: [] };
    slots[logoPos].push(<React.Fragment key="logo">{LogoEl}</React.Fragment>);
    slots[navPos].push(<React.Fragment key="nav">{NavEl}</React.Fragment>);

    return (
      <div
        className="flex flex-col min-h-screen"
        style={{
          fontFamily: `'${font}', sans-serif`,
          color: '#374151',
          /* Expose button colors as CSS variables so child pages can consume them */
          ['--pro-btn-bg' as string]: proTheme.button_color ?? '#F97316',
          ['--pro-btn-text' as string]: proTheme.button_text_color ?? '#FFFFFF',
        }}
      >
        {/* ===== HEADER — 3-slot grid: left | center | right ===== */}
        <header
          style={{
            background: proTheme.header_bg_color ?? '#FFFFFF',
            minHeight: headerH,
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            padding: '0 1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '1rem' }}>
            {slots.left}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            {slots.center}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem' }}>
            {slots.right}
          </div>
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

  /* ── Pro site with no custom theme — use default layout with pro branding ── */
  if (isProSite) {
    return (
      <div className="flex flex-col min-h-screen text-gray-800">
        <header className="bg-white shadow-sm py-4 px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            {siteLogo && <img src={siteLogo} alt={companyName} className="h-10 w-auto" />}
            <div className="text-sm leading-tight">
              <div className="text-lg font-bold text-[#1A365D]">{companyName}</div>
            </div>
          </Link>
          <nav className="flex gap-6 text-sm font-medium">
            {NAV_LINKS.map((item) => (
              <Link key={item.to} to={item.to} className="hover:text-orange-500 transition-colors">{item.label}</Link>
            ))}
          </nav>
        </header>
        {siteUnderConstruction && (
          <div className="bg-yellow-100 text-yellow-800 text-sm text-center py-2 px-4">{constructionMessage}</div>
        )}
        <main className="flex-1">{children}</main>
        <footer className="bg-[#1A365D] text-white text-center text-sm py-6 mt-12">
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
          <Link to="/" className="hover:text-orange-500 transition-colors">Accueil</Link>
          <Link to="/models" className="hover:text-orange-500 transition-colors">Nos Solutions</Link>
          <Link to="/about" className="hover:text-orange-500 transition-colors">À propos</Link>
          <Link to="/contact" className="hover:text-orange-500 transition-colors">Contact</Link>
          <Link to="/legal" className="hover:text-orange-500 transition-colors">Mentions légales</Link>
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
