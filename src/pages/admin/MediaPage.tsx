import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Image, LayoutGrid, FileImage } from "lucide-react";

// Types
interface ModelBrief {
  id: number;
  name: string;
  type: string;
}

interface ModelImageRow {
  id: number;
  model_id: number;
  file_path: string;
  is_primary: number | boolean;
  media_type: string;
  model_name?: string;
  model_type?: string;
}

// Helper functions
function toBool(val: number | boolean | string | null | undefined): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') return val === '1' || val.toLowerCase() === 'true';
  return false;
}

function imgUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return '/' + path.replace(/^\/+/, '');
}

export default function MediaPage() {
  const { toast } = useToast();

  // Current tab
  const [activeTab, setActiveTab] = useState<string>("bandeau");

  // Models list (for model images tab)
  const [models, setModels] = useState<ModelBrief[]>([]);
  
  // Upload states
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [savingBanner, setSavingBanner] = useState(false);
  const [categoryImageFile, setCategoryImageFile] = useState<File | null>(null);
  const [savingCategoryImage, setSavingCategoryImage] = useState(false);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [savingModel, setSavingModel] = useState(false);
  const [uploadModelId, setUploadModelId] = useState<number>(0);
  const [uploadMediaType, setUploadMediaType] = useState<string>("photo");

  // Gallery items per tab
  const [bannerImages, setBannerImages] = useState<ModelImageRow[]>([]);
  const [categoryImages, setCategoryImages] = useState<ModelImageRow[]>([]);
  const [modelImages, setModelImages] = useState<ModelImageRow[]>([]);

  // Loading states
  const [loadingBanner, setLoadingBanner] = useState(false);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  // Model images filters
  const [filterModelId, setFilterModelId] = useState<string>("all");
  const [filterImageType, setFilterImageType] = useState<string>("all");

  const selectedModel = useMemo(() => models.find((m) => m.id === uploadModelId) || null, [models, uploadModelId]);

  // ===============================
  // LOAD FUNCTIONS
  // ===============================
  async function loadModels() {
    try {
      const data = await api.getModels(undefined, false);
      const list: ModelBrief[] = Array.isArray(data)
        ? data.filter((m: any) => m?.id).map((m: any) => ({ id: Number(m.id), name: String(m.name || ""), type: m.type }))
        : [];
      setModels(list);
      if (list.length > 0 && uploadModelId === 0) {
        setUploadModelId(list[0].id);
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Erreur chargement modèles", variant: "destructive" });
      setModels([]);
    }
  }

  async function loadBannerImages() {
    setLoadingBanner(true);
    try {
      const r = await fetch(`/api/media.php?action=list_by_media_type&media_type=bandeau`, {
        method: "GET",
        credentials: "include",
      });
      const j = await r.json().catch(() => ({}));
      const arr = j?.data?.items;
      setBannerImages(Array.isArray(arr) ? arr : []);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Erreur chargement bandeaux", variant: "destructive" });
      setBannerImages([]);
    } finally {
      setLoadingBanner(false);
    }
  }

  async function loadCategoryImages() {
    setLoadingCategory(true);
    try {
      const r = await fetch(`/api/media.php?action=list_by_media_type&media_type=category_image`, {
        method: "GET",
        credentials: "include",
      });
      const j = await r.json().catch(() => ({}));
      const arr = j?.data?.items;
      setCategoryImages(Array.isArray(arr) ? arr : []);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Erreur chargement images catégories", variant: "destructive" });
      setCategoryImages([]);
    } finally {
      setLoadingCategory(false);
    }
  }

  async function loadModelImages() {
    setLoadingModels(true);
    try {
      let url = `/api/media.php?action=list_model_images`;
      if (filterModelId !== "all") {
        url += `&model_id=${filterModelId}`;
      }
      if (filterImageType !== "all") {
        url += `&image_type=${filterImageType}`;
      }
      const r = await fetch(url, {
        method: "GET",
        credentials: "include",
      });
      const j = await r.json().catch(() => ({}));
      const arr = j?.data?.items;
      setModelImages(Array.isArray(arr) ? arr : []);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Erreur chargement images modèles", variant: "destructive" });
      setModelImages([]);
    } finally {
      setLoadingModels(false);
    }
  }

  // ===============================
  // EFFECTS
  // ===============================
  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    // Load appropriate data when tab changes
    if (activeTab === "bandeau") {
      loadBannerImages();
    } else if (activeTab === "category") {
      loadCategoryImages();
    } else if (activeTab === "models") {
      loadModelImages();
    }
  }, [activeTab]);

  useEffect(() => {
    // Reload model images when filters change
    if (activeTab === "models") {
      loadModelImages();
    }
  }, [filterModelId, filterImageType]);

  // ===============================
  // UPLOAD FUNCTIONS
  // ===============================
  async function uploadBanner(e: React.FormEvent) {
    e.preventDefault();
    if (!bannerFile) return;
    setSavingBanner(true);
    try {
      const fd = new FormData();
      fd.append("file", bannerFile);
      fd.append("media_type", "bandeau");
      fd.append("model_id", "0");

      const r = await fetch(`/api/media.php?action=model_upload&model_id=0`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.success) throw new Error(j?.error || "Upload bandeau échoué");

      setBannerFile(null);
      // Reset the file input
      const fileInput = document.getElementById('banner-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      await loadBannerImages();
      toast({ title: "OK", description: "Image bandeau uploadée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Erreur upload bandeau", variant: "destructive" });
    } finally {
      setSavingBanner(false);
    }
  }

  async function uploadCategoryImage(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryImageFile) return;
    setSavingCategoryImage(true);
    try {
      const fd = new FormData();
      fd.append("file", categoryImageFile);
      fd.append("media_type", "category_image");
      fd.append("model_id", "0");

      const r = await fetch(`/api/media.php?action=model_upload&model_id=0`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.success) throw new Error(j?.error || "Upload image catégorie échoué");

      setCategoryImageFile(null);
      // Reset the file input
      const fileInput = document.getElementById('category-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      await loadCategoryImages();
      toast({ title: "OK", description: "Image de catégorie uploadée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Erreur upload image catégorie", variant: "destructive" });
    } finally {
      setSavingCategoryImage(false);
    }
  }

  async function uploadModelImage(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadModelId || !modelFile) return;
    setSavingModel(true);
    try {
      const fd = new FormData();
      fd.append("file", modelFile);
      fd.append("media_type", uploadMediaType);

      const r = await fetch(`/api/media.php?action=model_upload&model_id=${uploadModelId}`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.success) throw new Error(j?.error || "Upload failed");

      setModelFile(null);
      // Reset the file input
      const fileInput = document.getElementById('model-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      await loadModelImages();
      toast({ title: "OK", description: "Image uploadée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Upload failed", variant: "destructive" });
    } finally {
      setSavingModel(false);
    }
  }

  // ===============================
  // DELETE & SET PRIMARY
  // ===============================
  async function deleteImage(id: number, reloadFn: () => Promise<void>) {
    if (!confirm("Supprimer cette image ?")) return;
    try {
      const r = await fetch(`/api/media.php?action=model_delete&id=${id}`, {
        method: "POST",
        credentials: "include",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.success) throw new Error(j?.error || "Delete failed");
      await reloadFn();
      toast({ title: "OK", description: "Image supprimée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Delete failed", variant: "destructive" });
    }
  }

  async function setPrimary(id: number) {
    try {
      const r = await fetch(`/api/media.php?action=model_set_primary&id=${id}`, {
        method: "POST",
        credentials: "include",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.success) throw new Error(j?.error || "Action failed");
      await loadModelImages();
      toast({ title: "OK", description: "Image définie comme principale" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Action failed", variant: "destructive" });
    }
  }

  // ===============================
  // RENDER HELPER: IMAGE CARD
  // ===============================
  function renderImageCard(
    item: ModelImageRow, 
    showPrimary: boolean, 
    reloadFn: () => Promise<void>,
    showModelInfo: boolean = false
  ) {
    const primary = toBool(item.is_primary);
    return (
      <div key={item.id} className="border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
        <div className="aspect-video bg-gray-100 relative">
          <img src={imgUrl(item.file_path)} alt="" className="w-full h-full object-cover" loading="lazy" />
          {showModelInfo && item.model_name && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-black/70 text-white">{item.model_name}</Badge>
            </div>
          )}
          {item.media_type && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="capitalize">
                {item.media_type === 'photo' ? 'Photo' : item.media_type === 'plan' ? 'Plan' : item.media_type}
              </Badge>
            </div>
          )}
        </div>
        <div className="p-3 space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            {showPrimary && (
              primary ? (
                <Badge className="bg-green-600">Principale</Badge>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setPrimary(item.id)}>
                  Définir principale
                </Button>
              )
            )}
            <Button 
              size="sm" 
              variant="outline" 
              className="text-red-600 hover:bg-red-50" 
              onClick={() => deleteImage(item.id, reloadFn)}
            >
              Supprimer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ===============================
  // RENDER
  // ===============================
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Galerie Photos</h1>
        <p className="text-gray-500 mt-1">Gérez les images du site : bandeaux, catégories d'options et modèles.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="bandeau" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            <span>Bandeau</span>
            <Badge variant="secondary" className="ml-1">{bannerImages.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="category" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span>Catégories</span>
            <Badge variant="secondary" className="ml-1">{categoryImages.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="models" className="flex items-center gap-2">
            <FileImage className="h-4 w-4" />
            <span>Modèles</span>
            <Badge variant="secondary" className="ml-1">{modelImages.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ===================== TAB: BANDEAU ===================== */}
        <TabsContent value="bandeau" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ajouter une image de bandeau</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Ces images apparaissent dans le carousel de la page d'accueil.
              </p>
              <form onSubmit={uploadBanner}>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <label className="text-sm text-gray-600">Fichier image</label>
                    <Input 
                      id="banner-file-input"
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setBannerFile(e.target.files?.[0] || null)} 
                    />
                  </div>
                  <div>
                    <Button type="submit" disabled={savingBanner || !bannerFile} className="bg-orange-500 hover:bg-orange-600">
                      {savingBanner ? "Upload..." : "Uploader"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Images de bandeau ({bannerImages.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBanner ? (
                <div className="text-center py-8 text-gray-500">Chargement...</div>
              ) : bannerImages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Aucune image de bandeau.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {bannerImages.map((item) => renderImageCard(item, false, loadBannerImages))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB: CATEGORY ===================== */}
        <TabsContent value="category" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ajouter une image de catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Ces images (100px × 100px) illustrent les catégories d'options dans le configurateur.
              </p>
              <form onSubmit={uploadCategoryImage}>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <label className="text-sm text-gray-600">Fichier image</label>
                    <Input 
                      id="category-file-input"
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setCategoryImageFile(e.target.files?.[0] || null)} 
                    />
                  </div>
                  <div>
                    <Button type="submit" disabled={savingCategoryImage || !categoryImageFile} className="bg-orange-500 hover:bg-orange-600">
                      {savingCategoryImage ? "Upload..." : "Uploader"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Images de catégories ({categoryImages.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCategory ? (
                <div className="text-center py-8 text-gray-500">Chargement...</div>
              ) : categoryImages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Aucune image de catégorie.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {categoryImages.map((item) => (
                    <div key={item.id} className="border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="aspect-square bg-gray-100">
                        <img src={imgUrl(item.file_path)} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="p-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full text-red-600 hover:bg-red-50" 
                          onClick={() => deleteImage(item.id, loadCategoryImages)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB: MODELS ===================== */}
        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ajouter une image de modèle</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Ajoutez des photos ou des plans pour vos modèles de containers et piscines.
              </p>
              <form onSubmit={uploadModelImage}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="text-sm text-gray-600">Modèle</label>
                    <Select value={String(uploadModelId)} onValueChange={(v) => setUploadModelId(Number(v))}>
                      <SelectTrigger><SelectValue placeholder="Choisir un modèle" /></SelectTrigger>
                      <SelectContent>
                        {models.map((m) => (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {m.name} ({m.type === "container" ? "Container" : "Piscine"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedModel && (
                      <div className="mt-2">
                        <Badge>{selectedModel.type === "container" ? "Container" : "Piscine"}</Badge>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">Type d'image</label>
                    <Select value={uploadMediaType} onValueChange={setUploadMediaType}>
                      <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="photo">Photo</SelectItem>
                        <SelectItem value="plan">Plan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">Fichier image</label>
                    <Input 
                      id="model-file-input"
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setModelFile(e.target.files?.[0] || null)} 
                    />
                  </div>

                  <div>
                    <Button type="submit" disabled={savingModel || !uploadModelId || !modelFile} className="w-full bg-orange-500 hover:bg-orange-600">
                      {savingModel ? "Upload..." : "Uploader"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Images des modèles ({modelImages.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Filtrer par modèle</label>
                  <Select value={filterModelId} onValueChange={setFilterModelId}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Tous les modèles" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les modèles</SelectItem>
                      {models.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-gray-600 block mb-1">Type d'image</label>
                  <Select value={filterImageType} onValueChange={setFilterImageType}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Tous types" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous types</SelectItem>
                      <SelectItem value="photo">Photo</SelectItem>
                      <SelectItem value="plan">Plan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loadingModels ? (
                <div className="text-center py-8 text-gray-500">Chargement...</div>
              ) : modelImages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Aucune image de modèle trouvée.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {modelImages.map((item) => renderImageCard(item, true, loadModelImages, true))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
