export const DISCIPLINES = [
  { value: '地理科学', label: '地理科学（试点）', enabled: true },
  { value: '生态与环境科学', label: '生态与环境科学（即将开放）', enabled: false },
  { value: '遥感与地理信息科学', label: '遥感与地理信息科学（即将开放）', enabled: false },
  { value: '大气科学', label: '大气科学（即将开放）', enabled: false },
  { value: '海洋科学', label: '海洋科学（即将开放）', enabled: false },
  { value: '地质学', label: '地质学（即将开放）', enabled: false },
] as const;

export const TIERS = [
  { value: '普通专业期刊', label: '普通专业期刊' },
  { value: '领域子刊', label: '领域子刊（如 Nature Geoscience）' },
  { value: '顶刊', label: '顶刊（如 Science / Nature / Cell）' },
] as const;

export type Dimension = { key: string; label: string };

export type SectionConfig = {
  key: string;
  label: string;
  kind: 'paragraph' | 'cover_letter' | 'highlights';
  dimensions: Dimension[];
};

export const SECTIONS: SectionConfig[] = [
  {
    key: 'abstract',
    label: '摘要',
    kind: 'paragraph',
    dimensions: [
      { key: 'logic', label: '逻辑紧凑度' },
      { key: 'evidence', label: '证据充分性' },
      { key: 'language', label: '语言地道程度' },
    ],
  },
  {
    key: 'introduction',
    label: '引言片段',
    kind: 'paragraph',
    dimensions: [
      { key: 'logic', label: '逻辑紧凑度' },
      { key: 'evidence', label: '证据充分性' },
      { key: 'language', label: '语言地道程度' },
    ],
  },
  {
    key: 'methods',
    label: '方法片段',
    kind: 'paragraph',
    dimensions: [
      { key: 'rigor', label: '方法严谨度' },
      { key: 'reproducibility', label: '可复现性描述' },
      { key: 'language', label: '语言地道程度' },
    ],
  },
  {
    key: 'results',
    label: '结果片段',
    kind: 'paragraph',
    dimensions: [
      { key: 'clarity', label: '结果呈现清晰度' },
      { key: 'evidence', label: '证据充分性' },
      { key: 'language', label: '语言地道程度' },
    ],
  },
  {
    key: 'discussion',
    label: '讨论片段',
    kind: 'paragraph',
    dimensions: [
      { key: 'logic', label: '逻辑紧凑度' },
      { key: 'evidence', label: '证据充分性' },
      { key: 'language', label: '语言地道程度' },
    ],
  },
  {
    key: 'cover_letter',
    label: 'Cover Letter',
    kind: 'cover_letter',
    dimensions: [
      { key: 'fit', label: '期刊定位契合度' },
      { key: 'novelty', label: '创新性表达清晰度' },
      { key: 'tone', label: '语言得体度' },
    ],
  },
  {
    key: 'highlights',
    label: 'Highlights',
    kind: 'highlights',
    dimensions: [
      { key: 'conciseness', label: '简洁凝练度' },
      { key: 'salience', label: '创新点显著度' },
      { key: 'precision', label: '关键词精准度' },
    ],
  },
];

export function getSection(key: string): SectionConfig {
  return SECTIONS.find((s) => s.key === key) ?? SECTIONS[1];
}
