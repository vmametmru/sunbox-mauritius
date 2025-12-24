import React from 'react';
import { FileText, Ruler, Hammer, Key } from 'lucide-react';

const steps = [
  {
    icon: FileText,
    number: '01',
    title: 'Get Your Quote',
    description: 'Use our online configurator to customize your project and receive an instant estimate. Our team will follow up within 24 hours.',
    color: 'bg-blue-100 text-blue-600'
  },
  {
    icon: Ruler,
    number: '02',
    title: 'Design & Planning',
    description: 'Work with our architects to finalize your design. We handle all permits and approvals while you focus on the exciting details.',
    color: 'bg-orange-100 text-orange-600'
  },
  {
    icon: Hammer,
    number: '03',
    title: 'Construction',
    description: 'Our expert team brings your vision to life. Container homes in 8-12 weeks, pools in 4-6 weeks. Regular updates throughout.',
    color: 'bg-green-100 text-green-600'
  },
  {
    icon: Key,
    number: '04',
    title: 'Handover',
    description: 'Move into your new space or dive into your new pool! We provide full documentation, warranty, and ongoing support.',
    color: 'bg-purple-100 text-purple-600'
  }
];

const ProcessSection: React.FC = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-[#1A365D] mb-4">How It Works</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            From initial quote to project completion, we make the process simple and transparent
          </p>
        </div>

        {/* Process Steps */}
        <div className="relative">
          {/* Connection Line - Desktop */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gray-200" />
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Step Card */}
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow h-full">
                  {/* Number Badge */}
                  <div className="absolute -top-4 left-8 bg-[#1A365D] text-white px-4 py-1 rounded-full text-sm font-bold">
                    Step {step.number}
                  </div>
                  
                  {/* Icon */}
                  <div className={`w-16 h-16 ${step.color} rounded-2xl flex items-center justify-center mb-6 mt-2`}>
                    <step.icon className="w-8 h-8" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-800 mb-3">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>

                {/* Arrow - Desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-24 -right-4 z-10">
                    <div className="w-8 h-8 bg-[#ED8936] rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Stats */}
        <div className="mt-16 bg-gradient-to-r from-[#1A365D] to-[#2D4A7C] rounded-2xl p-8 md:p-12">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-[#ED8936] mb-2">8-12</div>
              <div className="text-white/80">Weeks for Container Homes</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#ED8936] mb-2">4-6</div>
              <div className="text-white/80">Weeks for Swimming Pools</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#ED8936] mb-2">24h</div>
              <div className="text-white/80">Quote Response Time</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
