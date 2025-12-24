import { Model } from '@/contexts/QuoteContext';

export interface ModelOption {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
}


export const containerModels: Model[] = [
  {
    id: 'studio-20',
    name: 'Studio 20',
    category: 'container',
    description: 'Compact studio perfect for a home office, guest house, or rental unit. Features modern finishes and efficient use of space.',
    basePrice: 25000,
    image: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765980636599_1ccd97e7.jpg',
    floorPlan: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765981537717_1eb60770.jpg',
    specs: {
      size: '20ft Container',
      sqm: 15,
      bedrooms: 0,
      bathrooms: 1,
    },
    features: ['Open floor plan', 'Kitchenette', 'Bathroom', 'Climate control ready'],
  },
  {
    id: 'compact-40',
    name: 'Compact 40',
    category: 'container',
    description: 'Spacious one-bedroom home with full kitchen and bathroom. Ideal for singles or couples seeking minimalist living.',
    basePrice: 45000,
    image: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765980635593_c6e4323f.jpg',
    floorPlan: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765981481605_53b2721a.png',
    specs: {
      size: '40ft Container',
      sqm: 30,
      bedrooms: 1,
      bathrooms: 1,
    },
    features: ['Bedroom', 'Full kitchen', 'Living area', 'Bathroom', 'Storage'],
  },
  {
    id: 'family-hc',
    name: 'Family High Cube',
    category: 'container',
    description: 'High ceiling container home with extra headroom. Perfect for families with 2 bedrooms and modern amenities.',
    basePrice: 65000,
    image: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765980636066_638c5d1e.png',
    floorPlan: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765981531193_812684f7.jpg',
    specs: {
      size: '40ft High Cube',
      sqm: 30,
      bedrooms: 2,
      bathrooms: 1,
    },
    features: ['2 Bedrooms', 'High ceilings', 'Full kitchen', 'Living area', 'Bathroom'],
  },
  {
    id: 'luxury-double',
    name: 'Luxury Double Stack',
    category: 'container',
    description: 'Two-story luxury container home with premium finishes. Features 3 bedrooms, 2 bathrooms, and expansive living spaces.',
    basePrice: 120000,
    image: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765980633825_1b30b286.jpg',
    floorPlan: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765981483169_1480d0fe.jpg',
    specs: {
      size: 'Double 40ft Stack',
      sqm: 60,
      bedrooms: 3,
      bathrooms: 2,
    },
    features: ['3 Bedrooms', '2 Bathrooms', 'Open kitchen', 'Living room', 'Balcony', 'Internal stairs'],
  },
];

export const poolModels: Model[] = [
  {
    id: 'plunge-compact',
    name: 'Plunge Compact',
    category: 'pool',
    description: 'Perfect plunge pool for small gardens. Great for cooling off and relaxation in limited spaces.',
    basePrice: 18000,
    image: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765980706271_f4390598.jpg',
    floorPlan: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765981555301_da46a14c.jpg',
    specs: {
      dimensions: '4m x 2.5m',
      depth: '1.2m - 1.5m',
    },
    features: ['Compact design', 'Easy maintenance', 'Quick installation', 'Filtration system'],
  },
  {
    id: 'family-pool',
    name: 'Family Pool',
    category: 'pool',
    description: 'Ideal family swimming pool with generous dimensions for swimming and play. Perfect for everyday enjoyment.',
    basePrice: 32000,
    image: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765980723818_085cafb6.jpg',
    floorPlan: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765981567743_4146dcfe.png',
    specs: {
      dimensions: '6m x 3m',
      depth: '1.2m - 1.8m',
    },
    features: ['Family-friendly depth', 'Steps entry', 'LED lighting ready', 'Premium filtration'],
  },
  {
    id: 'luxury-pool',
    name: 'Luxury Pool',
    category: 'pool',
    description: 'Spacious luxury pool for serious swimmers and entertainers. Features premium finishes and ample space.',
    basePrice: 48000,
    image: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765980682082_faa279db.png',
    floorPlan: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765981555243_aced5910.jpg',
    specs: {
      dimensions: '8m x 4m',
      depth: '1.4m - 2.0m',
    },
    features: ['Lap swimming capable', 'Roman steps', 'Bench seating', 'Premium finish options'],
  },
  {
    id: 'resort-pool',
    name: 'Resort Pool',
    category: 'pool',
    description: 'Ultimate resort-style pool for luxury properties. Impressive dimensions with premium features included.',
    basePrice: 75000,
    image: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765980676434_564df908.png',
    floorPlan: 'https://d64gsuwffb70l.cloudfront.net/6942b44d48df4184e229ce4c_1765981560829_5e8391d5.jpg',
    specs: {
      dimensions: '12m x 5m',
      depth: '1.4m - 2.2m',
    },
    features: ['Resort dimensions', 'Beach entry option', 'Spa zone', 'Premium automation'],
  },
];

export const containerOptions: ModelOption[] = [
  // Exterior
  { id: 'ext-deck', name: 'Wooden Deck', description: 'Premium hardwood deck with railing', price: 5500, category: 'Exterior' },
  { id: 'ext-cladding', name: 'Premium Cladding', description: 'Weather-resistant exterior cladding', price: 4500, category: 'Exterior' },
  { id: 'ext-awning', name: 'Retractable Awning', description: 'Motorized sun shade', price: 3200, category: 'Exterior' },
  { id: 'ext-pergola', name: 'Pergola Extension', description: 'Covered outdoor living space', price: 8000, category: 'Exterior' },
  
  // Interior
  { id: 'int-kitchen', name: 'Premium Kitchen', description: 'Full kitchen with appliances', price: 15000, category: 'Interior' },
  { id: 'int-bathroom', name: 'Luxury Bathroom', description: 'Premium fixtures and finishes', price: 12000, category: 'Interior' },
  { id: 'int-flooring', name: 'Hardwood Flooring', description: 'Premium engineered hardwood', price: 4500, category: 'Interior' },
  { id: 'int-ceiling', name: 'Exposed Ceiling', description: 'Industrial exposed beam ceiling', price: 2500, category: 'Interior' },
  
  // Climate
  { id: 'clim-ac', name: 'Split AC System', description: 'Energy-efficient air conditioning', price: 4500, category: 'Climate' },
  { id: 'clim-insulation', name: 'Premium Insulation', description: 'High R-value insulation package', price: 5500, category: 'Climate' },
  { id: 'clim-ventilation', name: 'Smart Ventilation', description: 'Automated ventilation system', price: 3000, category: 'Climate' },
  
  // Energy
  { id: 'energy-solar', name: 'Solar Panel System', description: '5kW solar with battery storage', price: 18000, category: 'Energy' },
  { id: 'energy-water', name: 'Rainwater Harvesting', description: 'Collection and filtration system', price: 6500, category: 'Energy' },
  { id: 'energy-heater', name: 'Solar Water Heater', description: 'Solar thermal water heating', price: 4000, category: 'Energy' },
  
  // Smart Home
  { id: 'smart-system', name: 'Smart Home System', description: 'Complete home automation', price: 8500, category: 'Smart Home' },
  { id: 'smart-security', name: 'Security System', description: 'Cameras, sensors, and alarm', price: 5500, category: 'Smart Home' },
  { id: 'smart-lighting', name: 'Smart Lighting', description: 'Automated LED lighting', price: 3500, category: 'Smart Home' },
];

export const poolOptions: ModelOption[] = [
  // Construction
  { id: 'const-concrete', name: 'Concrete Finish', description: 'Traditional concrete construction', price: 0, category: 'Construction' },
  { id: 'const-fiberglass', name: 'Fiberglass Shell', description: 'Pre-formed fiberglass pool', price: -2000, category: 'Construction' },
  { id: 'const-tiles', name: 'Premium Tiles', description: 'Glass mosaic tile finish', price: 8500, category: 'Construction' },
  
  // Features
  { id: 'feat-heating', name: 'Pool Heating', description: 'Heat pump system', price: 6500, category: 'Features' },
  { id: 'feat-saltwater', name: 'Saltwater System', description: 'Chlorine-free saltwater', price: 4500, category: 'Features' },
  { id: 'feat-jets', name: 'Massage Jets', description: 'Hydrotherapy jet system', price: 5500, category: 'Features' },
  { id: 'feat-infinity', name: 'Infinity Edge', description: 'Stunning overflow design', price: 15000, category: 'Features' },
  
  // Lighting
  { id: 'light-led', name: 'LED Lighting', description: 'Color-changing underwater LEDs', price: 3500, category: 'Lighting' },
  { id: 'light-fiber', name: 'Fiber Optic Stars', description: 'Starlight floor effect', price: 6000, category: 'Lighting' },
  { id: 'light-landscape', name: 'Landscape Lighting', description: 'Pool area illumination', price: 4500, category: 'Lighting' },
  
  // Water Features
  { id: 'water-waterfall', name: 'Waterfall', description: 'Natural stone waterfall', price: 8000, category: 'Water Features' },
  { id: 'water-fountain', name: 'Fountain Jets', description: 'Decorative water jets', price: 4500, category: 'Water Features' },
  { id: 'water-spillover', name: 'Spillover Spa', description: 'Attached hot tub', price: 18000, category: 'Water Features' },
  
  // Automation
  { id: 'auto-cover', name: 'Automatic Cover', description: 'Motorized safety cover', price: 12000, category: 'Automation' },
  { id: 'auto-cleaner', name: 'Robotic Cleaner', description: 'Automated pool cleaning', price: 3500, category: 'Automation' },
  { id: 'auto-control', name: 'Smart Control', description: 'App-controlled automation', price: 5500, category: 'Automation' },
  
  // Surroundings
  { id: 'surr-deck', name: 'Pool Deck', description: 'Composite decking surround', price: 12000, category: 'Surroundings' },
  { id: 'surr-fence', name: 'Glass Fencing', description: 'Frameless glass safety fence', price: 8500, category: 'Surroundings' },
  { id: 'surr-shower', name: 'Outdoor Shower', description: 'Poolside rinse station', price: 2500, category: 'Surroundings' },
];

export const allModels = [...containerModels, ...poolModels];

export const getModelOptions = (model: Model): ModelOption[] => {
  return model.category === 'container' ? containerOptions : poolOptions;
};
