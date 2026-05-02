'use client';

import { useState } from 'react';
import type { Article, PhaseId } from '@/lib/workflow/types';
import { PHASES } from '@/lib/workflow/types';
import { MaterialIntake } from './MaterialIntake';
import { Interview } from './Interview';
import { ThemeConfirm } from './ThemeConfirm';
import { StructurePlan } from './StructurePlan';
import { DraftReview } from './DraftReview';
import { FinalOutput } from './FinalOutput';

interface WorkflowPanelProps {
  article: Article;
  onPhaseChange?: (phase: PhaseId) => void;
}

const PHASE_COMPONENTS: Record<PhaseId, React.ComponentType<{ article: Article }>> = {
  1: MaterialIntake,
  2: Interview,
  3: ThemeConfirm,
  4: StructurePlan,
  5: DraftReview,
  6: DraftReview,
  7: FinalOutput,
  8: FinalOutput,
};

export function WorkflowPanel({ article, onPhaseChange }: WorkflowPanelProps) {
  const [openPhases, setOpenPhases] = useState<Set<PhaseId>>(new Set([article.currentPhase]));

  const togglePhase = (phaseId: PhaseId) => {
    setOpenPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full">
      {/* 左侧阶段列表 */}
      <div className="w-48 border-r border-[var(--border)] overflow-y-auto shrink-0">
        <div className="p-3">
          <h2 className="text-xs font-medium text-[var(--muted-foreground)] mb-2">写作流程</h2>
        </div>
        {PHASES.map((phase) => {
          const isActive = phase.id === article.currentPhase;
          const isCompleted = phase.id < article.currentPhase;
          const isOpen = openPhases.has(phase.id);

          return (
            <button
              key={phase.id}
              onClick={() => togglePhase(phase.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                isActive
                  ? 'bg-[var(--primary)] text-white'
                  : isOpen
                    ? 'bg-[var(--muted)]'
                    : 'hover:bg-[var(--muted)]'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs shrink-0 ${
                  isActive
                    ? 'bg-white text-[var(--primary)]'
                    : isCompleted
                      ? 'bg-green-100 text-green-600'
                      : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
                }`}
              >
                {isCompleted ? '✓' : phase.id}
              </span>
              <span className="truncate">{phase.name}</span>
            </button>
          );
        })}
      </div>

      {/* 右侧展开的阶段面板 */}
      {Array.from(openPhases)
        .sort((a, b) => a - b)
        .map((phaseId) => {
          const PhaseComponent = PHASE_COMPONENTS[phaseId];
          const phase = PHASES.find((p) => p.id === phaseId)!;

          return (
            <div
              key={phaseId}
              className="w-80 border-r border-[var(--border)] overflow-y-auto shrink-0"
            >
              <div className="sticky top-0 bg-[var(--background)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    Phase {phase.id}
                  </span>
                  <h3 className="text-sm font-medium">{phase.name}</h3>
                </div>
                <button
                  onClick={() => togglePhase(phaseId)}
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm"
                >
                  ×
                </button>
              </div>
              <div className="p-4">
                <PhaseComponent article={article} />
              </div>
            </div>
          );
        })}
    </div>
  );
}
