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
  /** What this genre is judged on, written into the prompt verbatim. */
  genreInstruction: string;
  dimensions: Dimension[];
};

export const SECTIONS: SectionConfig[] = [
  {
    key: 'abstract',
    label: '摘要',
    genreInstruction:
      '这是论文摘要，通常只有150-250词，必须在极有限的篇幅内交代研究背景/缺口、方法、核心发现与意义。请重点评判：背景—方法—发现—意义是否在篇幅限制内交代齐全（而不是只讲了方法却漏了意义，或反之）；核心发现是否被清楚量化并突显出来，而不是被笼统的话淹没；是否存在可以删掉而不影响信息量的冗余表述。',
    dimensions: [
      { key: 'completeness', label: '信息完整度' },
      { key: 'salience', label: '核心发现显著度' },
      { key: 'concision', label: '语言凝练度' },
    ],
  },
  {
    key: 'introduction',
    label: '引言片段',
    genreInstruction:
      '这是论文引言的一个片段，任务是从研究背景出发，指出现有研究的具体空白，并引出本文的切入点。请重点评判：从背景到研究空白再到本文方法的过渡是否紧凑、有没有逻辑跳跃；对现有研究空白的陈述是否有具体文献支撑而不是泛泛而谈；语言是否地道、避免口语化和模糊限定词（如"可能""或许"）的滥用。',
    dimensions: [
      { key: 'logic', label: '逻辑铺垫紧凑度' },
      { key: 'evidence', label: '文献证据充分性' },
      { key: 'language', label: '语言地道程度' },
    ],
  },
  {
    key: 'methods',
    label: '方法片段',
    genreInstruction:
      '这是论文方法部分的一个片段，任务是让同行能够理解并在原则上复现研究过程，而不是讲故事或做论证。请重点评判：方法选择本身是否严谨、有无对关键假设或参数选择的必要说明；描述细节是否足以支撑可复现性（数据来源、采样/处理流程、关键参数是否交代清楚）；术语和数值表达是否精确规范，而不是模糊带过。这里不需要评判"逻辑说服力"或"证据充分性"，那是引言/讨论部分的任务。',
    dimensions: [
      { key: 'rigor', label: '方法严谨度' },
      { key: 'reproducibility', label: '可复现性描述' },
      { key: 'precision', label: '术语与参数精确度' },
    ],
  },
  {
    key: 'results',
    label: '结果片段',
    genreInstruction:
      '这是论文结果部分的一个片段，任务是客观陈述发现了什么，而不是解释为什么或有什么意义（那是讨论部分的任务）。请重点评判：结果陈述是否克制在"事实层面"，有没有过早掺杂解释性判断；关键数字、不确定性范围、统计显著性等是否给全，让结论有据可查；数值、单位、显著性等量化表达是否精确。这里不需要评判"证据充分性"这种引言/讨论式的标准。',
    dimensions: [
      { key: 'objectivity', label: '结果陈述客观性' },
      { key: 'support', label: '数据支撑充分度' },
      { key: 'precision', label: '量化表达精确度' },
    ],
  },
  {
    key: 'discussion',
    label: '讨论片段',
    genreInstruction:
      '这是论文讨论部分的一个片段，任务是解释结果意味着什么、放回已有研究脉络中比较，并坦率讨论局限性。请重点评判：是否只是复述结果而没有给出机制或理论层面的深入解释；是否与已有文献真正对话（呼应、佐证或反驳），而不是自说自话；是否坦诚讨论了研究的局限性、不确定性或适用边界，而不是回避问题。',
    dimensions: [
      { key: 'depth', label: '阐释深度' },
      { key: 'engagement', label: '文献对话与证据整合' },
      { key: 'candor', label: '局限性坦诚度' },
    ],
  },
  {
    key: 'cover_letter',
    label: 'Cover Letter',
    genreInstruction:
      '这是一封投稿 Cover Letter，不是论文正文段落。请按投稿信的文体标准评判：是否清楚说明研究的意义与期刊定位的契合度、是否恰当传达创新点而不夸大、开头结尾是否符合期刊惯例的措辞与语气（既不能过于随意，也不能谄媚或空洞）。改写示范应保持 Cover Letter 的信件体格式，而不是把它改写成论文段落。',
    dimensions: [
      { key: 'fit', label: '期刊定位契合度' },
      { key: 'novelty', label: '创新性表达清晰度' },
      { key: 'tone', label: '语言得体度' },
    ],
  },
  {
    key: 'highlights',
    label: 'Highlights',
    genreInstruction:
      '这是投稿用的 Highlights（要点提炼），通常是 3-5 条简短要点，每条建议不超过85个字符（Cell / Nature 系列期刊的常见惯例）。请按此文体标准评判：是否足够简洁凝练、是否让创新点一眼可见、关键词是否精准而不空泛。改写示范请仍然输出为 3-5 条独立要点（用换行分隔），不要写成完整段落。',
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
