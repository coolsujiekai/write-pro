import { describe, it, expect } from 'vitest';
import { canTransition, getNextPhase, getPhaseProgress } from './state-machine';
import type { PhaseId } from './types';

describe('canTransition', () => {
  it('允许合法顺序跳转', () => {
    expect(canTransition(1, 2)).toBe(true);
    expect(canTransition(2, 3)).toBe(true);
    expect(canTransition(3, 4)).toBe(true);
    expect(canTransition(4, 5)).toBe(true);
    expect(canTransition(5, 6)).toBe(true);
    expect(canTransition(6, 7)).toBe(true);
    expect(canTransition(7, 8)).toBe(true);
  });

  it('拒绝跳转', () => {
    expect(canTransition(1, 5)).toBe(false);
  });

  it('拒绝反向跳转', () => {
    expect(canTransition(5, 1)).toBe(false);
  });

  it('拒绝同阶段跳转', () => {
    expect(canTransition(3, 3)).toBe(false);
  });

  it('拒绝超出范围的阶段', () => {
    expect(canTransition(1, 9 as PhaseId)).toBe(false);
    expect(canTransition(0 as PhaseId, 1)).toBe(false);
  });
});

describe('getNextPhase', () => {
  it('返回下一个阶段', () => {
    expect(getNextPhase(1)).toBe(2);
    expect(getNextPhase(4)).toBe(5);
    expect(getNextPhase(7)).toBe(8);
  });

  it('最后一个阶段返回 null', () => {
    expect(getNextPhase(8)).toBeNull();
  });
});

describe('getPhaseProgress', () => {
  it('Phase 1 为 0%', () => {
    expect(getPhaseProgress(1)).toBe(0);
  });

  it('Phase 8 为 100%', () => {
    expect(getPhaseProgress(8)).toBe(100);
  });

  it('Phase 4 约为 43%', () => {
    expect(getPhaseProgress(4)).toBe(43);
  });
});
