// src/pages/ContactPage.tsx
import React from 'react';
import PublicLayout from '@/components/layouts/PublicLayout';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function ContactPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-6">Contact</h1>

        <p className="mb-4 text-gray-600">
          Pour toute demande de renseignement, n’hésitez pas à nous contacter via le formulaire ci-dessous ou directement par email ou téléphone.
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="text-orange-500" />
            <a href="mailto:contact@sunbox-mauritius.com" className="text-blue-600 hover:underline">
              contact@sunbox-mauritius.com
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="text-orange-500" />
            <a href="tel:+23057800000" className="text-blue-600 hover:underline">
              +230 57 80 00 00
            </a>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="text-orange-500" />
            <span>Port-Louis, Mauritius</span>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
