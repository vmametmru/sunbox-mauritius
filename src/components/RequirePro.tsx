import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';

export default function RequirePro() {
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const location = useLocation();

  useEffect(() => {
    (async () => {
      try {
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

  return <Outlet />;
}
