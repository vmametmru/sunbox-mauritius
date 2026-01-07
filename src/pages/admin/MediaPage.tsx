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

type ModelBrief = {
  id: number;
  name: string;
  type: "container" | "pool";
};

type ModelImageRow = {
  id: number;
  model_id: number;
  file_path: string;
  is_primary?: number | boolean;
  sort_order?: number | null;
  created_at?: string | null;
  media_type?: string;
};

function toBool(v: any) {
  return v === true || v === 1 || v === "1";
}

function imgUrl(filePath: string) {
  return "/" + String(filePath || "").replace(/^\/+/g, "");
}

export default function MediaPage() {
  const { toast } = useToast();
  const [sp, setSp] = useSearchParams();

  const [models, setModels] = useState<ModelBrief[]>([]);
  const [modelId, setModelId] = useState<number>(0);

  const [file, setFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState("photo");
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState<ModelImageRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedModel = useMemo(() => models.find((m) => m.id === modelId) || null, [models, modelId]);

  async function loadModels() {
    try {
      const data = await api.getModels(undefined, false);
      const list: ModelBrief[] = Array.isArray(data)
        ? data
            .filter((m: any) => m?.id)
            .map((m: any) => ({ id: Number(m.id), name: String(m.name || ""), type: m.type }))
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Photos des modèles</h1>
        <p className="text-gray-500 mt-1">Sélectionne un modèle, puis ajoute et gère ses images.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Ajouter une image</CardTitle></CardHeader>
        <CardContent className="space-y-4">
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
                  <SelectItem value="bandeau">Bandeau</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-600">Fichier image</label>
              <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>

            <div>
              <Button onClick={uploadOne as any} disabled={saving || !modelId || !file} className="w-full bg-orange-500 hover:bg-orange-600">
                {saving ? "Upload..." : "Uploader"}
              </Button>
            </div>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Images existantes</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map((it) => {
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
            {!loadingList && items.length === 0 && (
              <div className="text-sm text-gray-500">Aucune image pour ce modèle.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
