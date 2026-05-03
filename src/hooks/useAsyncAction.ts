'use client';

import { useState, useCallback } from 'react';

interface AsyncActionState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
  retryCount: number;
}

export function useAsyncAction<T>() {
  const [state, setState] = useState<AsyncActionState<T>>({
    loading: false,
    error: null,
    data: null,
    retryCount: 0,
  });

  const execute = useCallback(async (fn: () => Promise<T>, retryable = true) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      setState({ loading: false, error: null, data, retryCount: 0 });
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失败';
      setState((s) => ({
        loading: false,
        error: retryable ? message : message,
        data: null,
        retryCount: s.retryCount,
      }));
      throw err;
    }
  }, []);

  const retry = useCallback(async (fn: () => Promise<T>) => {
    setState((s) => ({ ...s, loading: true, error: null, retryCount: s.retryCount + 1 }));
    try {
      const data = await fn();
      setState({ loading: false, error: null, data, retryCount: 0 });
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : '重试失败';
      setState((s) => ({
        ...s,
        loading: false,
        error: message,
      }));
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return { ...state, execute, retry, clearError };
}
