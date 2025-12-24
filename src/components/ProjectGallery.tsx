import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Home, Waves, MapPin } from 'lucide-react';

interface Project {
  id: number;
  title: string;
  type: 'container' | 'pool';
  location: string;
  image: string;
  description: string;
  features: string[];
}

const projects: Project[] = [
  {
    id: 1,
    title: 'Modern Beach Container Home',
    type: 'container',
    location: 'Grand Baie',
    image: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765979501439_a64eda3d.jpg',
    description: 'A stunning 40ft container home with panoramic ocean views, featuring sustainable materials and smart home technology.',
    features: ['40ft High Cube', 'Solar Panels', 'Smart Home', 'Ocean View Deck']
  },
  {
    id: 2,
    title: 'Compact Studio Retreat',
    type: 'container',
    location: 'Flic en Flac',
    image: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765979497436_89d73193.jpg',
    description: 'A cozy 20ft container converted into a perfect studio retreat with all modern amenities.',
    features: ['20ft Container', 'Full Kitchen', 'Bathroom Suite', 'AC']
  },
  {
    id: 3,
    title: 'Family Container Villa',
    type: 'container',
    location: 'Tamarin',
    image: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765979499492_785b8f47.jpg',
    description: 'Double-stack container home designed for family living with spacious interiors and outdoor entertainment area.',
    features: ['Double Stack', 'Premium Insulation', 'Panoramic Windows', 'Wooden Deck']
  },
  {
    id: 4,
    title: 'Eco-Friendly Container Office',
    type: 'container',
    location: 'Port Louis',
    image: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765979477766_95d9d5f6.png',
    description: 'A sustainable office space built from recycled containers with zero carbon footprint.',
    features: ['40ft Container', 'Solar Panels', 'Smart Home System', 'AC']
  },
  {
    id: 5,
    title: 'Infinity Edge Paradise',
    type: 'pool',
    location: 'Black River',
    image: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765979581765_91fd7296.jpg',
    description: 'Breathtaking infinity pool overlooking the ocean with integrated spa features.',
    features: ['Luxury Pool', 'Infinity Edge', 'LED Lighting', 'Massage Jets']
  },
  {
    id: 6,
    title: 'Family Fun Pool',
    type: 'pool',
    location: 'Pereybere',
    image: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765979518604_772f20dd.jpg',
    description: 'Perfect family pool with shallow area for kids and deeper section for adults.',
    features: ['Family Pool', 'Pool Heating', 'Automatic Cover', 'Pool Deck']
  },
  {
    id: 7,
    title: 'Resort Style Oasis',
    type: 'pool',
    location: 'Belle Mare',
    image: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765979526646_66038955.jpg',
    description: 'Resort-inspired pool design with waterfall feature and tropical landscaping.',
    features: ['Resort Pool', 'Waterfall Feature', 'Saltwater System', 'LED Lighting']
  },
];

interface ProjectGalleryProps {
  filter: 'all' | 'container' | 'pool';
  onFilterChange: (filter: 'all' | 'container' | 'pool') => void;
}

const ProjectGallery: React.FC<ProjectGalleryProps> = ({ filter, onFilterChange }) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const filteredProjects = filter === 'all' 
    ? projects 
    : projects.filter(p => p.type === filter);

  return (
    <section id="gallery" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-[#1A365D] mb-4">Our Completed Projects</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore our portfolio of stunning container homes and swimming pools across Mauritius
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center gap-4 mb-12">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-6 py-3 rounded-full font-semibold transition-all ${
              filter === 'all'
                ? 'bg-[#1A365D] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            All Projects
          </button>
          <button
            onClick={() => onFilterChange('container')}
            className={`px-6 py-3 rounded-full font-semibold transition-all flex items-center gap-2 ${
              filter === 'container'
                ? 'bg-[#1A365D] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Home className="w-4 h-4" />
            Container Homes
          </button>
          <button
            onClick={() => onFilterChange('pool')}
            className={`px-6 py-3 rounded-full font-semibold transition-all flex items-center gap-2 ${
              filter === 'pool'
                ? 'bg-[#1A365D] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Waves className="w-4 h-4" />
            Swimming Pools
          </button>
        </div>

        {/* Project Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProjects.map((project, index) => (
            <div
              key={project.id}
              className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2"
              onClick={() => setSelectedProject(project)}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    project.type === 'container'
                      ? 'bg-[#1A365D] text-white'
                      : 'bg-[#ED8936] text-white'
                  }`}>
                    {project.type === 'container' ? 'Container Home' : 'Swimming Pool'}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{project.title}</h3>
                <div className="flex items-center gap-2 text-gray-500 mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>{project.location}</span>
                </div>
                <p className="text-gray-600 line-clamp-2">{project.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Project Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="relative">
              <img
                src={selectedProject.image}
                alt={selectedProject.title}
                className="w-full h-80 object-cover"
              />
              <button
                onClick={() => setSelectedProject(null)}
                className="absolute top-4 right-4 bg-white/90 hover:bg-white p-2 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="absolute bottom-4 left-4">
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                  selectedProject.type === 'container'
                    ? 'bg-[#1A365D] text-white'
                    : 'bg-[#ED8936] text-white'
                }`}>
                  {selectedProject.type === 'container' ? 'Container Home' : 'Swimming Pool'}
                </span>
              </div>
            </div>
            <div className="p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">{selectedProject.title}</h3>
              <div className="flex items-center gap-2 text-gray-500 mb-4">
                <MapPin className="w-5 h-5" />
                <span>{selectedProject.location}, Mauritius</span>
              </div>
              <p className="text-gray-600 mb-6">{selectedProject.description}</p>
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-3">Features Included:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.features.map((feature, i) => (
                    <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="w-full bg-[#ED8936] text-white py-3 rounded-lg font-semibold hover:bg-[#DD7826] transition-colors"
              >
                Get a Similar Quote
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProjectGallery;
