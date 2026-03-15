import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  DollarSign,
  TrendingUp,
  Users,
  Mail,
  RefreshCw,
  AlertTriangle,
  Database,
  Loader2,
  Upload,
  HardDrive,
  ClipboardList,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';

interface DashboardStats {
  total_quotes: number;
  pending_quotes: number;
  approved_quotes: number;
  today_quotes: number;
  total_revenue: number;
  new_contacts: number;
  total_model_requests: number;
  pending_model_requests: number;
  recent_quotes: any[];
  monthly_stats: any[];
}

interface EmailSettings {
  smtp_host?: string;
  smtp_user?: string;
  smtp_port?: string;
}

interface DbVersionStatus {
  current_version: string;
  latest_version: string;
  is_up_to_date: boolean;
}

interface ProVersionStatus {
  user_id: number;
  files_up_to_date: boolean;
  db_up_to_date: boolean;
  current_file_version: string;
  latest_file_version: string;
  current_db_version: string;
  latest_db_version: string;
  error?: string;
}

interface ProUserRow {
  id: number;
  name: string;
  company_name: string;
  domain: string;
  is_active: boolean;
  // version state (loaded async)
  versions?: ProVersionStatus | null;
  deploying?: boolean;
  initingDb?: boolean;
}

interface SemiProSiteStatus {
  deployed: boolean;
  slug: string;
  company_name: string;
  files_up_to_date: boolean;
  db_up_to_date: boolean;
  current_version: string | null;
  latest_version: string;
  current_db_version: string | null;
  latest_db_version: string;
  db_name: string;
  domain: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbVersion, setDbVersion]   = useState<DbVersionStatus | null>(null);
  const [dbUpdating, setDbUpdating] = useState(false);
  const [proUsers, setProUsers]     = useState<ProUserRow[]>([]);
  const [semiProStatus, setSemiProStatus] = useState<SemiProSiteStatus | null>(null);
  const [semiProUpdatingFiles, setSemiProUpdatingFiles] = useState(false);
  const [semiProUpdatingDb, setSemiProUpdatingDb]       = useState(false);

  useEffect(() => {
    loadStats();
    loadDbVersion();
    loadProUsers();
    loadSemiProStatus();
  }, []);

  const loadSemiProStatus = async () => {
    try {
      const cfg: any = await api.getSemiProSiteConfig('semi-pro');
      if (cfg?.deployed) setSemiProStatus(cfg as SemiProSiteStatus);
      else setSemiProStatus(null);
    } catch { /* non-fatal */ }
  };

  const handleSemiProUpdateFiles = async () => {
    if (!semiProStatus) return;
    setSemiProUpdatingFiles(true);
    try {
      await api.updateSemiProSite({
        slug: semiProStatus.slug,
        company_name: semiProStatus.company_name || '',
        db_name: semiProStatus.db_name,
      });
      await loadSemiProStatus();
    } catch (err: any) {
      alert('Erreur mise à jour fichiers : ' + err.message);
    } finally {
      setSemiProUpdatingFiles(false);
    }
  };

  const handleSemiProUpdateDb = async () => {
    if (!semiProStatus?.db_name) return;
    setSemiProUpdatingDb(true);
    try {
      await api.updateSemiProDb(semiProStatus.db_name);
      await loadSemiProStatus();
    } catch (err: any) {
      alert('Erreur mise à jour BD : ' + err.message);
    } finally {
      setSemiProUpdatingDb(false);
    }
  };

  const loadDbVersion = async () => {
    try {
      const v = await api.checkDbVersion();
      setDbVersion(v);
    } catch { /* non-fatal — DB might not have version table yet */ }
  };

  const loadProUsers = async () => {
    try {
      const users: any[] = await api.getProUsers();
      const withDomain = users.filter(u => u.domain);
      setProUsers(withDomain.map(u => ({ ...u, versions: undefined, deploying: false, initingDb: false })));
      // load versions in parallel
      withDomain.forEach(async (u) => {
        try {
          const v = await api.checkProVersions(u.id);
          setProUsers(prev => prev.map(p => p.id === u.id ? { ...p, versions: v } : p));
        } catch (e: any) {
          setProUsers(prev => prev.map(p => p.id === u.id ? { ...p, versions: { user_id: u.id, files_up_to_date: false, db_up_to_date: false, current_file_version: '?', latest_file_version: '?', current_db_version: '?', latest_db_version: '?', error: e.message } } : p));
        }
      });
    } catch { /* non-fatal */ }
  };

  const handleUpdateDb = async () => {
    setDbUpdating(true);
    try {
      await api.updateDbSchema();
      const v = await api.checkDbVersion();
      setDbVersion(v);
    } catch (err: any) {
      alert('Erreur lors de la mise à jour : ' + err.message);
    } finally {
      setDbUpdating(false);
    }
  };

  const handleDeployPro = async (userId: number) => {
    setProUsers(prev => prev.map(p => p.id === userId ? { ...p, deploying: true } : p));
    try {
      await api.deployProSite(userId);
      const v = await api.checkProVersions(userId);
      setProUsers(prev => prev.map(p => p.id === userId ? { ...p, deploying: false, versions: v } : p));
    } catch (err: any) {
      alert('Erreur déploiement : ' + err.message);
      setProUsers(prev => prev.map(p => p.id === userId ? { ...p, deploying: false } : p));
    }
  };

  const handleInitProDb = async (userId: number) => {
    setProUsers(prev => prev.map(p => p.id === userId ? { ...p, initingDb: true } : p));
    try {
      await api.initProDb(userId);
      const v = await api.checkProVersions(userId);
      setProUsers(prev => prev.map(p => p.id === userId ? { ...p, initingDb: false, versions: v } : p));
    } catch (err: any) {
      alert('Erreur mise à jour BD : ' + err.message);
      setProUsers(prev => prev.map(p => p.id === userId ? { ...p, initingDb: false } : p));
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getDashboardStats();
      setStats(result);
      
      // Also load email settings to check if configured
      try {
        const settings = await api.getSettings('email');
        setEmailSettings(settings);
      } catch (e) {
        // Silently fail - email settings might not be accessible
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion à la base de données');
    } finally {
      setLoading(false);
    }
  };

  // Check if email is properly configured
  const isEmailConfigured = emailSettings?.smtp_host && emailSettings?.smtp_user;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-MU', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price) + ' Rs';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
    };
    const labels: Record<string, string> = {
      pending: 'En attente',
      approved: 'Approuvé',
      rejected: 'Rejeté',
      completed: 'Terminé',
    };
    return (
      <Badge className={styles[status] || 'bg-gray-100 text-gray-800'}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">Erreur de connexion</p>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <Button onClick={loadStats} variant="destructive">
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
        <div className="mt-6 p-4 bg-red-100 rounded-lg">
          <p className="text-sm text-red-700 font-medium mb-2">Vérifiez que :</p>
          <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
            <li>Les fichiers PHP sont bien uploadés sur A2hosting dans /api/</li>
            <li>La base de données MySQL est créée et le script SQL importé</li>
            <li>L'URL de l'API dans src/lib/api.ts pointe vers votre domaine</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Vue d'ensemble de votre activité</p>
        </div>
        <Button onClick={loadStats} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <Link to="/admin/quotes" className="block">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:opacity-90 cursor-pointer transition-opacity">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Devis</p>
                  <p className="text-3xl font-bold mt-1">{stats?.total_quotes || 0}</p>
                  {stats?.today_quotes ? (
                    <p className="text-blue-200 text-xs mt-1">+{stats.today_quotes} aujourd'hui</p>
                  ) : null}
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/quotes" className="block">
          <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white hover:opacity-90 cursor-pointer transition-opacity">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">En Attente</p>
                  <p className="text-3xl font-bold mt-1">{stats?.pending_quotes || 0}</p>
                  <p className="text-yellow-200 text-xs mt-1">À traiter</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/quotes" className="block">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white hover:opacity-90 cursor-pointer transition-opacity">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Approuvés</p>
                  <p className="text-3xl font-bold mt-1">{stats?.approved_quotes || 0}</p>
                  <p className="text-green-200 text-xs mt-1">Validés</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/quotes" className="block">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:opacity-90 cursor-pointer transition-opacity">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Chiffre d'Affaires</p>
                  <p className="text-xl font-bold mt-1">{formatPrice(stats?.total_revenue || 0)}</p>
                  <p className="text-purple-200 text-xs mt-1">Devis approuvés</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/model-requests" className="block">
          <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white hover:opacity-90 cursor-pointer transition-opacity">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-teal-100 text-sm">Demandes de Modèles</p>
                  <p className="text-3xl font-bold mt-1">{stats?.total_model_requests || 0}</p>
                  {(stats?.pending_model_requests || 0) > 0 ? (
                    <p className="text-teal-200 text-xs mt-1">{stats?.pending_model_requests} en attente</p>
                  ) : (
                    <p className="text-teal-200 text-xs mt-1">Total reçues</p>
                  )}
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <ClipboardList className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* DB Version Status — Sunbox */}
      {dbVersion && (
        dbVersion.is_up_to_date ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800 font-medium">
                  ✅ Base de données Sunbox à jour <span className="font-mono">(v{dbVersion.current_version})</span>
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Database className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">Mise à jour de la base de données disponible</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Version actuelle&nbsp;:&nbsp;<span className="font-mono">{dbVersion.current_version}</span>
                      &nbsp;→&nbsp;Version disponible&nbsp;:&nbsp;<span className="font-mono">{dbVersion.latest_version}</span>
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={handleUpdateDb}
                  disabled={dbUpdating}
                >
                  {dbUpdating
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Mise à jour…</>
                    : <><Database className="h-4 w-4 mr-2" />Mettre à jour la BD</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Pro Users Update Status */}
      {proUsers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-orange-500" />
              Mise à jour des sites professionnels
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {proUsers.map(user => {
                const v = user.versions;
                const loading = v === undefined;
                const filesOk = v?.files_up_to_date ?? false;
                const dbOk    = v?.db_up_to_date ?? false;
                const allOk   = filesOk && dbOk;
                return (
                  <div key={user.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                    {/* Identity */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-800 truncate">{user.company_name || user.name}</p>
                      <p className="text-xs text-gray-400 font-mono truncate">{user.domain}</p>
                    </div>

                    {/* Version chips */}
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : v?.error ? (
                      <span className="text-xs text-red-500">⚠ {v.error}</span>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        {filesOk ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            ✅ Fichiers <span className="font-mono">v{v?.current_file_version}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            ⚠ Fichiers <span className="font-mono">{v?.current_file_version} → {v?.latest_file_version}</span>
                          </span>
                        )}
                        {dbOk ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            ✅ BD <span className="font-mono">v{v?.current_db_version}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            ⚠ BD <span className="font-mono">{v?.current_db_version} → {v?.latest_db_version}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action buttons — only shown when update needed */}
                    {!loading && !allOk && (
                      <div className="flex gap-2">
                        {!filesOk && (
                          <Button size="sm" variant="outline"
                            className="text-blue-700 border-blue-300 hover:bg-blue-50 text-xs h-7 px-2"
                            onClick={() => handleDeployPro(user.id)}
                            disabled={user.deploying}>
                            {user.deploying
                              ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Déploiement…</>
                              : <><Upload className="h-3 w-3 mr-1" />Déployer fichiers</>}
                          </Button>
                        )}
                        {!dbOk && (
                          <Button size="sm" variant="outline"
                            className="text-purple-700 border-purple-300 hover:bg-purple-50 text-xs h-7 px-2"
                            onClick={() => handleInitProDb(user.id)}
                            disabled={user.initingDb}>
                            {user.initingDb
                              ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Mise à jour…</>
                              : <><HardDrive className="h-3 w-3 mr-1" />Mettre à jour BD</>}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Semi-Pro Site Status */}
      {semiProStatus && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-5 w-5 text-green-500" />
              Site partagé semi-pro
              <Button size="sm" variant="ghost" className="ml-auto h-6 px-2 text-xs text-gray-500"
                onClick={loadSemiProStatus}>
                <RefreshCw className="h-3 w-3 mr-1" /> Actualiser
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 font-mono">
                  sunbox-mauritius.com/pros/{semiProStatus.slug}
                </p>
                {semiProStatus.domain && (
                  <p className="text-xs text-gray-400">{semiProStatus.domain}</p>
                )}
              </div>
              {/* Version chips */}
              <div className="flex gap-2 flex-wrap">
                {semiProStatus.files_up_to_date ? (
                  <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" /> Fichiers <span className="font-mono">v{semiProStatus.current_version}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="h-3 w-3" /> Fichiers <span className="font-mono">{semiProStatus.current_version} → {semiProStatus.latest_version}</span>
                  </span>
                )}
                {semiProStatus.current_db_version ? (
                  semiProStatus.db_up_to_date ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> BD <span className="font-mono">v{semiProStatus.current_db_version}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="h-3 w-3" /> BD <span className="font-mono">{semiProStatus.current_db_version} → {semiProStatus.latest_db_version}</span>
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    BD non connectée
                  </span>
                )}
              </div>
              {/* Update actions — only when needed */}
              {(!semiProStatus.files_up_to_date || !semiProStatus.db_up_to_date) && (
                <div className="flex gap-2 flex-wrap">
                  {!semiProStatus.files_up_to_date && (
                    <Button size="sm" variant="outline"
                      className="text-blue-700 border-blue-300 hover:bg-blue-50 text-xs h-7 px-2"
                      onClick={handleSemiProUpdateFiles}
                      disabled={semiProUpdatingFiles}>
                      {semiProUpdatingFiles
                        ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Déploiement…</>
                        : <><Upload className="h-3 w-3 mr-1" />Déployer fichiers</>}
                    </Button>
                  )}
                  {!semiProStatus.db_up_to_date && semiProStatus.db_name && (
                    <Button size="sm" variant="outline"
                      className="text-purple-700 border-purple-300 hover:bg-purple-50 text-xs h-7 px-2"
                      onClick={handleSemiProUpdateDb}
                      disabled={semiProUpdatingDb}>
                      {semiProUpdatingDb
                        ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Mise à jour…</>
                        : <><HardDrive className="h-3 w-3 mr-1" />Mettre à jour BD</>}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {(stats?.pending_quotes || 0) > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-orange-900">
                    {stats?.pending_quotes} devis en attente de traitement
                  </p>
                  <p className="text-sm text-orange-700">
                    Cliquez pour voir et traiter les devis
                  </p>
                </div>
              </div>
              <Link to="/admin/quotes">
                <Button className="bg-orange-500 hover:bg-orange-600">
                  Voir les devis
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Quotes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            Devis Récents
          </CardTitle>
          <Link to="/admin/quotes">
            <Button variant="outline" size="sm">Voir tout</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {stats?.recent_quotes && stats.recent_quotes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-gray-500 text-sm">Référence</th>
                    <th className="pb-3 font-medium text-gray-500 text-sm">Client</th>
                    <th className="pb-3 font-medium text-gray-500 text-sm">Modèle</th>
                    <th className="pb-3 font-medium text-gray-500 text-sm">Total</th>
                    <th className="pb-3 font-medium text-gray-500 text-sm">Statut</th>
                    <th className="pb-3 font-medium text-gray-500 text-sm">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.recent_quotes.map((quote: any) => (
                    <tr key={quote.id} className="hover:bg-gray-50">
                      <td className="py-4 font-mono text-sm">
                        <Link
                          to={`/admin/quotes/${quote.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {quote.reference_number}
                        </Link>
                      </td>
                      <td className="py-4">
                        <div>
                          <p className="font-medium text-sm">{quote.customer_name}</p>
                          <p className="text-xs text-gray-500">{quote.customer_email}</p>
                        </div>
                      </td>
                      <td className="py-4 text-sm">
                        <div>
                          <p>{quote.model_name}</p>
                          <p className="text-xs text-gray-500 capitalize">{quote.model_type}</p>
                        </div>
                      </td>
                      <td className="py-4 font-semibold text-sm">{formatPrice(quote.total_price)}</td>
                      <td className="py-4">{getStatusBadge(quote.status)}</td>
                      <td className="py-4 text-gray-500 text-sm">
                        {new Date(quote.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun devis pour le moment</p>
              <p className="text-sm mt-1">Les devis soumis par les clients apparaîtront ici</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Stats */}
      {stats?.monthly_stats && stats.monthly_stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Statistiques Mensuelles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {stats.monthly_stats.map((month: any) => {
                const monthName = new Date(month.month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
                return (
                  <div key={month.month} className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500 capitalize">{monthName}</p>
                    <p className="text-2xl font-bold text-gray-900">{month.count}</p>
                    <p className="text-xs text-gray-500">devis</p>
                    <p className="text-sm font-medium text-green-600 mt-1">
                      {formatPrice(month.revenue || 0)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Configuration Warning - only show if NOT configured */}
      {!isEmailConfigured && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-900">Configuration Email Requise</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Configurez vos paramètres SMTP pour recevoir les notifications de nouveaux devis
                  et envoyer des confirmations aux clients.
                </p>
                <Link to="/admin/email" className="text-sm text-orange-600 hover:text-orange-700 font-medium mt-2 inline-block">
                  Configurer les emails →
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
