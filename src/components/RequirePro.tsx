import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';

export default function RequirePro() {
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const location = useLocation();

  const isSemiProSite = typeof window !== 'undefined' && !!(window as any).__SEMI_PRO_SITE__;

  useEffect(() => {
    (async () => {
      try {
        // Both pro and semi-pro sites deploy their auth as /api/pro_auth.php.
        // The deployed file for semi-pro (api_semi_pro_auth.php) also returns is_pro: true
        // on success, so RequirePro works identically for both.
        const r = await fetch(`${API_BASE_URL}/pro_auth.php?action=me`, {
          method: 'GET',
          credentials: 'include',
        });
        const j = await r.json().catch(() => ({}));
        setIsPro(!!j?.data?.is_pro);
      } catch {
        setIsPro(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return null;

  if (!isPro) {
    return <Navigate to="/pro-login" replace state={{ from: location }} />;
  }

  // On semi-pro site, also expose the flag on the window for child components
  if (isSemiProSite) {
    (window as any).__IS_SEMI_PRO_AUTHENTICATED__ = true;
  }

  return <Outlet />;
}
