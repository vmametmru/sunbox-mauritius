import React from 'react';
import { Shield, Leaf, Clock, Award, Wrench, HeadphonesIcon, Sun, Droplets } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Quality Guaranteed',
    description: 'All our projects come with a comprehensive warranty and quality assurance.',
    color: 'bg-blue-100 text-blue-600'
  },
  {
    icon: Leaf,
    title: 'Eco-Friendly',
    description: 'Sustainable materials and energy-efficient designs for a greener future.',
    color: 'bg-green-100 text-green-600'
  },
  {
    icon: Clock,
    title: 'Fast Delivery',
    description: 'Container homes ready in 8-12 weeks, pools completed in 4-6 weeks.',
    color: 'bg-orange-100 text-orange-600'
  },
  {
    icon: Award,
    title: 'Award Winning',
    description: 'Recognized for excellence in sustainable construction in Mauritius.',
    color: 'bg-purple-100 text-purple-600'
  },
  {
    icon: Wrench,
    title: 'Full Customization',
    description: 'Every project is tailored to your specific needs and preferences.',
    color: 'bg-red-100 text-red-600'
  },
  {
    icon: HeadphonesIcon,
    title: '24/7 Support',
    description: 'Dedicated customer support throughout your project and beyond.',
    color: 'bg-teal-100 text-teal-600'
  },
  {
    icon: Sun,
    title: 'Solar Integration',
    description: 'Optional solar panel systems for energy independence.',
    color: 'bg-yellow-100 text-yellow-600'
  },
  {
    icon: Droplets,
    title: 'Water Systems',
    description: 'Advanced filtration and rainwater harvesting solutions.',
    color: 'bg-cyan-100 text-cyan-600'
  }
];

const Features: React.FC = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-[#1A365D] mb-4">Why Choose Sunbox?</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We combine innovation, sustainability, and craftsmanship to deliver exceptional results
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-gray-100"
            >
              <div className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* CTA Banner */}
        <div className="mt-20 bg-gradient-to-r from-[#1A365D] to-[#2D4A7C] rounded-3xl p-8 md:p-12 text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Start Your Project?
          </h3>
          <p className="text-blue-200 text-lg mb-8 max-w-2xl mx-auto">
            Get a free consultation and detailed quote for your dream container home or swimming pool
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#quote"
              className="bg-[#ED8936] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#DD7826] transition-colors inline-flex items-center justify-center gap-2"
            >
              Get Free Quote
            </a>
            <a
              href="tel:+23052XXXXXX"
              className="bg-white/10 text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/20 transition-colors border border-white/30"
            >
              Call Us Now
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
