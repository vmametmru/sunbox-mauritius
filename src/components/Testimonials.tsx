import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  location: string;
  image: string;
  rating: number;
  text: string;
  project: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Marie-Claire Dupont',
    location: 'Grand Baie',
    image: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765979624595_81593585.png',
    rating: 5,
    text: 'Sunbox transformed our dream of a sustainable home into reality. The container home they built exceeded all our expectations. The team was professional, and the quality is outstanding!',
    project: 'Container Home'
  },
  {
    id: 2,
    name: 'Jean-Pierre Ramgoolam',
    location: 'Tamarin',
    image: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765979618822_b75db19d.jpg',
    rating: 5,
    text: 'Our infinity pool is absolutely stunning. Sunbox delivered on time and within budget. The attention to detail and craftsmanship is remarkable. Highly recommend!',
    project: 'Swimming Pool'
  },
  {
    id: 3,
    name: 'Sophie Laurent',
    location: 'Flic en Flac',
    image: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765979612558_870a62c5.jpg',
    rating: 5,
    text: 'From the initial quote to the final installation, Sunbox provided exceptional service. Our family pool is now the centerpiece of our home. The kids absolutely love it!',
    project: 'Family Pool'
  },
];

const Testimonials: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-20 bg-gradient-to-br from-[#1A365D] to-[#2D4A7C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">What Our Clients Say</h2>
          <p className="text-xl text-blue-200 max-w-2xl mx-auto">
            Join hundreds of satisfied homeowners who trusted Sunbox with their dreams
          </p>
        </div>

        {/* Testimonial Carousel */}
        <div className="relative max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              {/* Image */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#ED8936] shadow-lg">
                  <img
                    src={testimonials[currentIndex].image}
                    alt={testimonials[currentIndex].name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 text-center md:text-left">
                <Quote className="w-10 h-10 text-[#ED8936] mb-4 mx-auto md:mx-0" />
                
                <p className="text-gray-700 text-lg leading-relaxed mb-6">
                  "{testimonials[currentIndex].text}"
                </p>

                {/* Rating */}
                <div className="flex gap-1 justify-center md:justify-start mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < testimonials[currentIndex].rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>

                <div>
                  <h4 className="font-bold text-gray-800 text-lg">
                    {testimonials[currentIndex].name}
                  </h4>
                  <p className="text-gray-500">
                    {testimonials[currentIndex].location} • {testimonials[currentIndex].project}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={prevTestimonial}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-6 bg-white hover:bg-gray-100 p-3 rounded-full shadow-lg transition-all"
          >
            <ChevronLeft className="w-6 h-6 text-[#1A365D]" />
          </button>
          <button
            onClick={nextTestimonial}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-6 bg-white hover:bg-gray-100 p-3 rounded-full shadow-lg transition-all"
          >
            <ChevronRight className="w-6 h-6 text-[#1A365D]" />
          </button>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex ? 'bg-[#ED8936] w-8' : 'bg-white/50 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
          {[
            { value: '150+', label: 'Projects Completed' },
            { value: '98%', label: 'Client Satisfaction' },
            { value: '12+', label: 'Years Experience' },
            { value: '50+', label: 'Expert Team Members' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#ED8936] mb-2">{stat.value}</div>
              <div className="text-blue-200">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
