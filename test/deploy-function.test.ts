import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

async function callHandler(
  method: string,
  user: { email: string } | null,
  env: Record<string, string> = {},
) {
  const saved = { ...process.env };
  Object.assign(process.env, env);

  const mockFetch = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', mockFetch);

  try {
    const mod = await import('../netlify/functions/deploy.js');
    const result = await mod.handler(
      { httpMethod: method },
      { clientContext: user ? { user } : {} },
    );
    return { result, mockFetch };
  } finally {
    for (const k of Object.keys(env)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    vi.restoreAllMocks();
    vi.resetModules();
  }
}

describe('deploy function', () => {
  it('GET returns 405', async () => {
    const { result } = await callHandler('GET', null);
    expect(result.statusCode).toBe(405);
  });

  it('POST without user returns 401', async () => {
    const { result } = await callHandler('POST', null);
    expect(result.statusCode).toBe(401);
  });

  it('POST with user but CONTEXT=deploy-preview returns deployed:false', async () => {
    const { result } = await callHandler('POST', { email: 'a@b.com' }, {
      CONTEXT: 'deploy-preview',
      BUILD_HOOK_URL: 'https://api.netlify.com/hooks/abc',
    });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).deployed).toBe(false);
  });

  it('production with no BUILD_HOOK_URL returns deployed:false', async () => {
    const { result } = await callHandler('POST', { email: 'a@b.com' }, {
      CONTEXT: 'production',
    });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).deployed).toBe(false);
  });

  it('production with hook calls fetch exactly once and returns deployed:true', async () => {
    const { result, mockFetch } = await callHandler('POST', { email: 'a@b.com' }, {
      CONTEXT: 'production',
      BUILD_HOOK_URL: 'https://api.netlify.com/hooks/abc',
    });
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).deployed).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('https://api.netlify.com/hooks/abc', { method: 'POST' });
  });
});
