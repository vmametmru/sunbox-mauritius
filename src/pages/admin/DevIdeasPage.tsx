import React, { useEffect, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Lightbulb,
  GripVertical,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Star,
  Filter
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

/* ======================================================
   TYPES
====================================================== */
// DevIdea from backend (id is always present)
interface DevIdeaFromDB {
  id: number;
  name: string;
  script: string;
  statut: 'non_demarree' | 'en_cours' | 'completee';
  urgence: 'urgent' | 'non_urgent';
  importance: 'important' | 'non_important';
  priority_order: number;
  created_at?: string;
  updated_at?: string;
}

// DevIdea for editing (id is optional for new items)
interface DevIdea {
  id?: number;
  name: string;
  script: string;
  statut: 'non_demarree' | 'en_cours' | 'completee';
  urgence: 'urgent' | 'non_urgent';
  importance: 'important' | 'non_important';
  priority_order: number;
  created_at?: string;
  updated_at?: string;
}

const SCRIPT_PREVIEW_LENGTH = 300;

const emptyIdea: DevIdea = {
  name: '',
  script: '',
  statut: 'non_demarree',
  urgence: 'non_urgent',
  importance: 'non_important',
  priority_order: 0,
};

/* ======================================================
   COMPONENT
======================================================*/
export default function DevIdeasPage() {
  const [ideas, setIdeas] = useState<DevIdeaFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgenceFilter, setUrgenceFilter] = useState<string>('all');
  const [importanceFilter, setImportanceFilter] = useState<string>('all');
  const [editingIdea, setEditingIdea] = useState<DevIdea | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);

  const { toast } = useToast();

  /* ======================================================
     LOAD
  ====================================================== */
  useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    try {
      setLoading(true);
      const data = await api.getDevIdeas();
      // Filter to ensure all items have an id
      const validData = Array.isArray(data) ? data.filter((d: DevIdeaFromDB) => d.id != null) : [];
      setIdeas(validData);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
      setIdeas([]);
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     CRUD
  ====================================================== */
  const openNewIdea = () => {
    setEditingIdea({ ...emptyIdea });
    setIsDialogOpen(true);
  };

  const openEditIdea = (idea: DevIdeaFromDB) => {
    setEditingIdea({ ...idea });
    setIsDialogOpen(true);
  };

  const saveIdea = async () => {
    if (!editingIdea) return;

    try {
      setSaving(true);
      if (editingIdea.id) {
        await api.updateDevIdea(editingIdea as { id: number } & DevIdea);
        toast({ title: 'Succès', description: 'Idée mise à jour' });
      } else {
        await api.createDevIdea(editingIdea);
        toast({ title: 'Succès', description: 'Idée créée' });
      }

      setIsDialogOpen(false);
      loadIdeas();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteIdea = async (id: number) => {
    if (!confirm('Supprimer cette idée ?')) return;

    try {
      await api.deleteDevIdea(id);
      toast({ title: 'Succès', description: 'Idée supprimée' });
      loadIdeas();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const copyScript = async (idea: DevIdeaFromDB) => {
    if (!idea.script) {
      toast({ title: 'Info', description: 'Aucun script à copier' });
      return;
    }
    
    try {
      await navigator.clipboard.writeText(idea.script);
      setCopiedId(idea.id);
      toast({ title: 'Copié!', description: 'Script copié dans le presse-papier' });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast({ title: 'Erreur', description: 'Impossible de copier', variant: 'destructive' });
    }
  };

  /* ======================================================
     DRAG & DROP REORDER
  ====================================================== */
  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedId === null || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const filteredIdeas = getFilteredIdeas();
    const draggedIndex = filteredIdeas.findIndex(i => i.id === draggedId);
    const targetIndex = filteredIdeas.findIndex(i => i.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    // Reorder locally
    const newIdeas = [...filteredIdeas];
    const [draggedItem] = newIdeas.splice(draggedIndex, 1);
    newIdeas.splice(targetIndex, 0, draggedItem);

    // Create new order
    const orders = newIdeas.map((idea, index) => ({
      id: idea.id,
      priority_order: index + 1
    }));

    try {
      await api.reorderDevIdeas(orders);
      loadIdeas();
      toast({ title: 'Succès', description: 'Ordre mis à jour' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
    
    setDraggedId(null);
  };

  /* ======================================================
     FILTER & SORT
  ====================================================== */
  // Priority order for status: en_cours (1), non_demarree (2), completee (3)
  const getStatusPriority = (statut: string): number => {
    if (statut === 'en_cours') return 1;
    if (statut === 'non_demarree') return 2;
    return 3; // completee
  };

  // Priority order for urgence/importance combinations
  const getPriorityCategory = (urgence: string, importance: string): number => {
    if (urgence === 'urgent' && importance === 'important') return 1;      // Urgent et Important
    if (urgence === 'urgent' && importance === 'non_important') return 2;  // Urgent et Non Important
    if (urgence === 'non_urgent' && importance === 'important') return 3;  // Non Urgent et Important
    return 4;                                                               // Non Urgent et Non Important
  };

  const getFilteredIdeas = (): DevIdeaFromDB[] => {
    return ideas
      .filter(idea => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = idea.name.toLowerCase().includes(searchLower) ||
          (idea.script || '').toLowerCase().includes(searchLower);
        const matchesStatus = statusFilter === 'all' || idea.statut === statusFilter;
        const matchesUrgence = urgenceFilter === 'all' || idea.urgence === urgenceFilter;
        const matchesImportance = importanceFilter === 'all' || idea.importance === importanceFilter;
        return matchesSearch && matchesStatus && matchesUrgence && matchesImportance;
      })
      .sort((a, b) => {
        // 1. Sort by status first (en_cours > non_demarree > completee)
        const statusA = getStatusPriority(a.statut);
        const statusB = getStatusPriority(b.statut);
        if (statusA !== statusB) {
          return statusA - statusB;
        }
        // 2. Then by priority category (Urgent+Important > Urgent+NonImportant > NonUrgent+Important > NonUrgent+NonImportant)
        const priorityA = getPriorityCategory(a.urgence, a.importance);
        const priorityB = getPriorityCategory(b.urgence, b.importance);
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        // 3. Then sort alphabetically by name within each category
        return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
      });
  };

  const filteredIdeas = getFilteredIdeas();

  /* ======================================================
     STATUS HELPERS
  ====================================================== */
  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'non_demarree':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700"><Circle className="h-3 w-3 mr-1" />Non démarrée</Badge>;
      case 'en_cours':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700"><Clock className="h-3 w-3 mr-1" />En cours</Badge>;
      case 'completee':
        return <Badge variant="secondary" className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Complétée</Badge>;
      default:
        return <Badge variant="secondary">{statut}</Badge>;
    }
  };

  const getUrgenceBadge = (urgence: string) => {
    if (urgence === 'urgent') {
      return <Badge variant="destructive" className="bg-red-100 text-red-700"><AlertTriangle className="h-3 w-3 mr-1" />Urgent</Badge>;
    }
    return null;
  };

  const getImportanceBadge = (importance: string) => {
    if (importance === 'important') {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-700"><Star className="h-3 w-3 mr-1" />Important</Badge>;
    }
    return null;
  };

  const getStatusCount = (statut: string) => ideas.filter(i => i.statut === statut).length;
  const getUrgentCount = () => ideas.filter(i => i.urgence === 'urgent').length;
  const getImportantCount = () => ideas.filter(i => i.importance === 'important').length;

  /* ======================================================
     RENDER
  ====================================================== */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Idées de Développement</h1>
          <p className="text-gray-500 mt-1">{ideas.length} idées au total</p>
        </div>
        <Button onClick={openNewIdea} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Idée
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:border-gray-300" onClick={() => setStatusFilter('non_demarree')}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{getStatusCount('non_demarree')}</p>
            <p className="text-sm text-gray-500">Non démarrées</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-blue-300" onClick={() => setStatusFilter('en_cours')}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{getStatusCount('en_cours')}</p>
            <p className="text-sm text-gray-500">En cours</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-green-300" onClick={() => setStatusFilter('completee')}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{getStatusCount('completee')}</p>
            <p className="text-sm text-gray-500">Complétées</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-red-300" onClick={() => setUrgenceFilter(urgenceFilter === 'urgent' ? 'all' : 'urgent')}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{getUrgentCount()}</p>
            <p className="text-sm text-gray-500">Urgentes</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-orange-300" onClick={() => setImportanceFilter(importanceFilter === 'important' ? 'all' : 'important')}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{getImportantCount()}</p>
            <p className="text-sm text-gray-500">Importantes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher une idée..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="non_demarree">Non démarrée</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="completee">Complétée</SelectItem>
              </SelectContent>
            </Select>
            <Select value={urgenceFilter} onValueChange={setUrgenceFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Urgence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="non_urgent">Non urgent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={importanceFilter} onValueChange={setImportanceFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Importance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="important">Important</SelectItem>
                <SelectItem value="non_important">Non important</SelectItem>
              </SelectContent>
            </Select>
            {(statusFilter !== 'all' || urgenceFilter !== 'all' || importanceFilter !== 'all') && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  setStatusFilter('all');
                  setUrgenceFilter('all');
                  setImportanceFilter('all');
                }}
              >
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ideas List */}
      <div className="space-y-2">
        {filteredIdeas.map(idea => (
          <Card 
            key={idea.id} 
            className={`overflow-hidden transition-all ${draggedId === idea.id ? 'opacity-50' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, idea.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, idea.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 pt-1">
                  <GripVertical className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Lightbulb className="h-4 w-4 text-orange-600" />
                      </div>
                      <h3 className="font-bold text-gray-900">{idea.name}</h3>
                      {getStatusBadge(idea.statut)}
                      {getUrgenceBadge(idea.urgence)}
                      {getImportanceBadge(idea.importance)}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyScript(idea)}
                        title="Copier le script"
                      >
                        {copiedId === idea.id ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditIdea(idea)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteIdea(idea.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {idea.script && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                        {idea.script.length > SCRIPT_PREVIEW_LENGTH ? idea.script.substring(0, SCRIPT_PREVIEW_LENGTH) + '...' : idea.script}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredIdeas.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune idée trouvée</p>
              {(statusFilter !== 'all' || urgenceFilter !== 'all' || importanceFilter !== 'all' || searchTerm) && (
                <Button 
                  variant="link" 
                  onClick={() => {
                    setStatusFilter('all');
                    setUrgenceFilter('all');
                    setImportanceFilter('all');
                    setSearchTerm('');
                  }} 
                  className="mt-2"
                >
                  Réinitialiser les filtres
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingIdea?.id ? 'Modifier l\'idée' : 'Nouvelle Idée de Développement'}
            </DialogTitle>
          </DialogHeader>

          {editingIdea && (
            <div className="space-y-4">
              <div>
                <Label>Nom de l'idée *</Label>
                <Input
                  value={editingIdea.name}
                  onChange={(e) =>
                    setEditingIdea({ ...editingIdea, name: e.target.value })
                  }
                  placeholder="Décrire brièvement l'idée"
                />
              </div>

              <div>
                <Label>Script (pour Copilot)</Label>
                <Textarea
                  value={editingIdea.script}
                  onChange={(e) =>
                    setEditingIdea({ ...editingIdea, script: e.target.value })
                  }
                  placeholder="Collez ici le script ou les instructions détaillées pour le développement..."
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Statut</Label>
                  <Select
                    value={editingIdea.statut}
                    onValueChange={(value: 'non_demarree' | 'en_cours' | 'completee') =>
                      setEditingIdea({ ...editingIdea, statut: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non_demarree">Non démarrée</SelectItem>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="completee">Complétée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Urgence</Label>
                  <Select
                    value={editingIdea.urgence}
                    onValueChange={(value: 'urgent' | 'non_urgent') =>
                      setEditingIdea({ ...editingIdea, urgence: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non_urgent">Non urgent</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Importance</Label>
                  <Select
                    value={editingIdea.importance}
                    onValueChange={(value: 'important' | 'non_important') =>
                      setEditingIdea({ ...editingIdea, importance: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non_important">Non important</SelectItem>
                      <SelectItem value="important">Important</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={saveIdea}
                  disabled={saving || !editingIdea.name}
                  className="bg-orange-500 hover:bg-orange-600"
                >
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
