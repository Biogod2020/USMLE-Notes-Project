// src/utils/semanticUtils.ts

// 1. 定义语义族及其关联颜色
export const SEMANTIC_FAMILIES = {
  HIERARCHY: { name: 'Hierarchy', color: 'structure' }, // Blue-ish
  CAUSALITY: { name: 'Causality', color: 'disease' },   // Purple-ish
  ACTION: { name: 'Medical Action', color: 'substance' }, // Teal-ish
  ASSOCIATION: { name: 'Association', color: 'concept' }, // Green-ish
  LOCATION: { name: 'Anatomy/Location', color: 'finding' }, // Cyan-ish
  DEFAULT: { name: 'Other', color: 'default' },
};

// 2. 将连接类型中的关键词映射到这些族
const KEYWORD_TO_FAMILY: [string[], keyof typeof SEMANTIC_FAMILIES][] = [
  [['is_a', 'type', 'part', 'has', 'contains', 'component', 'subtype'], 'HIERARCHY'],
  [['cause', 'lead', 'complication', 'result', 'produces', 'develops', 'secretes', 'impaired'], 'CAUSALITY'],
  [['treat', 'diagnose', 'inhibit', 'stimulate', 'agonist', 'antagonist', 'prevent'], 'ACTION'],
  [['assoc', 'relat', 'co-occur'], 'ASSOCIATION'],
  [['in', 'at', 'on', 'of', 'from', 'by', 'surround', 'supply', 'connect'], 'LOCATION'],
];

// 3. 确定任何给定连接类型字符串所属族的函数
export function getFamilyForType(type: string): { name: string; color: string } {
  const typeLower = type.toLowerCase();
  for (const [keywords, familyKey] of KEYWORD_TO_FAMILY) {
    if (keywords.some(keyword => typeLower.includes(keyword))) {
      return SEMANTIC_FAMILIES[familyKey];
    }
  }
  return SEMANTIC_FAMILIES.DEFAULT;
}
