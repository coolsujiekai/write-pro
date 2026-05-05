export type PhaseId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface PhaseDefinition {
  id: PhaseId;
  name: string;
  description: string;
  startMessage: string;
  rules: string[];
}

export interface Phase {
  id: PhaseId;
  name: string;
  description: string;
}

// 从 SKILL.md 派生的流程定义加载
import phasesData from '../../../hermes-skill/writing-assistant/phases.json';

export const PHASE_DEFINITIONS: PhaseDefinition[] = phasesData.phases as PhaseDefinition[];

export const PHASES: Phase[] = PHASE_DEFINITIONS.map((p) => ({
  id: p.id,
  name: p.name,
  description: p.description,
}));

/** 根据阶段 ID 获取完整的阶段定义（含提示文案和规则） */
export function getPhaseDefinition(id: PhaseId): PhaseDefinition | undefined {
  return PHASE_DEFINITIONS.find((p) => p.id === id);
}

export type Platform = 'wechat' | 'xiaohongshu' | 'zhihu';

export type FeedbackRating = 'good' | 'bad';

export interface FeedbackEntry {
  id: string;
  target: string;   // 'interview' | 'theme' | 'draft' | 'check-ai'
  rating: FeedbackRating;
  reason?: string;   // 👎 时的原因
  createdAt: Date;
}

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

import type { StyleAnalysisResult } from './style-types';
export type { StyleAnalysisResult };

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
  styleAnalysis: StyleAnalysisResult | null;
  feedback: FeedbackEntry[];
  createdAt: Date;
  updatedAt: Date;
}
