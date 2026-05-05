/** 客户端请求去重：同一 key 的并发请求合并，避免重复调用 */

const inflight = new Map<string, Promise<unknown>>();

/** 包装异步请求，同一 key 的并发调用只执行一次，其他等待同一结果 */
export async function dedupRequest<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fn().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

/** 是否已有相同 key 的进行中请求 */
export function hasInflightRequest(key: string): boolean {
  return inflight.has(key);
}
