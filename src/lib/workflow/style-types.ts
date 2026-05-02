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
