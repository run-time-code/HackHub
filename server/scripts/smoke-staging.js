'use strict';

// Staging smoke checks (owner: Senthil Raja).
// Usage:
//   STAGING_API_URL=https://hackhub-api-staging.onrender.com npm run smoke:staging
//   node scripts/smoke-staging.js https://hackhub-api-staging.onrender.com
// Checks /health and /api/health return the ok envelope (no DB needed).

const base = (process.argv[2] || process.env.STAGING_API_URL || '').replace(/\/$/, '');

if (!base) {
  console.error('error: set STAGING_API_URL (env) or pass the base URL as an argument.');
  process.exit(1);
}

async function check(path) {
  const url = `${base}${path}`;
  const res = await fetch(url);
  if (res.status !== 200) {
    throw new Error(`${path} returned HTTP ${res.status}`);
  }
  const body = await res.json();
  if (body.success !== true || body.data?.status !== 'ok') {
    throw new Error(`${path} returned unexpected body: ${JSON.stringify(body)}`);
  }
  if (!res.headers.get('x-request-id')) {
    throw new Error(`${path} is missing the x-request-id header`);
  }
  console.log(`ok: GET ${path} -> status=ok service=${body.data.service} env=${body.data.env}`);
}

(async () => {
  try {
    console.log(`smoke: ${base}`);
    await check('/health');
    await check('/api/health');
    console.log('smoke: all staging checks passed');
  } catch (err) {
    console.error(`smoke FAILED: ${err.message}`);
    process.exit(1);
  }
})();
