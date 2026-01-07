import React from "react";
import PublicLayout from "@/layouts/PublicLayout";

export default function AboutPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        <h1 className="text-3xl font-bold mb-4">Qui sommes-nous ?</h1>

        <p className="text-gray-700">
          <strong>Sunbox</strong> est un acteur innovant dans la conception et la fabrication de logements
          et d’espaces modulaires à l'île Maurice. Nous transformons des containers maritimes
          en habitats modernes, esthétiques et fonctionnels. Nous proposons également
          des piscines construites en blocs à bancher et béton armé, robustes et durables.
        </p>

        <p className="text-gray-700">
          Nos modèles sont conçus pour répondre à différents besoins : habitation principale,
          villa secondaire, bureaux, espaces commerciaux ou projets hôteliers. Nos piscines sont
          livrées prêtes à poser, adaptées aux terrains mauriciens et personnalisables selon vos envies.
        </p>

        <p className="text-gray-700">
          Grâce à notre technique de fixation au sol, nos constructions bénéficient d’une excellente
          stabilité et d’une résistance renforcée face aux cyclones et conditions climatiques extrêmes.
        </p>

        <div>
          <h2 className="text-xl font-semibold mb-2">Notre mission</h2>
          <p className="text-gray-700">
            Offrir des espaces de vie modulaires, confortables, durables et accessibles,
            adaptés à tous les usages.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Nos valeurs</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>Innovation</li>
            <li>Qualité</li>
            <li>Transparence</li>
            <li>Respect de l’environnement</li>
            <li>Satisfaction client</li>
          </ul>
        </div>
      </div>
    </PublicLayout>
  );
}
