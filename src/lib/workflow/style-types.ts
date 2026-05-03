/** 单篇文章的风格分析结果，持久化到文章 JSON */
export interface StyleAnalysisResult {
  analyzedAt: string;
  isDiffMode: boolean;
  changes: { type: string; ai: string; user: string }[];
  vocabProfile: string;
  toneProfile: string;
  rhythmProfile: string;
  signaturePhrases: string;
  antiPatterns: string;
  summary: string;
}

/** 全局风格记忆条目，多篇文章积累 */
export interface StyleInsight {
  id: string;
  articleId: string;
  articleTitle: string;
  analyzedAt: string;
  vocabProfile: string;
  toneProfile: string;
  rhythmProfile: string;
  signaturePhrases: string;
  antiPatterns: string;
  summary: string;
}

/** 带权重的风格记忆（内部使用） */
export interface WeightedInsight extends StyleInsight {
  weight: number;
  ageGroup: 'recent' | 'mid' | 'old';
}

/** 交叉文章模式检测结果 */
export interface CrossArticlePatterns {
  /** 出现 ≥ 3 次的 antiPattern → 铁律 */
  ironRules: string[];
  /** 出现 ≥ 3 次的 signaturePhrases → 烙印 */
  hallmarks: string[];
  /** 风格漂移警告 */
  driftWarning: string | null;
}

/** 风格记忆容量 */
export const MAX_INSIGHTS = 20;

/** 时效权重 */
export function getAgeWeight(index: number, total: number): { weight: number; ageGroup: 'recent' | 'mid' | 'old' } {
  // 倒序：index 0 = 最新
  if (index < 3) return { weight: 1.0, ageGroup: 'recent' };
  if (index < 8) return { weight: 0.7, ageGroup: 'mid' };
  return { weight: 0.3, ageGroup: 'old' };
}
