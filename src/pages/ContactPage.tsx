import React from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import PublicLayout from "@/components/layouts/PublicLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Contactez-nous</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Phone className="text-orange-500 mt-1" />
              <div>
                <p className="font-medium text-gray-800">Téléphone</p>
                <p className="text-gray-600">+230 1234 5678</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="text-orange-500 mt-1" />
              <div>
                <p className="font-medium text-gray-800">Email</p>
                <p className="text-gray-600">contact@sunbox-mauritius.com</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="text-orange-500 mt-1" />
              <div>
                <p className="font-medium text-gray-800">Adresse</p>
                <p className="text-gray-600">Port-Louis, Mauritius</p>
              </div>
            </div>
          </div>

          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nom</label>
              <Input placeholder="Votre nom" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <Input type="email" placeholder="Votre email" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Message</label>
              <Textarea rows={4} placeholder="Votre message..." required />
            </div>
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600 w-full">
              Envoyer
            </Button>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}
