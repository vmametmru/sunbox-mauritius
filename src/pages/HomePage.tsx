import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Package, Phone, Home, Box } from 'lucide-react';
import PublicLayout from '@/layouts/PublicLayout';
import BannerCarousel from '@/components/public/BannerCarousel';
import { getProButtonStyle } from '@/lib/pro-theme';
import { api } from '@/lib/api';

interface ModelType {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon_name: string;
  display_order: number;
  is_active: boolean;
}

// Build a dynamic grid column class based on total count
// Returns a responsive Tailwind column class based on total block count.
// For 5+ types we wrap at 3 columns per row on large screens to keep cards readable.
function gridCols(count: number): string {
  if (count <= 2) return 'sm:grid-cols-2';
  if (count === 3) return 'sm:grid-cols-3';
  if (count === 4) return 'sm:grid-cols-2 lg:grid-cols-4';
  return 'sm:grid-cols-2 lg:grid-cols-3'; // 5+ blocks: 2 rows of 3 on large screens
}

export default function HomePage() {
  const btnStyle = getProButtonStyle();
  const [customTypes, setCustomTypes] = useState<ModelType[]>([]);

  useEffect(() => {
    api.getModelTypes(true)
      .then(data => setCustomTypes(Array.isArray(data) ? data : []))
      .catch(() => setCustomTypes([]));
  }, []);

  const totalBlocks = 2 + customTypes.length; // container + pool + custom types

  return (
    <PublicLayout>
      <BannerCarousel />

      <section className="mt-12 py-16 px-6 max-w-6xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">Nos Solutions</h2>
        <p className="text-gray-600 mb-10">
          Des containers aménagés, des piscines modernes livrées prêtes à plonger, et bien plus encore.
        </p>
        <div className={`grid grid-cols-1 ${gridCols(totalBlocks)} gap-6`}>
          {/* Fixed: Containers */}
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-md transition">
            <Home className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Containers Aménagés</h3>
            <p className="text-gray-600 mb-4">
              Studios, bureaux, locaux commerciaux ou habitations, transformez un container en espace de vie.
            </p>
            <Link to="/models?type=container">
              <Button variant="outline" style={btnStyle}>Voir les containers</Button>
            </Link>
          </div>

          {/* Fixed: Pools */}
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-md transition">
            <Package className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Piscines Préfabriquées</h3>
            <p className="text-gray-600 mb-4">
              Des piscines durables et modernes, faciles à installer, adaptées à tous les espaces.
            </p>
            <Link to="/models?type=pool">
              <Button variant="outline" style={btnStyle}>Voir les piscines</Button>
            </Link>
          </div>

          {/* Dynamic: custom admin-created types */}
          {customTypes.map(ct => (
            <div key={ct.slug} className="bg-white p-6 rounded-xl shadow hover:shadow-md transition">
              <Box className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{ct.name}</h3>
              <p className="text-gray-600 mb-4">
                {ct.description ?? `Découvrez notre gamme de ${ct.name.toLowerCase()}.`}
              </p>
              <Link to={`/models?type=${ct.slug}`}>
                <Button variant="outline" style={btnStyle}>Voir les modèles</Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-orange-100 py-16 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Besoin d&apos;aide ou d&apos;un devis ?</h2>
        <p className="text-gray-700 mb-6">
          Contactez-nous pour discuter de votre projet, obtenir un devis personnalisé ou visiter un modèle.
        </p>
        <Link to="/contact">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" style={btnStyle}>
            Contactez-nous <Phone className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </section>
    </PublicLayout>
  );
}

