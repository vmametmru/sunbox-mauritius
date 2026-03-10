import React, { useState, useCallback } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  Terminal,
  Server,
  Database,
  Globe,
  Trash2,
  Clock,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { api, getApiLogs, clearApiLogs, ApiLogEntry } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PhpInfo {
  version: string;
  os: string;
  sapi: string;
  memory_limit: string;
  max_exec_time: string;
  upload_max: string;
  post_max: string;
  error_log: string | null;
  extensions: Record<string, boolean>;
}

interface DbInfo {
  status: 'ok' | 'error';
  version?: string;
  charset?: string;
  collation?: string;
  error?: string;
}

interface ProSiteInfo {
  user_id: number;
  domain: string;
  company_name: string;
  db_name: string;
  deployed_version: string | null;
  up_to_date: boolean;
  site_dir_exists: boolean;
  api_dir_exists: boolean;
}

interface DebugInfo {
  php: PhpInfo;
  db: DbInfo;
  versions: { pro_file: string; pro_db: string; sunbox_db: string };
  server: { software: string; timestamp: string; timezone: string };
  pro_sites: ProSiteInfo[];
  error_log_tail: string[];
  error_log_path: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
  return ok
    ? <Badge className="bg-green-100 text-green-800 border-green-200">{label ?? 'OK'}</Badge>
    : <Badge className="bg-red-100 text-red-800 border-red-200">{label ?? 'Erreur'}</Badge>;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-1.5 text-sm gap-4">
      <span className="text-gray-500 shrink-0 min-w-[160px]">{label}</span>
      <span className="font-mono text-xs text-right text-gray-800 break-all">{value}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DebugPage() {
  const { toast } = useToast();

  const [debugInfo, setDebugInfo]     = useState<DebugInfo | null>(null);
  const [loading, setLoading]         = useState(false);
  const [propagating, setPropagating] = useState(false);
  const [apiLogs, setApiLogs]         = useState<ApiLogEntry[]>([]);
  const [tab, setTab]                 = useState('system');

  const loadDebugInfo = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getDebugInfo();
      setDebugInfo(data as DebugInfo);
      toast({ title: 'Informations chargées', description: data.server?.timestamp });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handlePropagate = async () => {
    setPropagating(true);
    try {
      const result = await api.propagateProApiFiles() as any;
      toast({
        title: `${result.updated} site(s) mis à jour`,
        description: result.warnings?.length
          ? `Avertissements: ${result.warnings.join('; ')}`
          : `Version déployée: ${result.version}`,
        variant: result.warnings?.length ? 'destructive' : 'default',
      });
      // Refresh debug info to reflect new versions
      await loadDebugInfo();
    } catch (err: any) {
      toast({ title: 'Erreur propagation', description: err.message, variant: 'destructive' });
    } finally {
      setPropagating(false);
    }
  };

  const refreshLogs = () => setApiLogs(getApiLogs());
  const handleClearLogs = () => { clearApiLogs(); setApiLogs([]); };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-7 w-7 text-orange-500" />
            Débogage
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Informations système, état des sites pro et journal des appels API.
          </p>
        </div>
        <Button onClick={loadDebugInfo} disabled={loading} className="bg-orange-500 hover:bg-orange-600">
          {loading
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Chargement…</>
            : <><RefreshCw className="h-4 w-4 mr-2" />Actualiser</>}
        </Button>
      </div>

      {!debugInfo && !loading && (
        <Card className="border-blue-100 bg-blue-50">
          <CardContent className="p-4 text-sm text-blue-800">
            Cliquez sur <strong>Actualiser</strong> pour charger les informations de débogage du serveur.
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => { setTab(v); if (v === 'logs') refreshLogs(); }}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="system">
            <Server className="h-4 w-4 mr-1.5" />Système
          </TabsTrigger>
          <TabsTrigger value="prosites">
            <Globe className="h-4 w-4 mr-1.5" />Sites Pro
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Activity className="h-4 w-4 mr-1.5" />Journal API
          </TabsTrigger>
          <TabsTrigger value="errorlog">
            <Terminal className="h-4 w-4 mr-1.5" />Erreurs PHP
          </TabsTrigger>
        </TabsList>

        {/* ── Système ─────────────────────────────────────────────────── */}
        <TabsContent value="system" className="space-y-4 mt-4">
          {!debugInfo ? (
            <p className="text-sm text-gray-400 italic">Aucune donnée. Cliquez sur Actualiser.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PHP */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Server className="h-4 w-4 text-blue-500" />PHP
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y">
                  <InfoRow label="Version" value={debugInfo.php.version} />
                  <InfoRow label="OS" value={debugInfo.php.os} />
                  <InfoRow label="SAPI" value={debugInfo.php.sapi} />
                  <InfoRow label="Memory limit" value={debugInfo.php.memory_limit} />
                  <InfoRow label="Max exec time" value={`${debugInfo.php.max_exec_time}s`} />
                  <InfoRow label="Upload max" value={debugInfo.php.upload_max} />
                  <InfoRow label="Post max" value={debugInfo.php.post_max} />
                  <div className="py-1.5">
                    <p className="text-xs text-gray-500 mb-1">Extensions</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(debugInfo.php.extensions).map(([ext, loaded]) => (
                        <Badge key={ext} className={loaded ? 'bg-green-100 text-green-700 border-green-200 text-xs' : 'bg-red-100 text-red-700 border-red-200 text-xs'}>
                          {ext}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* DB + Server */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Database className="h-4 w-4 text-green-500" />Base de données
                      <StatusBadge ok={debugInfo.db.status === 'ok'} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y">
                    {debugInfo.db.status === 'ok' ? (
                      <>
                        <InfoRow label="Version MySQL" value={debugInfo.db.version ?? '—'} />
                        <InfoRow label="Charset" value={debugInfo.db.charset ?? '—'} />
                        <InfoRow label="Collation" value={debugInfo.db.collation ?? '—'} />
                      </>
                    ) : (
                      <p className="text-xs text-red-600 py-2">{debugInfo.db.error}</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Globe className="h-4 w-4 text-purple-500" />Serveur &amp; Versions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y">
                    <InfoRow label="Serveur web" value={debugInfo.server.software} />
                    <InfoRow label="Heure serveur" value={debugInfo.server.timestamp} />
                    <InfoRow label="Timezone" value={debugInfo.server.timezone} />
                    <Separator className="my-1" />
                    <InfoRow label="Pro File v" value={<Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">{debugInfo.versions.pro_file}</Badge>} />
                    <InfoRow label="Pro DB v" value={debugInfo.versions.pro_db} />
                    <InfoRow label="Sunbox DB v" value={debugInfo.versions.sunbox_db} />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Sites Pro ───────────────────────────────────────────────── */}
        <TabsContent value="prosites" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              État des fichiers déployés sur chaque site pro. La version cible est{' '}
              <strong>{debugInfo?.versions.pro_file ?? '…'}</strong>.
            </p>
            <Button
              size="sm"
              onClick={handlePropagate}
              disabled={propagating || !debugInfo}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {propagating
                ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Propagation…</>
                : <><Upload className="h-3.5 w-3.5 mr-2" />Propager les fichiers API</>}
            </Button>
          </div>

          {!debugInfo ? (
            <p className="text-sm text-gray-400 italic">Aucune donnée. Cliquez sur Actualiser.</p>
          ) : !Array.isArray(debugInfo.pro_sites) || debugInfo.pro_sites.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-gray-400">
                Aucun site pro configuré avec un domaine.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {(debugInfo.pro_sites as ProSiteInfo[]).map((site) => (
                <Card key={site.domain} className={!site.up_to_date ? 'border-orange-200' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{site.company_name || '—'}</span>
                          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{site.domain}</code>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-xs text-gray-500">
                          <span>BD: <code>{site.db_name || '—'}</code></span>
                          <span>·</span>
                          <span>Répertoire: {site.site_dir_exists ? '✓' : '✗'}</span>
                          <span>·</span>
                          <span>API: {site.api_dir_exists ? '✓' : '✗'}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {site.deployed_version
                          ? <StatusBadge ok={site.up_to_date} label={`v${site.deployed_version}`} />
                          : <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs">Non déployé</Badge>}
                        {!site.up_to_date && site.deployed_version && (
                          <p className="text-xs text-orange-600 mt-1">Màj requise → v{debugInfo.versions.pro_file}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Journal API ─────────────────────────────────────────────── */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {apiLogs.length} appel(s) enregistré(s) dans cette session.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={refreshLogs}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Actualiser
              </Button>
              <Button size="sm" variant="outline" onClick={handleClearLogs} disabled={apiLogs.length === 0}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />Vider
              </Button>
            </div>
          </div>

          {apiLogs.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-gray-400">
                Aucun appel API enregistré. Naviguez dans l'application pour générer des entrées.
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[500px] rounded-md border">
              <div className="divide-y">
                {apiLogs.map((entry) => (
                  <div key={entry.id} className="p-3 flex items-start gap-3 hover:bg-gray-50">
                    {entry.status === 'ok'
                      ? <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      : <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs font-semibold">{entry.action}</code>
                        <Badge className={entry.status === 'ok'
                          ? 'bg-green-100 text-green-700 border-green-200 text-xs'
                          : 'bg-red-100 text-red-700 border-red-200 text-xs'}>
                          {entry.status}
                        </Badge>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />{entry.durationMs}ms
                        </span>
                      </div>
                      {entry.error && (
                        <p className="text-xs text-red-600 mt-0.5 break-all">{entry.error}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* ── Erreurs PHP ─────────────────────────────────────────────── */}
        <TabsContent value="errorlog" className="space-y-4 mt-4">
          {!debugInfo ? (
            <p className="text-sm text-gray-400 italic">Aucune donnée. Cliquez sur Actualiser.</p>
          ) : (
            <>
              <Card className="border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-gray-500" />
                    Journal d'erreurs PHP
                    <CardDescription className="ml-2 text-xs">
                      {debugInfo.error_log_path ?? 'Chemin inconnu'}
                    </CardDescription>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {debugInfo.error_log_tail.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Journal vide ou non accessible.</p>
                  ) : (
                    <ScrollArea className="h-[460px]">
                      <pre className="text-xs font-mono whitespace-pre-wrap text-gray-700 leading-relaxed">
                        {debugInfo.error_log_tail.join('\n')}
                      </pre>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
