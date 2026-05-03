/** AI 初稿与用户最终版的对比指标 */

export interface QualityMetrics {
  /** 采纳率：用户保留的 AI 文本 / AI 总输出 */
  adoptionRate: number;
  /** 修改率：用户修改的字符 / 文章总字符 */
  editRate: number;
  /** 重写率：用户新增的字符 / 文章总字符 */
  rewriteRate: number;
  /** AI 初稿总字符数 */
  aiCharCount: number;
  /** 用户版本总字符数 */
  userCharCount: number;
  /** 计算时间 */
  calculatedAt: string;
}

/** 逐段对比，计算编辑距离指标 */
export function calculateQualityMetrics(aiDraft: string, userVersion: string): QualityMetrics {
  const aiPlain = aiDraft.replace(/<[^>]*>/g, '').trim();
  const userPlain = userVersion.replace(/<[^>]*>/g, '').trim();

  if (!aiPlain || !userPlain) {
    return {
      adoptionRate: 0,
      editRate: 0,
      rewriteRate: 0,
      aiCharCount: aiPlain.length,
      userCharCount: userPlain.length,
      calculatedAt: new Date().toISOString(),
    };
  }

  // 按段落分割
  const aiParas = aiPlain.split(/\n\n+/).filter(Boolean);
  const userParas = userPlain.split(/\n\n+/).filter(Boolean);

  let totalRetained = 0;
  let totalModified = 0;
  let totalAdded = 0;

  // 尝试匹配段落：用最长公共子序列的简化版
  for (const userPara of userParas) {
    let bestMatch: { idx: number; retained: number } | null = null;

    for (let i = 0; i < aiParas.length; i++) {
      const retained = longestCommonSubstring(userPara, aiParas[i]);
      if (retained > 0 && (!bestMatch || retained > bestMatch.retained)) {
        bestMatch = { idx: i, retained };
      }
    }

    if (bestMatch) {
      totalRetained += bestMatch.retained;
      totalModified += userPara.length - bestMatch.retained;
      // 标记已使用的 AI 段落
      aiParas[bestMatch.idx] = '';
    } else {
      // 无匹配 → 用户完全新增
      totalAdded += userPara.length;
    }
  }

  const aiTotal = aiPlain.length;
  const userTotal = userPlain.length;

  return {
    adoptionRate: aiTotal > 0 ? Math.round((totalRetained / aiTotal) * 100) / 100 : 0,
    editRate: userTotal > 0 ? Math.round((totalModified / userTotal) * 100) / 100 : 0,
    rewriteRate: userTotal > 0 ? Math.round((totalAdded / userTotal) * 100) / 100 : 0,
    aiCharCount: aiTotal,
    userCharCount: userTotal,
    calculatedAt: new Date().toISOString(),
  };
}

/** 最长公共子串长度 */
function longestCommonSubstring(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;
  let maxLen = 0;
  const prev = new Array(lenB + 1).fill(0);

  for (let i = 1; i <= lenA; i++) {
    const curr = new Array(lenB + 1).fill(0);
    for (let j = 1; j <= lenB; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
        if (curr[j] > maxLen) maxLen = curr[j];
      }
    }
    prev.splice(0, prev.length, ...curr);
  }

  return maxLen;
}

/** 跨文章汇总趋势 */
export interface QualityTrend {
  articleCount: number;
  avgAdoptionRate: number;
  avgEditRate: number;
  avgRewriteRate: number;
  trend: 'improving' | 'declining' | 'stable';
}

export function calculateTrend(allMetrics: QualityMetrics[]): QualityTrend {
  if (allMetrics.length === 0) {
    return { articleCount: 0, avgAdoptionRate: 0, avgEditRate: 0, avgRewriteRate: 0, trend: 'stable' };
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const recent = allMetrics.slice(-3);
  const early = allMetrics.slice(0, Math.max(3, Math.floor(allMetrics.length / 2)));

  const recentAvg = avg(recent.map((m) => m.adoptionRate));
  const earlyAvg = avg(early.map((m) => m.adoptionRate));

  let trend: QualityTrend['trend'] = 'stable';
  if (recentAvg > earlyAvg + 0.05) trend = 'improving';
  else if (recentAvg < earlyAvg - 0.05) trend = 'declining';

  return {
    articleCount: allMetrics.length,
    avgAdoptionRate: Math.round(avg(allMetrics.map((m) => m.adoptionRate)) * 100) / 100,
    avgEditRate: Math.round(avg(allMetrics.map((m) => m.editRate)) * 100) / 100,
    avgRewriteRate: Math.round(avg(allMetrics.map((m) => m.rewriteRate)) * 100) / 100,
    trend,
  };
}
