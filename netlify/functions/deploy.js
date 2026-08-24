exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: '' };
  const user = context.clientContext && context.clientContext.user;
  if (!user) return { statusCode: 401, body: JSON.stringify({ error: 'log in first' }) };
  const hook = process.env.BUILD_HOOK_URL;
  if (process.env.CONTEXT !== 'production' || !hook) {
    return { statusCode: 200, body: JSON.stringify({ deployed: false, reason: 'not production' }) };
  }
  const res = await fetch(hook, { method: 'POST' });
  return { statusCode: res.ok ? 200 : 502, body: JSON.stringify({ deployed: res.ok }) };
};
