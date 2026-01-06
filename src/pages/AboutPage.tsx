import React from "react";
import PublicLayout from "@/layouts/PublicLayout";

export default function AboutPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Qui sommes-nous ?</h1>
        <p className="mb-4 text-gray-700">
          Sunbox est un acteur innovant dans la conception et la construction de
          logements et espaces modulaires. Basés à l'île Maurice, nous
          transformons des containers maritimes et piscines modulaires en
          habitats modernes, confortables et écologiques.
        </p>

        <p className="mb-4 text-gray-700">
          Nos modèles sont pensés pour répondre aux besoins de chacun, que ce
          soit pour une habitation principale, une villa secondaire, un bureau ou
          un projet d'hôtellerie. Notre équipe vous accompagne de la conception à
          la réalisation.
        </p>

        <p className="mb-4 text-gray-700">
          Chez Sunbox, nous croyons en un habitat durable, rapide à construire et
          personnalisable. Nos solutions sont adaptées au climat local et aux
          exigences de confort modernes.
        </p>

        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-2">Notre mission</h2>
          <p className="text-gray-700">
            Proposer des espaces de vie modulaires, esthétiques et durables,
            accessibles à tous.
          </p>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Nos valeurs</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>Innovation</li>
            <li>Qualité</li>
            <li>Transparence</li>
            <li>Respect de l'environnement</li>
            <li>Satisfaction client</li>
          </ul>
        </div>
      </div>
    </PublicLayout>
  );
}
