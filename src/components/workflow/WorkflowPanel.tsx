'use client';

import { useState } from 'react';
import type { Article, PhaseId } from '@/lib/workflow/types';
import { PHASES } from '@/lib/workflow/types';
import type { LibraryIndex } from '@/lib/library/types';
import { MaterialIntake } from './MaterialIntake';
import { Interview } from './Interview';
import { ThemeConfirm } from './ThemeConfirm';
import { StructurePlan } from './StructurePlan';
import { DraftReview } from './DraftReview';
import { FinalOutput } from './FinalOutput';

interface WorkflowPanelProps {
  article: Article;
}

export function WorkflowPanel({ article }: WorkflowPanelProps) {
  const [extraOpenPhases, setExtraOpenPhases] = useState<Set<PhaseId>>(new Set());
  const [matchedItems, setMatchedItems] = useState<LibraryIndex[]>([]);

  const openPhases = new Set([article.currentPhase, ...extraOpenPhases]);

  const togglePhase = (phaseId: PhaseId) => {
    if (phaseId === article.currentPhase) return;
    setExtraOpenPhases((prev) => {
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
                {phaseId === 1 && <MaterialIntake article={article} onMatchedItemsChange={setMatchedItems} />}
                {phaseId === 2 && <Interview article={article} matchedItems={matchedItems} />}
                {phaseId === 3 && <ThemeConfirm article={article} />}
                {phaseId === 4 && <StructurePlan article={article} matchedItems={matchedItems} />}
                {(phaseId === 5 || phaseId === 6) && <DraftReview article={article} />}
                {(phaseId === 7 || phaseId === 8) && <FinalOutput article={article} />}
              </div>
            </div>
          );
        })}
    </div>
  );
}
