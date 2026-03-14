import React, { useEffect, useState } from 'react';
import { X, MapPin } from 'lucide-react';
import PublicLayout from '@/layouts/PublicLayout';
import { api } from '@/lib/api';
import { getProButtonStyle } from '@/lib/pro-theme';

interface GalleryImage {
  id: number;
  url: string;
  region: string | null;
  title: string | null;
  description: string | null;
  pro_user_id: number | null;
  created_at: string;
}

const REGIONS = ['Nord', 'Sud', 'Est', 'Ouest', 'Centre'] as const;

export default function GalleryPage() {
  const btnStyle = getProButtonStyle();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  const isProSite = typeof window !== 'undefined' && !!(window as any).__PRO_SITE__;
  const proUserId = isProSite
    ? ((window as any).__SUNBOX_USER_ID__ ?? null)
    : null;

  useEffect(() => {
    loadImages();
  }, [regionFilter]);

  async function loadImages() {
    setLoading(true);
    try {
      const region = regionFilter !== 'all' ? regionFilter : undefined;
      const data = await api.getGalleryImages(region, proUserId);
      setImages(Array.isArray(data) ? data : []);
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicLayout>
      <section className="py-20 bg-gray-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#1A365D] mb-4">Galerie Photos</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Découvrez nos réalisations à travers l'île Maurice
            </p>
          </div>

          {/* Region Filter Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <button
              onClick={() => setRegionFilter('all')}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                regionFilter === 'all'
                  ? 'bg-[#1A365D] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              style={regionFilter === 'all' ? btnStyle : {}}
            >
              Toutes les régions
            </button>
            {REGIONS.map((region) => (
              <button
                key={region}
                onClick={() => setRegionFilter(region)}
                className={`px-6 py-3 rounded-full font-semibold transition-all flex items-center gap-2 ${
                  regionFilter === region
                    ? 'bg-[#1A365D] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
                style={regionFilter === region ? btnStyle : {}}
              >
                <MapPin className="w-4 h-4" />
                {region}
              </button>
            ))}
          </div>

          {/* Gallery Grid */}
          {loading ? (
            <div className="text-center py-16 text-gray-500">Chargement...</div>
          ) : images.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg">Aucune photo disponible pour cette région.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {images.map((img, index) => (
                <div
                  key={img.id}
                  className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2"
                  onClick={() => setSelectedImage(img)}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={img.url}
                      alt={img.title || 'Photo galerie'}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {img.region && (
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-[#1A365D] text-white">
                          {img.region}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    {img.title && (
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{img.title}</h3>
                    )}
                    {img.region && (
                      <div className="flex items-center gap-2 text-gray-500 mb-3">
                        <MapPin className="w-4 h-4" />
                        <span>{img.region}, Maurice</span>
                      </div>
                    )}
                    {img.description && (
                      <p className="text-gray-600 line-clamp-2">{img.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lightbox Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.title || 'Photo galerie'}
                  className="w-full h-80 object-cover"
                />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-4 right-4 bg-white/90 hover:bg-white p-2 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                {selectedImage.region && (
                  <div className="absolute bottom-4 left-4">
                    <span className="px-4 py-2 rounded-full text-sm font-medium bg-[#1A365D] text-white">
                      {selectedImage.region}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-8">
                {selectedImage.title && (
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">{selectedImage.title}</h3>
                )}
                {selectedImage.region && (
                  <div className="flex items-center gap-2 text-gray-500 mb-4">
                    <MapPin className="w-5 h-5" />
                    <span>{selectedImage.region}, Maurice</span>
                  </div>
                )}
                {selectedImage.description && (
                  <p className="text-gray-600 mb-6">{selectedImage.description}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
