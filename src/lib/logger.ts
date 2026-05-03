/** 轻量开发日志，生产环境不输出 */

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  ai(action: string, meta: Record<string, unknown>) {
    if (!isDev) return;
    const parts = [`action=${action}`];
    if (meta.provider) parts.push(`provider=${meta.provider}`);
    if (meta.model) parts.push(`model=${meta.model}`);
    if (meta.durationMs) parts.push(`duration=${meta.durationMs}ms`);
    if (meta.tokens) parts.push(`tokens=${meta.tokens}`);
    console.log(`[AI] ${parts.join(' ')}`);
  },

  error(context: string, error: unknown, extra?: Record<string, unknown>) {
    if (!isDev) return;
    const message = error instanceof Error ? error.message : String(error);
    const parts = [`context=${context}`, `error="${message}"`];
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        parts.push(`${k}=${v}`);
      }
    }
    console.warn(`[ERROR] ${parts.join(' ')}`);
  },

  info(context: string, message: string) {
    if (!isDev) return;
    console.log(`[INFO] ${context}: ${message}`);
  },
};
