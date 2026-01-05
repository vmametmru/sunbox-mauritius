import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Home, Droplets } from "lucide-react";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Model = {
  id?: number;
  name: string;
  type: "container" | "pool";
  description: string;
  base_price: number;
  dimensions: string;
  bedrooms?: number;
  bathrooms?: number;
  image_url?: string;
  plan_image_url?: string;
  features: string[];
  is_active: boolean;
};

const emptyModel: Model = {
  name: "",
  type: "container",
  description: "",
  base_price: 0,
  dimensions: "",
  bedrooms: 0,
  bathrooms: 0,
  image_url: "",
  plan_image_url: "",
  features: [],
  is_active: true,
};

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [editing, setEditing] = useState<Model | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  const load = async () => {
    const data = await api.getModels(undefined, false);
    setModels(Array.isArray(data) ? data : []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    editing.id ? await api.updateModel(editing) : await api.createModel(editing);
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">Modèles</h1>
        <Button onClick={() => setEditing({ ...emptyModel })}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {models.map((m) => (
          <div key={m.id} className="bg-white rounded shadow overflow-hidden">
            <div className="relative aspect-video bg-gray-100">
              {m.image_url ? (
                <img
                  src={m.image_url}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setZoom(m.image_url!)}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  {m.type === "container" ? <Home /> : <Droplets />}
                </div>
              )}

              {m.plan_image_url && (
                <img
                  src={m.plan_image_url}
                  className="absolute bottom-2 right-2 w-14 h-14 bg-white p-1 rounded shadow cursor-pointer object-contain"
                  onClick={() => setZoom(m.plan_image_url!)}
                />
              )}
            </div>

            <div className="p-4">
              <h3 className="font-bold">{m.name}</h3>
              <p className="text-sm text-gray-500">{m.description}</p>

              <div className="flex justify-between mt-4">
                <Button size="sm" variant="outline" onClick={() => setEditing(m)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600"
                  onClick={() => api.deleteModel(m.id!)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* EDIT MODAL */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifier" : "Créer"} modèle</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-3">
              <Label>Nom</Label>
              <Input value={editing.name} onChange={e => setEditing({...editing, name:e.target.value})} />

              <Label>Image principale (URL)</Label>
              <Input value={editing.image_url} onChange={e => setEditing({...editing, image_url:e.target.value})} />

              <Label>Plan (URL)</Label>
              <Input value={editing.plan_image_url} onChange={e => setEditing({...editing, plan_image_url:e.target.value})} />

              <Label>Description</Label>
              <Textarea value={editing.description} onChange={e => setEditing({...editing, description:e.target.value})} />

              <Button onClick={save}>Enregistrer</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* IMAGE ZOOM */}
      <Dialog open={!!zoom} onOpenChange={() => setZoom(null)}>
        <DialogContent className="max-w-5xl">
          {zoom && <img src={zoom} className="w-full h-auto" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
