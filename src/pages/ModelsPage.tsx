import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Home, Droplets, Shield, Star } from "lucide-react";
import { useQuote } from "@/contexts/QuoteContext";
import { api } from "@/lib/api";

type DbModel = {
  id: number;
  name: string;
  type: "container" | "pool";
  description?: string;
  base_price: number;
  dimensions?: string;
  bedrooms?: number;
  bathrooms?: number;
  image_url?: string; // peut être "/uploads/..." ou "uploads/..."
  features?: any;     // array ou string JSON
  is_active?: number | boolean;
  display_order?: number;
};

type UiModel = {
  id: string;
  name: string;
  category: "container" | "pool";
  description: string;
  price: number;
  dimensions: string;
  bedrooms: number;
  bathrooms: number;
  image: string;
  images: string[];
  floorPlan?: string;
  features: string[];
};

function normalizeUrl(u?: string): string {
  if (!u) return "";
  const s = String(u).trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return s;
  return "/" + s;
}

function parseFeatures(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    try {
      const j = JSON.parse(s);
      if (Array.isArray(j)) return j.filter(Boolean).map(String);
    } catch {}
    // fallback: lignes séparées
    return s.split("\n").map(x => x.trim()).filter(Boolean);
  }
  return [];
}

export default function ModelsPage() {
  const navigate = useNavigate();
  const { selectModel } = useQuote();

  const [models, setModels] = useState<UiModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"all" | "container" | "pool">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // public => on veut seulement les actifs
        const data = await api.getModels(undefined, true);
        const arr: DbModel[] = Array.isArray(data) ? data : [];

        const mapped: UiModel[] = arr.map((m) => {
          const img = normalizeUrl(m.image_url);

          return {
            id: String(m.id),
            name: m.name ?? "",
            category: m.type,
            description: m.description ?? "",
            price: Number(m.base_price ?? 0),
            dimensions: m.dimensions ?? "",
            bedrooms: Number(m.bedrooms ?? 0),
            bathrooms: Number(m.bathrooms ?? 0),
            image: img,
            images: img ? [img] : [],
            // Si tu n’as pas de plans, on laisse vide (on garde le design, mais sans plan)
            floorPlan: "",
            features: parseFeatures(m.features),
          };
        });

        setModels(mapped);
      } catch (e: any) {
        setError(e?.message || "Erreur chargement modèles");
        setModels([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return models.filter((m) => {
      const matchesTab = activeTab === "all" ? true : m.category === activeTab;
      const matchesSearch = !s
        ? true
        : (m.name || "").toLowerCase().includes(s) ||
          (m.description || "").toLowerCase().includes(s);
      return matchesTab && matchesSearch;
    });
  }, [models, activeTab, search]);

  const handleSelectModel = (model: UiModel) => {
    selectModel(model);
    navigate("/configure");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-[#1A365D] text-white">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="text-2xl font-bold">
              Sun<span className="text-orange-400">box</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#models" className="hover:text-orange-400 transition-colors">Modèles</a>
              <a href="#about" className="hover:text-orange-400 transition-colors">À propos</a>
              <a href="#contact" className="hover:text-orange-400 transition-colors">Contact</a>
            </div>
            <button
              className="bg-orange-500 hover:bg-orange-600 px-6 py-2 rounded-lg font-medium transition-colors"
              onClick={() => navigate("/quote")}
            >
              Demander un devis
            </button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Votre habitat moderne en{" "}
              <span className="text-orange-500">container</span> ou{" "}
              <span className="text-cyan-500">piscine</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Découvrez nos solutions clés en main à Maurice. Design moderne, construction rapide,
              qualité premium.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                onClick={() => document.getElementById("models")?.scrollIntoView({ behavior: "smooth" })}
              >
                Voir les modèles <ArrowRight className="h-5 w-5" />
              </button>
              <button
                className="border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white px-8 py-3 rounded-lg font-medium transition-colors"
                onClick={() => navigate("/quote")}
              >
                Devis gratuit
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-12">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">48h</div>
                <div className="text-sm text-gray-600">Réponse devis</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">6-8</div>
                <div className="text-sm text-gray-600">Semaines livraison</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">5★</div>
                <div className="text-sm text-gray-600">Qualité premium</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl p-8 shadow-2xl">
              <div className="bg-white rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Pourquoi Sunbox ?</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-6 w-6 text-orange-500 mt-1" />
                    <div>
                      <div className="font-medium text-gray-900">Garantie qualité</div>
                      <div className="text-sm text-gray-600">Matériaux premium, finitions soignées</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Star className="h-6 w-6 text-orange-500 mt-1" />
                    <div>
                      <div className="font-medium text-gray-900">Design moderne</div>
                      <div className="text-sm text-gray-600">Architecture contemporaine adaptée</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Home className="h-6 w-6 text-orange-500 mt-1" />
                    <div>
                      <div className="font-medium text-gray-900">Clé en main</div>
                      <div className="text-sm text-gray-600">De la conception à la livraison</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Models */}
      <section id="models" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Nos Modèles</h2>
          <p className="text-xl text-gray-600">Choisissez le modèle qui correspond à votre projet</p>

          {error && (
            <div className="mt-6 text-red-600 bg-red-50 border border-red-200 rounded-lg inline-block px-4 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex gap-2 bg-white rounded-lg p-2 shadow-sm">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === "all" ? "bg-orange-500 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setActiveTab("container")}
              className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
                activeTab === "container" ? "bg-orange-500 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Home className="h-4 w-4" />
              Containers
            </button>
            <button
              onClick={() => setActiveTab("pool")}
              className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
                activeTab === "pool" ? "bg-orange-500 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Droplets className="h-4 w-4" />
              Piscines
            </button>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full md:w-72 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((model) => (
            <div
              key={model.id}
              className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="relative h-48 bg-gray-100">
                {model.image ? (
                  <img src={model.image} alt={model.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {model.category === "container" ? (
                      <Home className="h-16 w-16 text-gray-300" />
                    ) : (
                      <Droplets className="h-16 w-16 text-gray-300" />
                    )}
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      model.category === "container"
                        ? "bg-blue-500 text-white"
                        : "bg-cyan-500 text-white"
                    }`}
                  >
                    {model.category === "container" ? "Container" : "Piscine"}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{model.name}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{model.description}</p>

                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-bold text-orange-500">
                    Rs {model.price.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">{model.dimensions}</div>
                </div>

                <button
                  onClick={() => handleSelectModel(model)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  Configurer <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Aucun modèle trouvé.
          </div>
        )}
      </section>
    </div>
  );
}
