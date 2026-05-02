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

// 防抖同步到服务端文件
let syncTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSync(articles: Article[]) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    for (const article of articles) {
      fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      }).catch(() => { /* silent */ });
    }
  }, 1000);
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
          debouncedSync(next);
          return { articles: next, currentArticle: article };
        });
        return article;
      },

      setCurrentArticle: (id) => {
        const article = get().articles.find((a) => a.id === id) ?? null;
        set({ currentArticle: article });
      },

      updateContent: (id, content) => {
        set((state) => {
          const articles = state.articles.map((a) =>
            a.id === id ? { ...a, content, updatedAt: new Date() } : a
          );
          debouncedSync(articles);
          return {
            articles,
            currentArticle:
              state.currentArticle?.id === id
                ? { ...state.currentArticle, content, updatedAt: new Date() }
                : state.currentArticle,
          };
        });
      },

      updateTitle: (id, title) => {
        set((state) => {
          const articles = state.articles.map((a) =>
            a.id === id ? { ...a, title, updatedAt: new Date() } : a
          );
          debouncedSync(articles);
          return {
            articles,
            currentArticle:
              state.currentArticle?.id === id
                ? { ...state.currentArticle, title, updatedAt: new Date() }
                : state.currentArticle,
          };
        });
      },

      setPhase: (id, phase) => {
        set((state) => {
          const articles = state.articles.map((a) =>
            a.id === id ? { ...a, currentPhase: phase, updatedAt: new Date() } : a
          );
          debouncedSync(articles);
          return {
            articles,
            currentArticle:
              state.currentArticle?.id === id
                ? { ...state.currentArticle, currentPhase: phase, updatedAt: new Date() }
                : state.currentArticle,
          };
        });
      },

      setPlatform: (id, platform) => {
        set((state) => {
          const articles = state.articles.map((a) =>
            a.id === id ? { ...a, platform, updatedAt: new Date() } : a
          );
          debouncedSync(articles);
          return {
            articles,
            currentArticle:
              state.currentArticle?.id === id
                ? { ...state.currentArticle, platform, updatedAt: new Date() }
                : state.currentArticle,
          };
        });
      },

      addMaterial: (articleId, content, type) => {
        const material: Material = {
          id: nanoid(),
          content,
          type,
          createdAt: new Date(),
        };
        set((state) => {
          const articles = state.articles.map((a) =>
            a.id === articleId
              ? { ...a, materials: [...a.materials, material], updatedAt: new Date() }
              : a
          );
          debouncedSync(articles);
          return {
            articles,
            currentArticle:
              state.currentArticle?.id === articleId
                ? { ...state.currentArticle, materials: [...state.currentArticle.materials, material], updatedAt: new Date() }
                : state.currentArticle,
          };
        });
      },

      removeMaterial: (articleId, materialId) => {
        set((state) => {
          const articles = state.articles.map((a) =>
            a.id === articleId
              ? { ...a, materials: a.materials.filter((m) => m.id !== materialId), updatedAt: new Date() }
              : a
          );
          debouncedSync(articles);
          return {
            articles,
            currentArticle:
              state.currentArticle?.id === articleId
                ? { ...state.currentArticle, materials: state.currentArticle.materials.filter((m) => m.id !== materialId), updatedAt: new Date() }
                : state.currentArticle,
          };
        });
      },

      addInterviewEntry: (articleId, round, question, answer) => {
        const entry: InterviewEntry = {
          id: nanoid(),
          round,
          question,
          answer,
          createdAt: new Date(),
        };
        set((state) => {
          const articles = state.articles.map((a) =>
            a.id === articleId
              ? { ...a, interviews: [...a.interviews, entry], updatedAt: new Date() }
              : a
          );
          debouncedSync(articles);
          return {
            articles,
            currentArticle:
              state.currentArticle?.id === articleId
                ? { ...state.currentArticle, interviews: [...state.currentArticle.interviews, entry], updatedAt: new Date() }
                : state.currentArticle,
          };
        });
      },

      setTheme: (articleId, theme) => {
        set((state) => {
          const articles = state.articles.map((a) =>
            a.id === articleId ? { ...a, theme, updatedAt: new Date() } : a
          );
          debouncedSync(articles);
          return {
            articles,
            currentArticle:
              state.currentArticle?.id === articleId
                ? { ...state.currentArticle, theme, updatedAt: new Date() }
                : state.currentArticle,
          };
        });
      },

      setStructure: (articleId, structure) => {
        set((state) => {
          const articles = state.articles.map((a) =>
            a.id === articleId ? { ...a, structure, updatedAt: new Date() } : a
          );
          debouncedSync(articles);
          return {
            articles,
            currentArticle:
              state.currentArticle?.id === articleId
                ? { ...state.currentArticle, structure, updatedAt: new Date() }
                : state.currentArticle,
          };
        });
      },

      setAiDraft: (id, aiDraft) => {
        set((state) => {
          const articles = state.articles.map((a) =>
            a.id === id ? { ...a, aiDraft, updatedAt: new Date() } : a
          );
          debouncedSync(articles);
          return {
            articles,
            currentArticle:
              state.currentArticle?.id === id
                ? { ...state.currentArticle, aiDraft, updatedAt: new Date() }
                : state.currentArticle,
          };
        });
      },

      setStyleAnalysis: (id, analysis) => {
        set((state) => {
          const articles = state.articles.map((a) =>
            a.id === id ? { ...a, styleAnalysis: analysis, updatedAt: new Date() } : a
          );
          debouncedSync(articles);
          return {
            articles,
            currentArticle:
              state.currentArticle?.id === id
                ? { ...state.currentArticle, styleAnalysis: analysis, updatedAt: new Date() }
                : state.currentArticle,
          };
        });
      },

      loadFromServer: async () => {
        try {
          const res = await fetch('/api/articles');
          if (!res.ok) return;
          const serverArticles = await res.json();
          if (!Array.isArray(serverArticles) || serverArticles.length === 0) return;

          const revived = reviveDates(serverArticles);
          const local = get().articles;

          // 合并：服务端有而本地没有的 → 加进来；两边都有的 → 取更新的
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
