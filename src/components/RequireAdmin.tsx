import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

type MeResponse = {
  success?: boolean;
  data?: { is_admin?: boolean };
};

export default function RequireAdmin() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();

  useEffect(() => {
    (async () => {
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
