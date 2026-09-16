import { getLocale } from './i18n';
import { z } from 'zod';

const probability = z.number().min(0).max(1);
export const classificationSchema = z
  .object({
    id: z.string().uuid(),
    message: z.string(),
    label: z.enum(['spam', 'legitimate']),
    confidence: probability,
    spamProbability: probability,
    legitimateProbability: probability,
    createdAt: z.string().datetime({ offset: true }),
    processingTimeMs: z.number().nonnegative(),
    modelVersion: z.string(),
    savedToHistory: z.boolean(),
  })
  .refine((r) => Math.abs(r.spamProbability + r.legitimateProbability - 1) < 0.00001);
export type Classification = z.infer<typeof classificationSchema>;
export const historySchema = z.object({
  items: z.array(classificationSchema),
  page: z.number(),
  pageSize: z.number(),
  totalCount: z.number(),
  totalPages: z.number(),
});
export const dashboardSchema = z.object({
  totalAnalyzed: z.number(),
  spamCount: z.number(),
  legitimateCount: z.number(),
  spamPercentage: z.number().min(0).max(100),
  recentClassifications: z.array(classificationSchema),
  modelStatus: z.enum(['online', 'offline']),
});
export const metricsSchema = z.object({
  accuracy: probability,
  precision: probability,
  recall: probability,
  f1Score: probability,
  confusionMatrix: z.tuple([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()])]),
  labels: z.tuple([z.literal('legitimate'), z.literal('spam')]),
  modelVersion: z.string(),
  trainedAt: z.string(),
  trainingSamples: z.number(),
  testSamples: z.number(),
  uniqueSamples: z.number(),
  perLanguage: z
    .record(
      z.string(),
      z.object({
        accuracy: probability,
        precision: probability,
        recall: probability,
        f1Score: probability,
        testSamples: z.number(),
      }),
    )
    .optional(),
  dataset: z.string(),
  algorithm: z.string(),
});

export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestInit = {},
): Promise<T> {
  const timeout = AbortSignal.timeout(15000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  let response: Response;
  try {
    let csrfHeaders: Record<string, string> = {};
    if (options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase())) {
      const csrfResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/csrf`, {
        credentials: 'include',
        cache: 'no-store',
        signal,
      });
      const csrf = z
        .object({ token: z.string() })
        .safeParse(await csrfResponse.json().catch(() => null));
      if (!csrfResponse.ok || !csrf.success)
        throw new Error('The service returned an unexpected response. Please try again.');
      csrfHeaders = { 'X-CSRF-TOKEN': csrf.data.token };
    }
    response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}${path}`, {
      ...options,
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders, ...options.headers },
      signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (error instanceof Error && !(error instanceof TypeError) && error.name !== 'TimeoutError')
      throw error;
    throw new Error(
      timeout.aborted
        ? 'The request took too long. Please try again.'
        : 'Unable to connect to Spamira. Please check your connection and try again.',
    );
  }
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/'))
      window.dispatchEvent(new Event('spamira:session-expired'));
    const body = await response.json().catch(() => null);
    throw new Error(
      typeof body?.detail === 'string'
        ? body.detail
        : response.status === 401
          ? 'Sign in to access your private workspace.'
          : 'This request could not be completed. Please try again.',
    );
  }
  const result = schema.safeParse(await response.json().catch(() => null));
  if (!result.success)
    throw new Error('The service returned an unexpected response. Please try again.');
  return result.data;
}

export const analyze = (message: string) =>
  request('/classifications', classificationSchema, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
export const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
export const dateTime = (value: string) =>
  new Date(value).toLocaleString(getLocale(), {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
