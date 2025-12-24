import React from "react";

export default function ConstructionBanner({ message }: { message: string }) {
  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 text-sm text-yellow-900">
        {message}
      </div>
    </div>
  );
}
