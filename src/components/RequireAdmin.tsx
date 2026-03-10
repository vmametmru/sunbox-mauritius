import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

type MeResponse = {
  success?: boolean;
  data?: { is_admin?: boolean };
};

// Allow admin access bypass in development mode - must be explicitly enabled via env variable
// This is ONLY for development/testing purposes
const DEV_BYPASS_AUTH = import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === 'true';

// On deployed pro sites the Sunbox admin panel must not be accessible.
const IS_PRO_SITE = typeof window !== 'undefined' && !!(window as any).__PRO_SITE__;

export default function RequireAdmin() {
  const [loading, setLoading] = useState(!IS_PRO_SITE); // Pro sites skip auth check — start with loading=false
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Pro sites have no Sunbox admin — no auth check needed.
    if (IS_PRO_SITE) return;

    (async () => {
      // In development mode with bypass enabled, skip authentication
      if (DEV_BYPASS_AUTH) {
        setIsAdmin(true);
        setLoading(false);
        return;
      }
      
      try {
        const r = await fetch("/api/auth.php?action=me", {
          method: "GET",
          credentials: "include", // IMPORTANT pour la session PHP
        });

        const j: MeResponse = await r.json().catch(() => ({}));
        setIsAdmin(!!j?.data?.is_admin);
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // On deployed pro sites the Sunbox admin panel must not be accessible.
  if (IS_PRO_SITE) {
    return <Navigate to="/pro-login" replace />;
  }

  if (loading) return null; // ou un petit "Loading..."

  if (!isAdmin) {
    return <Navigate to="/admin-login" replace state={{ from: location }} />;
  }

  // Si admin OK : on laisse passer vers les routes enfants /admin/...
  return <Outlet />;
}
