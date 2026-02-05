import React from 'react';
import ReferenceManager from '../sections/ReferenceManager';

interface Section104ViewProps {
  sectionId: number;
}

const Section104View: React.FC<Section104ViewProps> = ({ sectionId }) => {
  return (
    <div className="p-6">
      {/* Section Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-github-text-primary mb-2">
          ๑๐๔ ความรู้พื้นฐานระบบอาวุธป้องกันตนเองระยะประชิด Phalanx Mk.15
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          104 CIWS Basic - Phalanx Mk.15 Close-In Weapon System Fundamentals
        </p>
      </div>

      {/* Reference Manager */}
      <ReferenceManager sectionId={sectionId} />

      {/* Content Placeholder */}
      <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold text-github-text-primary mb-3">
          📝 Section Content
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Questions and content for Section 104 will be implemented in next phase.
        </p>
        <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
          For now, you can manage references above. Content editing UI coming soon.
        </p>
      </div>
    </div>
  );
};

export default Section104View;
