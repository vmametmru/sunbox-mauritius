import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useQuote } from "@/contexts/QuoteContext";
import { api } from "@/lib/api";
import { Home, Droplets, Loader2 } from "lucide-react";

type PublicModel = {
  id: string;
  name: string;
  category: "container" | "pool";
  description: string;
  basePrice: number;
  image: string;      // image principale
  floorPlan: string;  // provisoire: on met la même image
  specs: {
    size: string;
    bedrooms: number;
    bathrooms: number;
  };
  features: string[];
};

function safeParseFeatures(v: any): string[] {
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === "string" && v.trim() !== "") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {}
    // fallback: lignes séparées
    return v.split("\n").map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function normalizeImage(url: any): string {
  const s = String(url ?? "").trim();
  return s; // peut être vide -> on affichera un placeholder
}

function formatPriceRs(n: number): string {
  const v = Number(n || 0);
  return `Rs ${v.toLocaleString()}`;
}

function ModelCard({ model, onSelect }: { model: PublicModel; onSelect: () => void }) {
  const Icon = model.category === "container" ? Home : Droplets;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group" onClick={onSelect}>
      <div className="relative h-48 bg-gray-100">
        {model.image ? (
          <img
            src={model.image}
            alt={model.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="h-14 w-14 text-gray-300" />
          </div>
        )}
        <div className="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
          {formatPriceRs(model.basePrice)}
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{model.name}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{model.description}</p>

        <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="font-semibold text-gray-900">{model.specs.size || "-"}</div>
            <div className="text-gray-500">Surface</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="font-semibold text-gray-900">{model.specs.bedrooms ?? 0}</div>
            <div className="text-gray-500">Chambres</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="font-semibold text-gray-900">{model.specs.bathrooms ?? 0}</div>
            <div className="text-gray-500">SDB</div>
          </div>
        </div>

        <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
          Configurer ce modèle
        </Button>
      </div>
    </Card>
  );
}

export default function ModelsPage() {
  const navigate = useNavigate();
  const { selectModel } = useQuote();

  const [activeTab, setActiveTab] = useState<"all" | "container" | "pool">("all");
  const [models, setModels] = useState<PublicModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [containers, pools] = await Promise.all([
        api.getModels("container", true),
        api.getModels("pool", true),
      ]);

      const all = [
        ...(Array.isArray(containers) ? containers : []),
        ...(Array.isArray(pools) ? pools : []),
      ];

      const mapped: PublicModel[] = all.map((m: any) => {
        const category = (m.type === "pool" ? "pool" : "container") as "container" | "pool";
        const image = normalizeImage(m.image_url);

        return {
          id: String(m.id),
          name: String(m.name ?? ""),
          category,
          description: String(m.description ?? ""),
          basePrice: Number(m.base_price ?? 0),
          image,
          floorPlan: image, // provisoire
          specs: {
            size: String(m.dimensions ?? ""),
            bedrooms: Number(m.bedrooms ?? 0),
            bathrooms: Number(m.bathrooms ?? 0),
          },
          features: safeParseFeatures(m.features),
        };
      });

      setModels(mapped);
    } catch (e: any) {
      setErr(e?.message || "Erreur chargement modèles");
      setModels([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredModels = useMemo(() => {
    const base =
      activeTab === "all" ? models : models.filter(m => m.category === activeTab);
    return base.sort((a, b) => a.basePrice - b.basePrice);
  }, [models, activeTab]);

  const tabs = [
    { id: "all" as const, label: "Tous" },
    { id: "container" as const, label: "Containers" },
    { id: "pool" as const, label: "Piscines" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement des modèles...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choisissez votre modèle</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Découvrez nos solutions premium : containers aménagés et piscines design.
          </p>
          {err && (
            <p className="mt-4 text-red-600">
              {err}
            </p>
          )}
        </div>

        <div className="flex justify-center mb-12">
          <div className="bg-white rounded-full p-1 shadow-md">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-6 py-3 rounded-full font-semibold transition-all",
                  activeTab === tab.id
                    ? "bg-orange-500 text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              onSelect={() => {
                selectModel(model as any);
                navigate("/configure");
              }}
            />
          ))}
        </div>

        {!filteredModels.length && (
          <div className="text-center text-gray-500 mt-10">
            Aucun modèle trouvé.
          </div>
        )}
      </div>
    </div>
  );
}
