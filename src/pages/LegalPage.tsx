import React from "react";
import PublicLayout from "@/layouts/PublicLayout";

export default function LegalPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Mentions légales</h1>

        <section>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">1. Éditeur du site</h2>
          <p className="text-gray-600">
            Ce site est édité par <strong>Sunbox Mauritius</strong>.<br />
            Adresse : [adresse à insérer]<br />
            Email : contact@sunbox-mauritius.com
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">2. Hébergement</h2>
          <p className="text-gray-600">
            Le site est hébergé par :<br />
            A2 Hosting<br />
            Site web : https://www.a2hosting.com/
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">3. Propriété intellectuelle</h2>
          <p className="text-gray-600">
            Tous les contenus (textes, images, illustrations, logo, etc.) présents sur ce site
            sont la propriété exclusive de Sunbox Mauritius ou de leurs auteurs et sont
            protégés par le droit de la propriété intellectuelle.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">4. Données personnelles</h2>
          <p className="text-gray-600">
            Aucune donnée personnelle n'est collectée à votre insu. Les informations
            transmises via le formulaire de contact sont uniquement utilisées pour vous
            répondre et ne sont jamais transmises à des tiers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">5. Cookies</h2>
          <p className="text-gray-600">
            Ce site n'utilise pas de cookies à des fins de suivi ou de publicité. Des cookies
            techniques peuvent être utilisés pour assurer le bon fonctionnement du site.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">6. Contact</h2>
          <p className="text-gray-600">
            Pour toute question concernant ces mentions légales, vous pouvez nous contacter à
            l'adresse email suivante : contact@sunbox-mauritius.com
          </p>
        </section>
      </div>
    </PublicLayout>
  );
}
