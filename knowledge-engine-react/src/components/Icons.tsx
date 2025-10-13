// src/components/Icons.tsx
import React from 'react';

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

export const DiseaseIcon = () => (
  <svg {...iconProps}><path d="M12 2v4M12 20v2M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M20 12h-2M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /><circle cx="12" cy="12" r="4" /></svg>
);
export const StructureIcon = () => (
  <svg {...iconProps}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
);
export const ProcessIcon = () => (
  <svg {...iconProps}><path d="M3 6h3M5 3v3M18 6h3M20 3v3M9 18h3M11 15v3M3 13v3a2 2 0 0 0 2 2h3M16 3h3a2 2 0 0 1 2 2v3" /><path d="M12 3a1 1 0 0 0-1-1H9a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h2a1 1 0 0 0 1-1Z" /><path d="m14 14-2-2 2-2" /><path d="m10 10 2 2-2 2" /></svg>
);
export const SubstanceIcon = () => (
  <svg {...iconProps}><path d="M10.3 2.3 12 6l1.7-3.7M6 6l1.7-3.7L9.4 6M14.6 6l1.7-3.7L18 6" /><path d="M6 20c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H6Z" /></svg>
);
export const FindingIcon = () => (
  <svg {...iconProps}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
);
export const ConceptIcon = () => (
  <svg {...iconProps}><path d="m9.06 18.9-6.52-6.52a2.41 2.41 0 0 1 0-3.41L8.9 2.57a2.41 2.41 0 0 1 3.41 0l6.52 6.52a2.41 2.41 0 0 1 0 3.41L12.47 18.9a2.41 2.41 0 0 1-3.41 0z" /><line x1="2" y1="12" x2="22" y2="12" /></svg>
);
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
  structure: <StructureIcon />,
  process: <ProcessIcon />,
  substance: <SubstanceIcon />,
  finding: <FindingIcon />,
  concept: <ConceptIcon />,
};
export const getIcon = (type: string) => TYPE_ICONS[type] || <ConceptIcon />;
