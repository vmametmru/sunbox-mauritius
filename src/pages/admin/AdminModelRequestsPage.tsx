import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cpu, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ModelRequest {
  id: number;
  user_id: number;
  user_name: string;
  company_name: string;
  description: string;
  container_20ft_count: number;
  container_40ft_count: number;
  bedrooms: number;
  bathrooms: number;
  linked_model_id: number | null;
  linked_model_name: string | null;
  sketch_url: string | null;
  status: 'pending' | 'in_review' | 'completed' | 'rejected';
  admin_notes: string | null;
  created_at: string;
}

interface Model {
  id: number;
  name: string;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:   { label: 'En attente', variant: 'secondary' },
  in_review: { label: 'En cours',   variant: 'default' },
  completed: { label: 'Complété',   variant: 'default' },
  rejected:  { label: 'Rejeté',     variant: 'destructive' },
};

export default function AdminModelRequestsPage() {
  const [requests, setRequests]   = useState<ModelRequest[]>([]);
  const [models, setModels]       = useState<Model[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [saving, setSaving]       = useState<number | null>(null);
  const [edits, setEdits]         = useState<Record<number, { status: string; admin_notes: string; linked_model_id: string }>>({});
  const { toast } = useToast();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [reqs, mods] = await Promise.all([
        api.getModelRequests(),
        api.getModels(),
      ]);
      setRequests(Array.isArray(reqs) ? reqs : []);
      setModels(Array.isArray(mods) ? mods : []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: number, req: ModelRequest) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!edits[id]) {
        setEdits((prev) => ({
          ...prev,
          [id]: {
            status:          req.status,
            admin_notes:     req.admin_notes ?? '',
            linked_model_id: req.linked_model_id ? String(req.linked_model_id) : '',
          },
        }));
      }
    }
  };

  const saveRequest = async (id: number) => {
    const edit = edits[id];
    if (!edit) return;
    setSaving(id);
    try {
      await api.updateModelRequest({
        id,
        status:          edit.status,
        admin_notes:     edit.admin_notes,
        linked_model_id: edit.linked_model_id ? parseInt(edit.linked_model_id) : null,
      });
      toast({ title: 'Enregistré', description: 'Demande mise à jour.' });
      loadAll();
      setExpandedId(null);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const setEdit = (id: number, field: string, value: string) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Cpu className="h-8 w-8 text-purple-500" />
            Demandes de Modèles
          </h1>
          <p className="text-gray-500 mt-1">{requests.length} demande(s) au total</p>
        </div>
        <Button variant="outline" onClick={loadAll} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : !requests.length ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-400">
            Aucune demande de modèle pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const status  = statusLabels[req.status] ?? { label: req.status, variant: 'outline' as const };
            const isOpen  = expandedId === req.id;
            const edit    = edits[req.id];

            return (
              <Card key={req.id}>
                <CardContent className="p-4">
                  {/* Header row */}
                  <div
                    className="flex items-center justify-between cursor-pointer gap-4 flex-wrap"
                    onClick={() => toggleExpand(req.id, req)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-800">
                          {req.company_name || req.user_name || `User #${req.user_id}`}
                        </span>
                        <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                        {req.linked_model_name && (
                          <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
                            Modèle : {req.linked_model_name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{req.description}</p>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                        {req.container_20ft_count > 0 && <span>{req.container_20ft_count}× 20ft</span>}
                        {req.container_40ft_count > 0 && <span>{req.container_40ft_count}× 40ft</span>}
                        {req.bedrooms > 0 && <span>{req.bedrooms} ch.</span>}
                        {req.bathrooms > 0 && <span>{req.bathrooms} sdb.</span>}
                        <span>{new Date(req.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.sketch_url && (
                        <a
                          href={req.sketch_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Croquis
                        </a>
                      )}
                      {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded edit panel */}
                  {isOpen && edit && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div>
                        <Label className="text-xs font-medium">Description complète</Label>
                        <p className="text-sm text-gray-700 mt-1 bg-gray-50 rounded p-3">{req.description}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs font-medium">Statut</Label>
                          <Select value={edit.status} onValueChange={(v) => setEdit(req.id, 'status', v)}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">En attente</SelectItem>
                              <SelectItem value="in_review">En cours</SelectItem>
                              <SelectItem value="completed">Complété</SelectItem>
                              <SelectItem value="rejected">Rejeté</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs font-medium">Modèle lié (optionnel)</Label>
                          <Select value={edit.linked_model_id || 'none'} onValueChange={(v) => setEdit(req.id, 'linked_model_id', v === 'none' ? '' : v)}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Aucun modèle lié" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Aucun</SelectItem>
                              {models.map((m) => (
                                <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs font-medium">Notes admin</Label>
                          <Textarea
                            className="mt-1 text-sm"
                            rows={3}
                            value={edit.admin_notes}
                            onChange={(e) => setEdit(req.id, 'admin_notes', e.target.value)}
                            placeholder="Note visible par le client..."
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setExpandedId(null)}>
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          className="bg-orange-500 hover:bg-orange-600"
                          disabled={saving === req.id}
                          onClick={() => saveRequest(req.id)}
                        >
                          {saving === req.id ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
