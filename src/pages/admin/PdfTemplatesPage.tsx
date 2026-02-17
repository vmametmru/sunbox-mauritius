import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  Star,
  StarOff,
  Copy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface PdfTemplate {
  id: number;
  name: string;
  description: string;
  document_type: 'devis' | 'rapport' | 'facture';
  row_count: number;
  col_count: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const docTypeLabels: Record<string, string> = {
  devis: 'Devis',
  rapport: 'Rapport',
  facture: 'Facture',
};

const docTypeBadgeColors: Record<string, string> = {
  devis: 'bg-blue-100 text-blue-800',
  rapport: 'bg-green-100 text-green-800',
  facture: 'bg-purple-100 text-purple-800',
};

export default function PdfTemplatesPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<PdfTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    document_type: 'devis' as 'devis' | 'rapport' | 'facture',
    row_count: 20,
    col_count: 10,
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const result = await api.getPdfTemplates();
      setTemplates(result || []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTemplate.name.trim()) {
      toast({ title: 'Erreur', description: 'Le nom est requis', variant: 'destructive' });
      return;
    }
    try {
      setCreating(true);
      const result = await api.createPdfTemplate({
        name: newTemplate.name,
        description: newTemplate.description,
        document_type: newTemplate.document_type,
        row_count: newTemplate.row_count,
        col_count: newTemplate.col_count,
      });
      toast({ title: 'Succès', description: 'Template créé' });
      setShowCreateDialog(false);
      setNewTemplate({ name: '', description: '', document_type: 'devis', row_count: 20, col_count: 10 });
      // Navigate to editor
      if (result?.id) {
        navigate(`/admin/pdf-templates/${result.id}`);
      } else {
        loadTemplates();
      }
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce template ?')) return;
    try {
      await api.deletePdfTemplate(id);
      toast({ title: 'Succès', description: 'Template supprimé' });
      loadTemplates();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleDefault = async (template: PdfTemplate) => {
    try {
      await api.updatePdfTemplate({
        id: template.id,
        is_default: !template.is_default,
      });
      toast({
        title: 'Succès',
        description: template.is_default ? 'Template retiré des défauts' : 'Template défini par défaut',
      });
      loadTemplates();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1A365D]">PDF Templates</h1>
            <p className="text-gray-600">Gérer les modèles de documents PDF (Devis, Rapports, Factures)</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Template
        </Button>
      </div>

      {/* Template List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">Aucun template PDF créé</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer votre premier template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                    {template.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{template.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Badge className={docTypeBadgeColors[template.document_type] || 'bg-gray-100'}>
                      {docTypeLabels[template.document_type] || template.document_type}
                    </Badge>
                    {template.is_default && (
                      <Badge className="bg-yellow-100 text-yellow-800">Défaut</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500 mb-4">
                  {template.row_count} lignes × {template.col_count} colonnes
                  <span className="mx-2">·</span>
                  {new Date(template.created_at).toLocaleDateString('fr-FR')}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => navigate(`/admin/pdf-templates/${template.id}`)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Éditer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleDefault(template)}
                    title={template.is_default ? 'Retirer le défaut' : 'Définir par défaut'}
                  >
                    {template.is_default ? (
                      <Star className="h-3 w-3 text-yellow-500" />
                    ) : (
                      <StarOff className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 ml-auto"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau Template PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nom</Label>
              <Input
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="Ex: Devis Standard"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Description du template"
                rows={2}
              />
            </div>
            <div>
              <Label>Type de document</Label>
              <Select
                value={newTemplate.document_type}
                onValueChange={(v) => setNewTemplate({ ...newTemplate, document_type: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="devis">Devis</SelectItem>
                  <SelectItem value="rapport">Rapport (à venir)</SelectItem>
                  <SelectItem value="facture">Facture (à venir)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre de lignes</Label>
                <Input
                  type="number"
                  min={5}
                  max={50}
                  value={newTemplate.row_count}
                  onChange={(e) => setNewTemplate({ ...newTemplate, row_count: parseInt(e.target.value) || 20 })}
                />
              </div>
              <div>
                <Label>Nombre de colonnes</Label>
                <Input
                  type="number"
                  min={2}
                  max={20}
                  value={newTemplate.col_count}
                  onChange={(e) => setNewTemplate({ ...newTemplate, col_count: parseInt(e.target.value) || 10 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Création...' : 'Créer et éditer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
