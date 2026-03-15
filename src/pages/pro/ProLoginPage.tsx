import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api';

export default function ProLoginPage() {
  const isProSite = typeof window !== 'undefined' && !!(window as any).__PRO_SITE__;
  const isSemiProSite = typeof window !== 'undefined' && !!(window as any).__SEMI_PRO_SITE__;
  const companyName: string = (isProSite || isSemiProSite) ? ((window as any).__PRO_COMPANY_NAME__ || '') : '';
  const logoUrl: string = isProSite ? ((window as any).__PRO_LOGO_URL__ || '') : '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as any)?.from?.pathname || '/pro';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // On a pro site (single-user): password only; on semi-pro or Sunbox: email + password
    const needsEmail = !isProSite;
    if (!password || (needsEmail && !email)) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs.', variant: 'destructive' });
      return;
    }
    try {
      setLoading(true);
      const body = isProSite ? { password } : { email, password };
      const r = await fetch(`${API_BASE_URL}/pro_auth.php?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || 'Connexion échouée');
      navigate(from, { replace: true });
    } catch (err: any) {
      toast({ title: 'Connexion échouée', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {isProSite && logoUrl ? (
            <img src={logoUrl} alt={companyName} className="h-16 w-auto mx-auto mb-2" />
          ) : null}
          <span className="text-3xl font-bold text-gray-800">
            {(isProSite || isSemiProSite) && companyName ? companyName : <><span>Sun</span><span className="text-orange-500">box</span></>}
          </span>
          <p className="text-gray-500 mt-1">{isSemiProSite ? 'Portail Semi-Pro (ERP)' : 'Portail Professionnel'}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Connexion</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Show email on semi-pro site (multi-user) and on Sunbox main, but not on a single-user pro site */}
              {!isProSite && (
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    autoComplete="email"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600"
                disabled={loading}
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
