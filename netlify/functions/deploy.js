exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: '' };

  const user = context.clientContext && context.clientContext.user;
  if (!user) return { statusCode: 401, body: JSON.stringify({ deployed: false, reason: 'not-logged-in' }) };

  // Refuse a known-non-production context, but not an absent one. CONTEXT is a *build* variable; if
  // the function runtime does not carry it, the old `CONTEXT !== 'production'` test was true on the
  // live site too and refused every real publish. Between 2026-08-26 and 2026-08-30 that is what the
  // button did — the hook fired zero times while the admin blamed "a test copy of the admin".
  // Keeping the check in this narrower form still stops a deploy preview from publishing even if
  // BUILD_HOOK_URL is ever rescoped in the Netlify UI from production-only to all contexts.
  const ctx = process.env.CONTEXT;
  if (ctx && ctx !== 'production') {
    return { statusCode: 200, body: JSON.stringify({ deployed: false, reason: 'not-production' }) };
  }

  const hook = process.env.BUILD_HOOK_URL;
  if (!hook) return { statusCode: 200, body: JSON.stringify({ deployed: false, reason: 'no-build-hook' }) };

  const res = await fetch(hook, { method: 'POST' });
  if (!res.ok) return { statusCode: 502, body: JSON.stringify({ deployed: false, reason: 'hook-failed-' + res.status }) };
  return { statusCode: 200, body: JSON.stringify({ deployed: true }) };
};
