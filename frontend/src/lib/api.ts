export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: any; token?: string; form?: boolean } = {}
): Promise<T> {
  const { method = 'GET', body, token, form } = opts;
  const headers: Record<string, string> = {};

  if (!form) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
    method,
    headers,
    body: form ? body : body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const ct = res.headers.get('content-type') || '';
  const parsed = ct.includes('application/json') ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const message =
      (parsed && typeof parsed === 'object' && (parsed.message || parsed.error)) ||
      (typeof parsed === 'string' && parsed) ||
      `HTTP ${res.status}`;
    throw new ApiError(res.status, message, parsed);
  }

  return parsed as T;
}
