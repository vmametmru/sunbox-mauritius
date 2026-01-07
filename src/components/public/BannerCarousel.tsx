import React, { useEffect, useState } from "react";

interface BannerImage {
  id: number;
  url: string;
}

export default function BannerCarousel() {
  const [images, setImages] = useState<BannerImage[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch("/api/index.php?action=get_banner_images")
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setImages(json.data);
        }
      });
  }, []);

  useEffect(() => {
    if (images.length < 2) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images]);

  if (!images.length) return null;

  return (
    <div className="relative h-[60vh] w-full overflow-hidden">
      {images.map((img, index) => (
        <img
          key={img.id}
          src={img.url}
          alt={`Banner ${index + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            index === current ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-black/40 z-10" />
      <div className="absolute inset-0 z-20 flex items-center justify-center text-white text-center px-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Votre Espace, Votre Style
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-6">
            Découvrez nos modèles de containers aménagés et piscines
            pour tous vos besoins.
          </p>
        </div>
      </div>
    </div>
  );
}
