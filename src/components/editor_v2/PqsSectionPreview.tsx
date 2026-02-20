import React from 'react';
import { ReferenceDoc } from './PqsReferenceSection';
import PqsSectionPreview100 from './PqsSectionPreview100';
import PqsSectionPreview200 from './PqsSectionPreview200';

export interface PqsSectionPreviewProps {
  docId: string;
  sectionId: number;
  sectionNumber: number;
  title: string;
  references: ReferenceDoc[];
  sectionGroup?: 100 | 200 | 300;
}

const PqsSectionPreview: React.FC<PqsSectionPreviewProps> = (props) => {
  const { sectionGroup = 100 } = props;

  if (sectionGroup === 200) {
    return <PqsSectionPreview200 {...props} sectionGroup={200} />;
  }

  // 100 or 300
  return <PqsSectionPreview100 {...props} sectionGroup={sectionGroup === 300 ? 300 : 100} />;
};

export default PqsSectionPreview;
