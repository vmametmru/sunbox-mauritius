import React, { useEffect, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Tag,
  Image as ImageIcon
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

/* ======================================================
   TYPES
====================================================== */
interface CategoryImage {
  id: number;
  url: string;
}

interface OptionCategory {
  id?: number;
  name: string;
  description: string;
  display_order: number;
  image_id: number | null;
  image_url?: string | null;
}

const emptyCategory: OptionCategory = {
  name: '',
  description: '',
  display_order: 0,
  image_id: null,
  image_url: null,
};

/* ======================================================
   COMPONENT
====================================================== */
export default function OptionCategoriesPage() {
  const [categories, setCategories] = useState<OptionCategory[]>([]);
  const [categoryImages, setCategoryImages] = useState<CategoryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCategory, setEditingCategory] = useState<OptionCategory | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImageSelectorOpen, setIsImageSelectorOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  /* ======================================================
     LOAD
  ====================================================== */
  useEffect(() => {
    loadCategories();
    loadCategoryImages();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await api.getOptionCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryImages = async () => {
    try {
      const data = await api.getCategoryImages();
      setCategoryImages(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error loading category images:', err);
      setCategoryImages([]);
    }
  };

  /* ======================================================
     CRUD
  ====================================================== */
  const openNewCategory = () => {
    setEditingCategory({ ...emptyCategory });
    setIsDialogOpen(true);
  };

  const openEditCategory = (category: OptionCategory) => {
    setEditingCategory({ ...category });
    setIsDialogOpen(true);
  };

  const saveCategory = async () => {
    if (!editingCategory) return;

    try {
      setSaving(true);
      if (editingCategory.id) {
        await api.updateOptionCategory({
          id: editingCategory.id,
          name: editingCategory.name,
          description: editingCategory.description,
          display_order: editingCategory.display_order,
          image_id: editingCategory.image_id,
        });
        toast({ title: 'Succès', description: 'Catégorie mise à jour' });
      } else {
        await api.createOptionCategory({
          name: editingCategory.name,
          description: editingCategory.description,
          display_order: editingCategory.display_order,
          image_id: editingCategory.image_id,
        });
        toast({ title: 'Succès', description: 'Catégorie créée' });
      }

      setIsDialogOpen(false);
      loadCategories();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm('Supprimer cette catégorie ?')) return;

    try {
      await api.deleteOptionCategory(id);
      toast({ title: 'Succès', description: 'Catégorie supprimée' });
      loadCategories();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const selectImage = (image: CategoryImage | null) => {
    if (editingCategory) {
      setEditingCategory({
        ...editingCategory,
        image_id: image?.id || null,
        image_url: image?.url || null,
      });
    }
    setIsImageSelectorOpen(false);
  };

  /* ======================================================
     FILTER
  ====================================================== */
  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ======================================================
     RENDER
  ====================================================== */
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Catégories d'options</h1>
          <p className="text-gray-500 mt-1">{categories.length} catégories au total</p>
        </div>
        <Button onClick={openNewCategory} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Catégorie
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher une catégorie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map(category => (
          <Card key={category.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-orange-100 rounded flex items-center justify-center">
                      <Tag className="h-6 w-6 text-orange-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold">{category.name}</h3>
                    <p className="text-sm text-gray-500">Ordre: {category.display_order}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEditCategory(category)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  {category.id && (
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteCategory(category.id!)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {category.description && (
                <div className="mt-3 text-sm text-gray-600 whitespace-pre-line">
                  {category.description}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCategories.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">Aucune catégorie trouvée.</p>
          </CardContent>
        </Card>
      )}

      {/* CREATE / EDIT MODAL */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory?.id ? 'Modifier la Catégorie' : 'Nouvelle Catégorie'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory?.id 
                ? 'Modifiez les informations de la catégorie d\'options.'
                : 'Créez une nouvelle catégorie pour organiser les options.'}
            </DialogDescription>
          </DialogHeader>

          {editingCategory && (
            <div className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Input
                  value={editingCategory.name}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, name: e.target.value })
                  }
                  placeholder="Nom de la catégorie"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingCategory.description}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, description: e.target.value })
                  }
                  placeholder="Description de la catégorie..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Ordre d'affichage</Label>
                <Input
                  type="number"
                  value={editingCategory.display_order}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, display_order: Number(e.target.value) })
                  }
                />
              </div>

              <div>
                <Label>Image de la catégorie (100px × 100px)</Label>
                <div className="mt-2 flex items-center gap-4">
                  {editingCategory.image_url ? (
                    <img
                      src={editingCategory.image_url}
                      alt="Preview"
                      className="w-[100px] h-[100px] rounded object-cover border"
                    />
                  ) : (
                    <div className="w-[100px] h-[100px] bg-gray-100 rounded flex items-center justify-center border">
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsImageSelectorOpen(true)}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Choisir une image
                    </Button>
                    {editingCategory.image_url && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => setEditingCategory({ ...editingCategory, image_id: null, image_url: null })}
                      >
                        Supprimer l'image
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={saveCategory}
                  disabled={saving || !editingCategory.name}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* IMAGE SELECTOR MODAL */}
      <Dialog open={isImageSelectorOpen} onOpenChange={setIsImageSelectorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choisir une image</DialogTitle>
            <DialogDescription>
              Sélectionnez une image de catégorie depuis la galerie. 
              Vous pouvez uploader de nouvelles images dans <strong>Photos &gt; Image de catégorie d'option</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-4 max-h-[400px] overflow-y-auto py-4">
            {categoryImages.map(image => (
              <button
                key={image.id}
                onClick={() => selectImage(image)}
                className={`
                  relative aspect-square rounded overflow-hidden border-2 transition-all
                  hover:border-orange-500 hover:shadow-md
                  ${editingCategory?.image_id === image.id ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200'}
                `}
              >
                <img
                  src={image.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          {categoryImages.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <ImageIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p>Aucune image de catégorie disponible.</p>
              <p className="text-sm mt-2">
                Uploadez des images dans <strong>Photos &gt; Image de catégorie d'option</strong>
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsImageSelectorOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="ghost"
              className="text-red-600"
              onClick={() => selectImage(null)}
            >
              Sans image
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
