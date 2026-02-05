import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// ... types inchangés

// ... fonctions toBool, imgUrl inchangées

export default function MediaPage() {
  const { toast } = useToast();
  const [sp, setSp] = useSearchParams();

  const [models, setModels] = useState<ModelBrief[]>([]);
  const [modelId, setModelId] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState("photo");
  const [saving, setSaving] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [savingBanner, setSavingBanner] = useState(false);
  const [categoryImageFile, setCategoryImageFile] = useState<File | null>(null);
  const [savingCategoryImage, setSavingCategoryImage] = useState(false);
  const [items, setItems] = useState<ModelImageRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');

  const selectedModel = useMemo(() => models.find((m) => m.id === modelId) || null, [models, modelId]);

  async function loadModels() {
    try {
      const data = await api.getModels(undefined, false);
      const list: ModelBrief[] = Array.isArray(data)
        ? data.filter((m: any) => m?.id).map((m: any) => ({ id: Number(m.id), name: String(m.name || ""), type: m.type }))
        : [];
      setModels(list);
      const q = Number(sp.get("model_id") || 0);
      if (q > 0) {
        setModelId(q);
        return;
      }
      if (list.length > 0) setModelId(list[0].id);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Erreur chargement modèles", variant: "destructive" });
      setModels([]);
    }
  }

  async function loadImages(mid: number) {
    if (!mid) return setItems([]);
    setLoadingList(true);
    setError(null);
    try {
      const r = await fetch(`/api/media.php?action=model_list&model_id=${mid}`, {
        method: "GET",
        credentials: "include",
      });
      const j = await r.json().catch(() => ({}));
      const arr = j?.data?.items;
      setItems(Array.isArray(arr) ? arr : []);
    } catch (e: any) {
      setError(e?.message || "Erreur chargement images");
      setItems([]);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => { loadModels(); }, []);

  useEffect(() => {
    if (modelId) {
      const cur = Number(sp.get("model_id") || 0);
      if (cur !== modelId) {
        sp.set("model_id", String(modelId));
        setSp(sp, { replace: true });
      }
      loadImages(modelId);
    }
  }, [modelId]);

  async function uploadOne(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!modelId) return setError("Choisis un modèle.");
    if (!file) return setError("Choisis un fichier image.");

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("media_type", mediaType);

      const r = await fetch(`/api/media.php?action=model_upload&model_id=${modelId}`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.success) throw new Error(j?.error || "Upload failed");

      setFile(null);
      await loadImages(modelId);
      toast({ title: "OK", description: "Image uploadée" });
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setSaving(false);
    }
  }

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
      toast({ title: "OK", description: "Image de catégorie uploadée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Erreur upload image catégorie", variant: "destructive" });
    } finally {
      setSavingCategoryImage(false);
    }
  }

  async function deleteOne(id: number) {
    if (!confirm("Supprimer cette image ?")) return;
    try {
      const r = await fetch(`/api/media.php?action=model_delete&id=${id}`, {
        method: "POST",
        credentials: "include",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.success) throw new Error(j?.error || "Delete failed");
      await loadImages(modelId);
    } catch (e: any) {
      setError(e?.message || "Delete failed");
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
      await loadImages(modelId);
    } catch (e: any) {
      setError(e?.message || "Action failed");
    }
  }

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const model = models.find((m) => m.id === it.model_id);
      if (!model) return false;
      if (filterType !== 'all' && model.type !== filterType) return false;
      if (filterTag !== 'all' && it.media_type !== filterTag) return false;
      return true;
    });
  }, [items, filterType, filterTag, models]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Photos des modèles</h1>
        <p className="text-gray-500 mt-1">Ajoute des images pour chaque modèle ou pour le bandeau d’accueil.</p>
      </div>

      {/* Upload Bandeau */}
      <Card>
        <CardHeader><CardTitle>Image de bandeau (carousel d’accueil)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={uploadBanner}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-sm text-gray-600">Fichier image</label>
                <Input type="file" accept="image/*" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <Button type="submit" disabled={savingBanner || !bannerFile} className="w-full bg-orange-500 hover:bg-orange-600">
                  {savingBanner ? "Upload..." : "Uploader"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Upload Category Image */}
      <Card>
        <CardHeader><CardTitle>Image de catégorie d'option (100px × 100px)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Ces images seront utilisées pour illustrer les catégories d'options dans le configurateur.
            L'image sera affichée en format carré (100px × 100px).
          </p>
          <form onSubmit={uploadCategoryImage}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-sm text-gray-600">Fichier image</label>
                <Input type="file" accept="image/*" onChange={(e) => setCategoryImageFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <Button type="submit" disabled={savingCategoryImage || !categoryImageFile} className="w-full bg-orange-500 hover:bg-orange-600">
                  {savingCategoryImage ? "Upload..." : "Uploader"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Upload Model Images */}
      <Card>
        <CardHeader><CardTitle>Ajouter une image de modèle</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={uploadOne}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="text-sm text-gray-600">Modèle</label>
                <Select value={String(modelId)} onValueChange={(v) => setModelId(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Choisir un modèle" /></SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        #{m.id} — {m.name}
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
                <Select value={mediaType} onValueChange={setMediaType}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="photo">Photo</SelectItem>
                    <SelectItem value="plan">Plan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-600">Fichier image</label>
                <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>

              <div>
                <Button type="submit" disabled={saving || !modelId || !file} className="w-full bg-orange-500 hover:bg-orange-600">
                  {saving ? "Upload..." : "Uploader"}
                </Button>
              </div>
            </div>
            {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
          </form>
        </CardContent>
      </Card>

      {/* Galerie */}
      <Card>
        <CardHeader>
          <CardTitle>Images existantes</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtres Galerie */}
          <div className="flex flex-wrap gap-4 mb-6">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Type modèle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="container">Container</SelectItem>
                <SelectItem value="pool">Piscine</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Tag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous tags</SelectItem>
                <SelectItem value="photo">Photo</SelectItem>
                <SelectItem value="plan">Plan</SelectItem>
                <SelectItem value="bandeau">Bandeau</SelectItem>
                <SelectItem value="category_image">Image Catégorie</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredItems.map((it) => {
              const primary = toBool(it.is_primary);
              return (
                <div key={it.id} className="border rounded-xl overflow-hidden bg-white">
                  <div className="aspect-video bg-gray-100">
                    <img src={imgUrl(it.file_path)} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="text-xs text-gray-500 break-all">{it.file_path}</div>
                    <div className="flex gap-2 items-center">
                      {primary ? (
                        <Badge className="bg-green-600">Principale</Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setPrimary(it.id)}>Mettre principale</Button>
                      )}
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteOne(it.id)}>
                        Supprimer
                      </Button>
                    </div>
                    <div>
                      {it.media_type && <Badge variant="secondary">{it.media_type}</Badge>}
                    </div>
                  </div>
                </div>
              );
            })}
            {!loadingList && filteredItems.length === 0 && (
              <div className="text-sm text-gray-500">Aucune image pour ce modèle.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
