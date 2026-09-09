import { useEffect, useState } from 'react';
import type { z } from 'zod';
import { request } from './api';

export function useResource<T>(path: string, schema: z.ZodType<T>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    request(path, schema, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((reason: Error) => {
        if (!controller.signal.aborted) setError(reason.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, schema, revision]);
  return { data, error, loading, refresh: () => setRevision((r) => r + 1) };
}
