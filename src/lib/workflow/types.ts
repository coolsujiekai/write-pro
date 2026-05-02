export type PhaseId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Phase {
  id: PhaseId;
  name: string;
  description: string;
}

export const PHASES: Phase[] = [
  { id: 1, name: '投喂素材', description: '收集书摘、金句、想法' },
  { id: 2, name: '采访深聊', description: '4轮提问，挖掘故事和观点' },
  { id: 3, name: '主题讨论', description: '确定文章核心主题' },
  { id: 4, name: '结构讨论', description: '规划文章逻辑骨架' },
  { id: 5, name: '生成初稿', description: 'AI辅助生成，多角度打磨' },
  { id: 6, name: '文件协作修改', description: '对比修改，学习风格' },
  { id: 7, name: '定稿', description: '最终格式整理' },
  { id: 8, name: '学习与记忆', description: '记录写作风格偏好' },
];

export type Platform = 'wechat' | 'xiaohongshu' | 'zhihu';

export interface Material {
  id: string;
  content: string;
  type: 'text' | 'file' | 'url';
  createdAt: Date;
}

export interface InterviewEntry {
  id: string;
  round: number;
  question: string;
  answer: string;
  createdAt: Date;
}

export interface ThemeConfirmation {
  oneSentence: string;
  readerValue: string;
  coreMessage: string;
}

export interface StructureSection {
  title: string;
  description: string;
  materials: string[];
}

export interface StructurePlan {
  name: string;
  sections: StructureSection[];
}

export interface StyleMemory {
  id: string;
  dimension: 'opening' | 'sentence' | 'vocab' | 'structure' | 'tone' | 'modification';
  insight: string;
  learnedAt: Date;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  aiDraft: string;  // AI 初稿快照，用于对比用户修改
  currentPhase: PhaseId;
  platform: Platform;
  status: 'draft' | 'published';
  materials: Material[];
  interviews: InterviewEntry[];
  theme: ThemeConfirmation | null;
  structure: StructurePlan | null;
  createdAt: Date;
  updatedAt: Date;
}
