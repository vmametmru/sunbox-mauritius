import React, { useEffect, useState } from 'react';
import {
  Eye,
  Search,
  RefreshCw,
  Cpu,
  CheckCircle2,
  Clock,
  XCircle,
  Link2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

/* ================================================================
   TYPES
================================================================ */
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
  sketch_url: string | null;
  status: 'pending' | 'in_review' | 'completed' | 'rejected';
  admin_notes: string | null;
  linked_model_id: number | null;
  linked_model_name: string | null;
  created_at: string;
  updated_at: string;
}

interface Model {
  id: number;
  name: string;
  type: string;
  is_active: boolean;
}

/* ================================================================
   STATUS META
================================================================ */
const statusMeta: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }
> = {
  pending:   { label: 'En attente',  variant: 'secondary',    icon: Clock },
  in_review: { label: 'En cours',    variant: 'default',      icon: RefreshCw },
  completed: { label: 'Complété',    variant: 'default',      icon: CheckCircle2 },
  rejected:  { label: 'Rejeté',      variant: 'destructive',  icon: XCircle },
};

/* ================================================================
   COMPONENT
================================================================ */
export default function ProModelRequestsPage() {
  const [requests, setRequests]     = useState<ModelRequest[]>([]);
  const [models, setModels]         = useState<Model[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selected, setSelected]     = useState<ModelRequest | null>(null);
  const [saving, setSaving]         = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes]   = useState('');
  const [editLinkedModel, setEditLinkedModel] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [reqs, mods] = await Promise.all([
        api.getModelRequests(),
        api.getModels(undefined, false),
      ]);
      setRequests(Array.isArray(reqs) ? reqs : []);
      setModels(Array.isArray(mods) ? (mods as Model[]) : []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (req: ModelRequest) => {
    setSelected(req);
    setEditStatus(req.status);
    setEditNotes(req.admin_notes ?? '');
    setEditLinkedModel(req.linked_model_id ? String(req.linked_model_id) : '');
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      await api.updateModelRequest({
        id: selected.id,
        status: editStatus,
        admin_notes: editNotes,
        linked_model_id: editLinkedModel ? Number(editLinkedModel) : null,
      });
      toast({ title: 'Mis à jour', description: 'La demande a été mise à jour.' });
      setSelected(null);
      loadAll();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  /* ---- Filtered list ---- */
  const filtered = requests.filter((r) => {
    const matchSearch =
      !search ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      (r.user_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.company_name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  /* ---- Stats ---- */
  const counts = {
    pending:   requests.filter((r) => r.status === 'pending').length,
    in_review: requests.filter((r) => r.status === 'in_review').length,
    completed: requests.filter((r) => r.status === 'completed').length,
    rejected:  requests.filter((r) => r.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Demandes de Modèles Pro</h1>
          <p className="text-gray-500 mt-1">Gérez et traitez les demandes de modèles personnalisés des utilisateurs pro.</p>
        </div>
        <Button variant="outline" onClick={loadAll} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Rafraîchir
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([
          { key: 'pending',   label: 'En attente',  color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
          { key: 'in_review', label: 'En cours',    color: 'text-blue-600 bg-blue-50 border-blue-200' },
          { key: 'completed', label: 'Complétées',  color: 'text-green-600 bg-green-50 border-green-200' },
          { key: 'rejected',  label: 'Rejetées',    color: 'text-red-600 bg-red-50 border-red-200' },
        ] as const).map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
            className={`rounded-lg border p-4 text-left transition-all hover:opacity-90 ${color} ${filterStatus === key ? 'ring-2 ring-offset-1 ring-current' : ''}`}
          >
            <p className="text-2xl font-bold">{counts[key]}</p>
            <p className="text-sm font-medium">{label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par description, utilisateur ou entreprise..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="in_review">En cours</SelectItem>
            <SelectItem value="completed">Complété</SelectItem>
            <SelectItem value="rejected">Rejeté</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cpu className="h-5 w-5" />
            {filtered.length} demande{filtered.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center text-gray-400 py-10">Chargement...</p>
          ) : !filtered.length ? (
            <p className="text-center text-gray-400 py-10">Aucune demande trouvée.</p>
          ) : (
            <div className="divide-y">
              {filtered.map((req) => {
                const sm = statusMeta[req.status] ?? { label: req.status, variant: 'outline' as const, icon: Clock };
                const StatusIcon = sm.icon;
                return (
                  <div key={req.id} className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      {/* User + date */}
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-800">
                          {req.company_name || req.user_name || `User #${req.user_id}`}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(req.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </span>
                      </div>
                      {/* Description */}
                      <p className="text-sm text-gray-700 line-clamp-2">{req.description}</p>
                      {/* Specs */}
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                        {req.container_20ft_count > 0 && <span>{req.container_20ft_count}× 20ft</span>}
                        {req.container_40ft_count > 0 && <span>{req.container_40ft_count}× 40ft</span>}
                        {req.bedrooms > 0 && <span>{req.bedrooms} ch.</span>}
                        {req.bathrooms > 0 && <span>{req.bathrooms} sdb.</span>}
                        {req.sketch_url && (
                          <a href={req.sketch_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                            Croquis
                          </a>
                        )}
                      </div>
                      {/* Linked model */}
                      {req.linked_model_name && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-green-700 font-medium">
                          <Link2 className="h-3 w-3" />
                          Modèle lié : {req.linked_model_name}
                        </div>
                      )}
                      {/* Admin notes */}
                      {req.admin_notes && (
                        <p className="mt-1 text-xs text-blue-700 bg-blue-50 rounded px-2 py-0.5 inline-block">
                          {req.admin_notes}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge variant={sm.variant} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {sm.label}
                      </Badge>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => openEdit(req)}>
                        <Eye className="h-3.5 w-3.5" /> Gérer
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gérer la demande #{selected?.id}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 pt-2">
              {/* Info recap */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="text-sm font-semibold text-gray-700">
                  {selected.company_name || selected.user_name}
                </p>
                <p className="text-sm text-gray-600 line-clamp-3">{selected.description}</p>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  {selected.container_20ft_count > 0 && <span>{selected.container_20ft_count}× 20ft</span>}
                  {selected.container_40ft_count > 0 && <span>{selected.container_40ft_count}× 40ft</span>}
                  {selected.bedrooms > 0 && <span>{selected.bedrooms} ch.</span>}
                  {selected.bathrooms > 0 && <span>{selected.bathrooms} sdb.</span>}
                </div>
                {selected.sketch_url && (
                  <a href={selected.sketch_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                    Voir le croquis
                  </a>
                )}
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="in_review">En cours de traitement</SelectItem>
                    <SelectItem value="completed">Complété</SelectItem>
                    <SelectItem value="rejected">Rejeté</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Link to model */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <Link2 className="h-3.5 w-3.5" /> Lier à un modèle existant
                </Label>
                <Select value={editLinkedModel} onValueChange={setEditLinkedModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun modèle lié" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucun modèle lié</SelectItem>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name}{!m.is_active ? ' (inactif)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Admin notes */}
              <div className="space-y-1.5">
                <Label>Notes admin (visibles par l'utilisateur pro)</Label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ex: Votre modèle a été créé. Retrouvez-le dans la section Mes Modèles."
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelected(null)}>Annuler</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
