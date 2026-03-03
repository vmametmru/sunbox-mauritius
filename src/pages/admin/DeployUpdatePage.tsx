import React, { useRef, useState } from 'react';
import { Upload, CheckCircle2, AlertCircle, Loader2, RefreshCw, Package, Code2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { API_BASE_URL } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface DeployResult {
  status: 'ok' | 'error';
  file: string;
  extracted: number;
}

export default function DeployUpdatePage() {
  const { toast } = useToast();

  const distInputRef = useRef<HTMLInputElement>(null);
  const apiInputRef  = useRef<HTMLInputElement>(null);

  const [distFile, setDistFile] = useState<File | null>(null);
  const [apiFile,  setApiFile]  = useState<File | null>(null);

  const [status,  setStatus]  = useState<UploadStatus>('idle');
  const [error,   setError]   = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, DeployResult> | null>(null);

  const handleDeploy = async () => {
    if (!distFile && !apiFile) return;

    setStatus('uploading');
    setError(null);
    setResults(null);

    const formData = new FormData();
    if (distFile) formData.append('dist_zip', distFile);
    if (apiFile)  formData.append('api_zip',  apiFile);

    try {
      // POST directly to the PHP endpoint (uses same session cookie as the admin SPA)
      const res = await fetch(`${API_BASE_URL}/deploy_update.php`, {
        method:      'POST',
        credentials: 'include',
        body:        formData,
      });

      const text = await res.text();
      if (!text.trim()) {
        throw new Error('Réponse vide du serveur. Vérifiez que la session admin est active.');
      }
      let json: any;
      try {
        json = JSON.parse(text);
      } catch (parseErr: any) {
        throw new Error(`Réponse invalide du serveur (réponse non-JSON): ${parseErr.message}`);
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Déploiement échoué.');
      }

      setResults(json.results);
      setStatus('success');

      // If both files were deployed, hard-refresh and go to Dashboard
      const deployedKeys = Object.keys(json.results ?? {});
      const bothDeployed = deployedKeys.includes('dist') && deployedKeys.includes('api');

      if (bothDeployed) {
        toast({
          title: 'Déploiement réussi',
          description: 'Le site va se recharger dans 3 secondes…',
        });
        setTimeout(() => {
          // Navigate to admin dashboard first (updates the history entry)
          // then hard-reload so all cached JS/CSS bundles are replaced
          window.location.href = '/admin';
        }, 3000);
      } else {
        toast({ title: 'Déploiement partiel', description: 'Un seul artefact déployé.' });
      }
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
      toast({ title: 'Erreur déploiement', description: err.message, variant: 'destructive' });
    }
  };

  const reset = () => {
    setDistFile(null);
    setApiFile(null);
    setStatus('idle');
    setError(null);
    setResults(null);
    if (distInputRef.current) distInputRef.current.value = '';
    if (apiInputRef.current)  apiInputRef.current.value  = '';
  };

  const uploading = status === 'uploading';

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mise à jour du site</h1>
        <p className="text-sm text-gray-500 mt-1">
          Uploadez les artefacts téléchargés depuis GitHub Actions pour mettre à jour le site sans passer par cPanel.
        </p>
      </div>

      {/* Instructions */}
      <Card className="border-blue-100 bg-blue-50">
        <CardContent className="p-4 text-sm text-blue-800 space-y-1">
          <p className="font-semibold">Comment obtenir les fichiers ?</p>
          <ol className="list-decimal ml-4 space-y-1 text-blue-700">
            <li>Ouvrez la dernière exécution du workflow GitHub Actions.</li>
            <li>Téléchargez l'artefact <code className="bg-blue-100 px-1 rounded">dist.zip</code> (build Vite).</li>
            <li>Téléchargez l'artefact <code className="bg-blue-100 px-1 rounded">api.zip</code> (PHP API).</li>
            <li>Uploadez les deux ci-dessous et cliquez <strong>Déployer</strong>.</li>
          </ol>
          <p className="text-blue-600 text-xs mt-2">
            Après un déploiement complet (API + DIST), le site se rechargera automatiquement.
          </p>
        </CardContent>
      </Card>

      {/* Upload cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* DIST */}
        <Card className={distFile ? 'border-green-300' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-500" />
              DIST (interface)
            </CardTitle>
            <CardDescription className="text-xs">
              Artefact Vite — doit contenir <code>index.html</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={distInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => setDistFile(e.target.files?.[0] ?? null)}
              disabled={uploading || status === 'success'}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={uploading || status === 'success'}
              onClick={() => distInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5 mr-2" />
              {distFile ? distFile.name : 'Choisir dist.zip'}
            </Button>
            {distFile && (
              <p className="text-xs text-gray-500 mt-1 truncate">{(distFile.size / 1024).toFixed(0)} Ko</p>
            )}
            {results?.dist && (
              <div className="mt-2 flex items-center gap-1 text-xs text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {results.dist.extracted} fichiers extraits
              </div>
            )}
          </CardContent>
        </Card>

        {/* API */}
        <Card className={apiFile ? 'border-green-300' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Code2 className="h-4 w-4 text-blue-500" />
              API (backend PHP)
            </CardTitle>
            <CardDescription className="text-xs">
              Artefact API — doit contenir <code>index.php</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={apiInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => setApiFile(e.target.files?.[0] ?? null)}
              disabled={uploading || status === 'success'}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={uploading || status === 'success'}
              onClick={() => apiInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5 mr-2" />
              {apiFile ? apiFile.name : 'Choisir api.zip'}
            </Button>
            {apiFile && (
              <p className="text-xs text-gray-500 mt-1 truncate">{(apiFile.size / 1024).toFixed(0)} Ko</p>
            )}
            {results?.api && (
              <div className="mt-2 flex items-center gap-1 text-xs text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {results.api.extracted} fichiers extraits
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error banner */}
      {status === 'error' && error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success banner */}
      {status === 'success' && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Déploiement réussi !</p>
            {results && Object.keys(results).includes('dist') && Object.keys(results).includes('api') ? (
              <p className="text-xs mt-1">Redirection vers le Dashboard dans 3 secondes…</p>
            ) : (
              <p className="text-xs mt-1">Déploiement partiel — vous pouvez continuer avec l'autre artefact.</p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          disabled={(!distFile && !apiFile) || uploading || status === 'success'}
          onClick={handleDeploy}
          className="bg-orange-500 hover:bg-orange-600"
        >
          {uploading
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Déploiement en cours…</>
            : <><RefreshCw className="h-4 w-4 mr-2" />Déployer</>
          }
        </Button>
        {(status === 'error' || (status === 'success' && !Object.keys(results ?? {}).includes('api'))) && (
          <Button variant="outline" onClick={reset}>
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Hint when only one is selected */}
      {(distFile || apiFile) && !(distFile && apiFile) && status === 'idle' && (
        <p className="text-xs text-gray-500">
          💡 Vous pouvez déployer un seul artefact à la fois. Le rechargement automatique n'a lieu que si les deux sont déployés ensemble.
        </p>
      )}
    </div>
  );
}
