import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Cpu, Plus, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ModelRequest {
  id: number;
  description: string;
  container_20ft_count: number;
  container_40ft_count: number;
  bedrooms: number;
  bathrooms: number;
  sketch_url: string | null;
  status: 'pending' | 'in_review' | 'completed' | 'rejected';
  admin_notes: string | null;
  created_at: string;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'secondary' },
  in_review: { label: 'En cours', variant: 'default' },
  completed: { label: 'Complété', variant: 'default' },
  rejected: { label: 'Rejeté', variant: 'destructive' },
};

const emptyForm = {
  description: '',
  container_20ft_count: 0,
  container_40ft_count: 0,
  bedrooms: 1,
  bathrooms: 1,
  sketch_url: '',
};

export default function ProModelRequestPage() {
  const [requests, setRequests] = useState<ModelRequest[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingSketch, setUploadingSketch] = useState(false);
  const sketchInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await api.getModelRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSketchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setUploadingSketch(true);
      const r = await fetch('/api/upload_sketch.php', { method: 'POST', body: formData, credentials: 'include' });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || 'Upload échoué');
      setForm((prev) => ({ ...prev, sketch_url: j.url }));
      toast({ title: 'Croquis uploadé' });
    } catch (err: any) {
      toast({ title: 'Erreur upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingSketch(false);
    }
  };

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) {
      toast({ title: 'Erreur', description: 'La description est requise.', variant: 'destructive' });
      return;
    }
    if (!confirm('Soumettre la demande de modèle ? (3 000 Rs seront déduits)')) return;
    try {
      setSubmitting(true);
      await api.createModelRequest({
        description: form.description,
        container_20ft_count: form.container_20ft_count,
        container_40ft_count: form.container_40ft_count,
        bedrooms: form.bedrooms,
        bathrooms: form.bathrooms,
        sketch_url: form.sketch_url || undefined,
      });
      toast({ title: 'Demande envoyée', description: '3 000 Rs déduits. Votre demande est en cours de traitement.' });
      setForm({ ...emptyForm });
      loadRequests();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Demande de Modèle</h1>
        <p className="text-gray-500 mt-1">Demandez un modèle personnalisé — coût : 3 000 Rs</p>
      </div>

      {/* New request form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nouvelle demande
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitRequest} className="space-y-4">
            <div>
              <Label>Description du projet *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Décrivez votre projet en détail : type de maison, configuration souhaitée, contraintes particulières..."
                rows={5}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Containers 20ft</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.container_20ft_count}
                  onChange={(e) => setForm({ ...form, container_20ft_count: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Containers 40ft</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.container_40ft_count}
                  onChange={(e) => setForm({ ...form, container_40ft_count: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Chambres</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.bedrooms}
                  onChange={(e) => setForm({ ...form, bedrooms: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Salles de bain</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.bathrooms}
                  onChange={(e) => setForm({ ...form, bathrooms: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <Label>Croquis (JPG/PNG, optionnel)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => sketchInputRef.current?.click()}
                  disabled={uploadingSketch}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {uploadingSketch ? 'Upload...' : 'Choisir un fichier'}
                </Button>
                {form.sketch_url && (
                  <a href={form.sketch_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                    Voir le croquis
                  </a>
                )}
              </div>
              <input
                ref={sketchInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleSketchUpload}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600"
                disabled={submitting}
              >
                <Cpu className="h-4 w-4 mr-2" />
                {submitting ? 'Envoi...' : 'Soumettre (3 000 Rs)'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Previous requests */}
      <Card>
        <CardHeader>
          <CardTitle>Mes demandes précédentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-400 text-sm">Chargement...</p>
          ) : !requests.length ? (
            <p className="text-gray-400 text-sm">Aucune demande pour le moment.</p>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => {
                const status = statusLabels[req.status] ?? { label: req.status, variant: 'outline' as const };
                return (
                  <div key={req.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-800 line-clamp-2">{req.description}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                          {req.container_20ft_count > 0 && <span>{req.container_20ft_count}× 20ft</span>}
                          {req.container_40ft_count > 0 && <span>{req.container_40ft_count}× 40ft</span>}
                          {req.bedrooms > 0 && <span>{req.bedrooms} ch.</span>}
                          {req.bathrooms > 0 && <span>{req.bathrooms} sdb.</span>}
                        </div>
                        {req.admin_notes && (
                          <p className="mt-2 text-xs text-blue-700 bg-blue-50 rounded px-2 py-1">
                            Note admin : {req.admin_notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(req.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
