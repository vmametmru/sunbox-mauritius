import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation() as any;

  const from = location.state?.from?.pathname || "/admin";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const r = await fetch("/api/auth.php?action=login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const j = await r.json().catch(() => ({}));

    console.log("status", r.status, "json", j);

    if (r.ok && (j?.success || j?.data?.is_admin || j?.is_admin)) {
  navigate(from, { replace: true });
} else {
  setError(j?.error || "Login failed");
}
  }

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 20 }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Admin login</h1>
      <form onSubmit={onSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe admin"
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />
        <button style={{ width: "100%", padding: 10 }} type="submit">
          Se connecter
        </button>
      </form>
      {error && <p style={{ marginTop: 10, color: "red" }}>{error}</p>}
    </div>
  );
}
