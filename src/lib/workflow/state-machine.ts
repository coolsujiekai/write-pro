import type { PhaseId } from './types';

export type PhaseTransition = {
  from: PhaseId;
  to: PhaseId;
  condition: string;
};

const TRANSITIONS: PhaseTransition[] = [
  { from: 1, to: 2, condition: '素材给完了' },
  { from: 2, to: 3, condition: '采访完成' },
  { from: 3, to: 4, condition: '主题确认' },
  { from: 4, to: 5, condition: '结构确认' },
  { from: 5, to: 6, condition: '初稿生成完成' },
  { from: 6, to: 7, condition: '定稿' },
  { from: 7, to: 8, condition: '发布完成' },
];

export function canTransition(from: PhaseId, to: PhaseId): boolean {
  return TRANSITIONS.some((t) => t.from === from && t.to === to);
}

export function getNextPhase(current: PhaseId): PhaseId | null {
  const transition = TRANSITIONS.find((t) => t.from === current);
  return transition ? transition.to : null;
}

export function getPhaseProgress(current: PhaseId): number {
  return Math.round(((current - 1) / 7) * 100);
}
