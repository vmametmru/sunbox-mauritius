import React from 'react';
import { X } from 'lucide-react';
import ConfigurePage from '@/pages/ConfigurePage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ConfigureModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-5xl bg-white shadow-lg h-full overflow-y-auto relative animate-slide-in-right">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 text-gray-500 hover:text-black"
        >
          <X className="w-6 h-6" />
        </button>
        <ConfigurePage />
      </div>
    </div>
  );
};

export default ConfigureModal;
