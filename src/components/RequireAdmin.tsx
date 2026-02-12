import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

type MeResponse = {
  success?: boolean;
  data?: { is_admin?: boolean };
};

// Allow admin access in development mode for testing
const DEV_BYPASS_AUTH = import.meta.env.DEV;

export default function RequireAdmin() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();

  useEffect(() => {
    (async () => {
      // In development mode, bypass authentication for testing
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

  if (loading) return null; // ou un petit "Loading..."

  if (!isAdmin) {
    return <Navigate to="/admin-login" replace state={{ from: location }} />;
  }

  // Si admin OK : on laisse passer vers les routes enfants /admin/...
  return <Outlet />;
}
