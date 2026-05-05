import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Article, Material, InterviewEntry, ThemeConfirmation, StructurePlan, Platform, PhaseId, StyleAnalysisResult } from '@/lib/workflow/types';
import { nanoid } from 'nanoid';

interface ArticleState {
  articles: Article[];
  currentArticle: Article | null;

  createArticle: () => Article;
  setCurrentArticle: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  updateTitle: (id: string, title: string) => void;
  setPhase: (id: string, phase: PhaseId) => void;
  setPlatform: (id: string, platform: Platform) => void;

  addMaterial: (articleId: string, content: string, type: Material['type']) => void;
  removeMaterial: (articleId: string, materialId: string) => void;

  addInterviewEntry: (articleId: string, round: number, question: string, answer: string) => void;

  setTheme: (articleId: string, theme: ThemeConfirmation) => void;
  setStructure: (articleId: string, structure: StructurePlan) => void;
  setAiDraft: (id: string, aiDraft: string) => void;
  setStyleAnalysis: (id: string, analysis: StyleAnalysisResult | null) => void;
  addFeedback: (id: string, target: string, rating: 'good' | 'bad', reason?: string) => void;

  loadFromServer: () => Promise<void>;
  deleteArticle: (id: string) => void;
}

function createDefaultArticle(): Article {
  const now = new Date();
  return {
    id: nanoid(),
    title: '',
    content: '',
    aiDraft: '',
    styleAnalysis: null,
    feedback: [],
    currentPhase: 1,
    platform: 'wechat',
    status: 'draft',
    materials: [],
    interviews: [],
    theme: null,
    structure: null,
    createdAt: now,
    updatedAt: now,
  };
}

function reviveDates(articles: Article[]): Article[] {
  return articles.map((a) => ({
    ...a,
    createdAt: new Date(a.createdAt),
    updatedAt: new Date(a.updatedAt),
    materials: a.materials.map((m) => ({ ...m, createdAt: new Date(m.createdAt) })),
    interviews: a.interviews.map((i) => ({ ...i, createdAt: new Date(i.createdAt) })),
  }));
}

function serializeArticle(article: Article): Record<string, unknown> {
  return {
    ...article,
    createdAt: article.createdAt instanceof Date ? article.createdAt.toISOString() : article.createdAt,
    updatedAt: article.updatedAt instanceof Date ? article.updatedAt.toISOString() : article.updatedAt,
    materials: article.materials.map((m) => ({
      ...m,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
    })),
    interviews: article.interviews.map((i) => ({
      ...i,
      createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : i.createdAt,
    })),
  };
}

// 防抖同步：只发送变更的文章
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let isDirty = false;
const dirtyIds = new Set<string>();

function debouncedSync(article: Article) {
  isDirty = true;
  dirtyIds.add(article.id);
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    const ids = [...dirtyIds];
    dirtyIds.clear();
    const promises = ids.map((id) => {
      const raw = localStorage.getItem('write-pro-articles');
      if (!raw) return Promise.resolve();
      try {
        const parsed = JSON.parse(raw);
        const articles: Article[] = parsed?.state?.articles ?? [];
        const latest = articles.find((a) => a.id === id);
        if (!latest) return Promise.resolve();
        return fetch('/api/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serializeArticle(latest)),
        }).catch(() => { /* silent */ });
      } catch {
        return Promise.resolve();
      }
    });
    Promise.all(promises).finally(() => { isDirty = false; });
  }, 1000);
}

/** beforeunload 兜底：仅在写作用页触发 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (!isDirty) return;
    if (!window.location.pathname.startsWith('/write/')) return;
    const raw = localStorage.getItem('write-pro-articles');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const articles: Article[] = parsed?.state?.articles ?? [];
      const toSync = articles.filter((a) => dirtyIds.has(a.id));
      for (const article of toSync) {
        navigator.sendBeacon('/api/articles', JSON.stringify(serializeArticle(article)));
      }
    } catch { /* ignore */ }
  });
}

/**
 * 通用更新辅助：更新 articles 数组中指定 id 的文章，同时同步 currentArticle。
 * changes 支持直接字段或 (article) => article 的 updater 模式。
 */
function updateArticle(
  set: (fn: (state: ArticleState) => Partial<ArticleState>) => void,
  get: () => ArticleState,
  id: string,
  changes: Partial<Article> | ((article: Article) => Article),
) {
  set((state) => {
    const articles = state.articles.map((a) => {
      if (a.id !== id) return a;
      const updated: Article = typeof changes === 'function'
        ? { ...changes(a), updatedAt: new Date() }
        : { ...a, ...changes, updatedAt: new Date() };
      debouncedSync(updated);
      return updated;
    });

    return {
      articles,
      currentArticle:
        state.currentArticle?.id === id
          ? articles.find((a) => a.id === id) ?? state.currentArticle
          : state.currentArticle,
    };
  });
}

export const useArticleStore = create<ArticleState>()(
  persist(
    (set, get) => ({
      articles: [],
      currentArticle: null,

      createArticle: () => {
        const article = createDefaultArticle();
        set((state) => {
          const next = [...state.articles, article];
          debouncedSync(article);
          return { articles: next, currentArticle: article };
        });
        return article;
      },

      setCurrentArticle: (id) => {
        const article = get().articles.find((a) => a.id === id) ?? null;
        set({ currentArticle: article });
      },

      updateContent: (id, content) => updateArticle(set, get, id, { content }),
      updateTitle: (id, title) => updateArticle(set, get, id, { title }),
      setPhase: (id, phase) => updateArticle(set, get, id, { currentPhase: phase }),
      setPlatform: (id, platform) => updateArticle(set, get, id, { platform }),
      setTheme: (articleId, theme) => updateArticle(set, get, articleId, { theme }),
      setStructure: (articleId, structure) => updateArticle(set, get, articleId, { structure }),
      setAiDraft: (id, aiDraft) => updateArticle(set, get, id, { aiDraft }),
      setStyleAnalysis: (id, analysis) => updateArticle(set, get, id, { styleAnalysis: analysis }),

      addMaterial: (articleId, content, type) => {
        const material: Material = { id: nanoid(), content, type, createdAt: new Date() };
        updateArticle(set, get, articleId, (a) => ({
          ...a,
          materials: [...a.materials, material],
        }));
      },

      removeMaterial: (articleId, materialId) => {
        updateArticle(set, get, articleId, (a) => ({
          ...a,
          materials: a.materials.filter((m) => m.id !== materialId),
        }));
      },

      addInterviewEntry: (articleId, round, question, answer) => {
        const entry: InterviewEntry = { id: nanoid(), round, question, answer, createdAt: new Date() };
        updateArticle(set, get, articleId, (a) => ({
          ...a,
          interviews: [...a.interviews, entry],
        }));
      },

      addFeedback: (id, target, rating, reason) => {
        const entry = { id: nanoid(), target, rating, reason, createdAt: new Date() };
        updateArticle(set, get, id, (a) => ({
          ...a,
          feedback: [...a.feedback, entry],
        }));
      },

      loadFromServer: async () => {
        try {
          const res = await fetch('/api/articles');
          if (!res.ok) return;
          const serverArticles = await res.json();
          if (!Array.isArray(serverArticles) || serverArticles.length === 0) return;

          const revived = reviveDates(serverArticles);
          const local = get().articles;

          const merged = [...revived];
          for (const localArt of local) {
            const existing = merged.find((a) => a.id === localArt.id);
            if (!existing) {
              merged.push(localArt);
            } else if (new Date(localArt.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
              const idx = merged.indexOf(existing);
              merged[idx] = localArt;
            }
          }

          set({ articles: merged });
        } catch {
          // 服务端不可用时用 localStorage 数据
        }
      },

      deleteArticle: (id) => {
        set((state) => {
          const articles = state.articles.filter((a) => a.id !== id);
          dirtyIds.delete(id);
          return {
            articles,
            currentArticle: state.currentArticle?.id === id ? null : state.currentArticle,
          };
        });
        fetch('/api/articles', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        }).catch(() => { /* silent */ });
      },
    }),
    {
      name: 'write-pro-articles',
      partialize: (state) => ({ articles: state.articles }),
      onRehydrateStorage: () => (state) => {
        if (state?.articles) {
          state.articles = reviveDates(state.articles);
        }
      },
    }
  )
);
