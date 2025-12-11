// src/components/Icons.tsx
import React from 'react';

import { getEmoji } from '../constants';

const iconProps = {
  width: "1em",
  height: "1em",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const AnatomyIcon = () => <span role="img" aria-label="anatomy" style={{ fontSize: '1.2em', lineHeight: 1 }}>{getEmoji('anatomy')}</span>;

export const PhysiologyIcon = () => <span role="img" aria-label="physiology" style={{ fontSize: '1.2em', lineHeight: 1 }}>{getEmoji('physiology')}</span>;

export const MoleculeIcon = () => <span role="img" aria-label="molecule" style={{ fontSize: '1.2em', lineHeight: 1 }}>{getEmoji('molecule')}</span>;

export const DrugIcon = () => <span role="img" aria-label="drug" style={{ fontSize: '1.2em', lineHeight: 1 }}>{getEmoji('drug')}</span>;

export const MicrobeIcon = () => <span role="img" aria-label="microbe" style={{ fontSize: '1.2em', lineHeight: 1 }}>{getEmoji('microbe')}</span>;

export const DiseaseIcon = () => <span role="img" aria-label="disease" style={{ fontSize: '1.2em', lineHeight: 1 }}>{getEmoji('disease')}</span>;

export const FindingIcon = () => <span role="img" aria-label="finding" style={{ fontSize: '1.2em', lineHeight: 1 }}>{getEmoji('finding')}</span>;

export const ConceptIcon = () => <span role="img" aria-label="concept" style={{ fontSize: '1.2em', lineHeight: 1 }}>{getEmoji('concept')}</span>;

export const ThemeIcon = () => (
  <svg {...iconProps}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
);
export const ImportIcon = () => (
  <svg {...iconProps}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
);
export const GraphIcon = () => (
  <svg {...iconProps}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
);
export const PanelCollapseIcon = ({ isLeft }: { isLeft: boolean }) => (
    <svg {...iconProps} style={{ transform: isLeft ? 'rotate(180deg)' : 'none' }}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
);
export const MenuIcon = () => (
  <svg {...iconProps}><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
)

const TYPE_ICONS: Record<string, React.ReactNode> = {
  disease: <DiseaseIcon />,
  drug: <DrugIcon />,
  anatomy: <AnatomyIcon />,
  microbe: <MicrobeIcon />,
  molecule: <MoleculeIcon />,
  physiology: <PhysiologyIcon />,
  finding: <FindingIcon />,
  concept: <ConceptIcon />,
};
export const getIcon = (type: string) => TYPE_ICONS[type] || <ConceptIcon />;
