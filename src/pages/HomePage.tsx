// 📁 src/pages/HomePage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Package, Phone, Home } from 'lucide-react';
import PublicLayout from '@/layouts/PublicLayout';

export default function HomePage() {
  return (
    <PublicLayout>
      <div className="relative bg-cover bg-center h-[60vh] flex items-center justify-center text-white text-center" style={{ backgroundImage: "url('/assets/hero.jpg')" }}>
        <div className="bg-black/60 absolute inset-0" />
        <div className="relative z-10 p-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Votre Espace, Votre Style</h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-6">Découvrez nos modèles de containers aménagés et piscines pour tous vos besoins.</p>
          <Link to="/models">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              Voir les modèles <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <section className="py-16 px-6 max-w-5xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">Nos solutions</h2>
        <p className="text-gray-600 mb-10">Des containers aménagés pour tous les usages et des piscines modernes livrées prêtes à plonger.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-md transition">
            <Home className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Containers Aménagés</h3>
            <p className="text-gray-600 mb-4">Studios, bureaux, locaux commerciaux ou habitations, transformez un container en espace de vie.</p>
            <Link to="/models?type=container">
              <Button variant="outline">Voir les containers</Button>
            </Link>
          </div>
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-md transition">
            <Package className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Piscines Préfabriquées</h3>
            <p className="text-gray-600 mb-4">Des piscines durables et modernes, faciles à installer, adaptées à tous les espaces.</p>
            <Link to="/models?type=pool">
              <Button variant="outline">Voir les piscines</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-orange-100 py-16 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Besoin d’aide ou d’un devis ?</h2>
        <p className="text-gray-700 mb-6">Contactez-nous pour discuter de votre projet, obtenir un devis personnalisé ou visiter un modèle.</p>
        <Link to="/contact">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            Contactez-nous <Phone className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </section>
    </PublicLayout>
  );
}
