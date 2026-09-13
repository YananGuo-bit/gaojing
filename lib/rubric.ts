export const DISCIPLINES = [
  { value: '地理科学', label: '地理科学（试点）', enabled: true },
  { value: '环境科学', label: '环境科学（即将开放）', enabled: false },
  { value: '生物学', label: '生物学（即将开放）', enabled: false },
  { value: '化学', label: '化学（即将开放）', enabled: false },
  { value: '材料科学', label: '材料科学（即将开放）', enabled: false },
  { value: '医学与生命科学', label: '医学与生命科学（即将开放）', enabled: false },
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
