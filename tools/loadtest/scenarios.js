import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = (__ENV.BASE_URL || '').replace(/\/$/, '');

// Git Bash on Windows rewrites env values that look like POSIX paths, so
// LOGIN_PATH=/api/auth/login arrives here as C:/Program%20Files/Git/api/auth/login
// and every request goes to a host that does not exist. Recover the real
// path so one command works from any shell.
function apiPath(value) {
  if (!value) return value;
  if (value.startsWith('/')) return value;
  const idx = value.indexOf('/api/');
  return idx > -1 ? value.slice(idx) : value;
}

const browsePath = apiPath(__ENV.BROWSE_PATH);
const searchPath = apiPath(__ENV.SEARCH_PATH);
const loginPath = apiPath(__ENV.LOGIN_PATH);
const loginEmail = __ENV.LOGIN_EMAIL;
const loginPassword = __ENV.LOGIN_PASSWORD;

if (!baseUrl || !browsePath || !searchPath || !loginPath || !loginEmail || !loginPassword) {
  throw new Error('Set BASE_URL, BROWSE_PATH, SEARCH_PATH, LOGIN_PATH, LOGIN_EMAIL, and LOGIN_PASSWORD.');
}

const loginPayload = __ENV.LOGIN_PAYLOAD
  ? JSON.parse(__ENV.LOGIN_PAYLOAD)
  : { email: loginEmail, password: loginPassword };

export const options = {
  // Keep load-test output focused on timings instead of response payloads.
  discardResponseBodies: true,
  tags: { test: __ENV.TEST_NAME || 'hackhub-loadtest' },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max'],
  scenarios: {
    browsing: {
      executor: 'constant-vus',
      exec: 'browse',
      vus: Number(__ENV.BROWSE_VUS || 5),
      duration: __ENV.TEST_DURATION || '4m',
    },
    searching: {
      executor: 'constant-vus',
      exec: 'search',
      vus: Number(__ENV.SEARCH_VUS || 3),
      duration: __ENV.TEST_DURATION || '4m',
    },
    login: {
      executor: 'constant-vus',
      exec: 'login',
      vus: Number(__ENV.LOGIN_VUS || 1),
      duration: __ENV.TEST_DURATION || '4m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export function browse() {
  const response = http.get(`${baseUrl}${browsePath}`);
  check(response, { 'browse returned 2xx': (result) => result.status >= 200 && result.status < 300 });
  sleep(1);
}

export function search() {
  const headers = {};
  if (__ENV.SEARCH_TOKEN) headers.Authorization = `Bearer ${__ENV.SEARCH_TOKEN}`;
  if (__ENV.SEARCH_COOKIE) headers.Cookie = __ENV.SEARCH_COOKIE;

  const response = http.get(`${baseUrl}${searchPath}`, { headers });
  check(response, { 'search returned 2xx': (result) => result.status >= 200 && result.status < 300 });
  sleep(1);
}

// Login is a double-submit CSRF protected mutation: bootstrap the token and
// its httpOnly cookie first, then send the token back as X-CSRF-Token.
// Without this handshake every login would answer 403 and the run would be
// measuring the CSRF rejection path instead of authentication.
// Created lazily inside login(): k6 forbids building a cookie jar in the
// init context, and each VU gets its own module instance, so the first call
// gives every virtual user its own jar.
let loginJar;

export function login() {
  if (!loginJar) {
    loginJar = http.cookieJar();
  }
  // discardResponseBodies is on globally; this one request needs its payload,
  // so ask for it explicitly with responseType.
  const csrf = http.get(`${baseUrl}/api/auth/csrf-token`, {
    jar: loginJar,
    responseType: 'text',
  });
  check(csrf, { 'csrf bootstrap returned 200': (result) => result.status === 200 });
  const csrfToken = csrf.body ? JSON.parse(csrf.body).csrfToken : undefined;

  const response = http.post(`${baseUrl}${loginPath}`, JSON.stringify(loginPayload), {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    jar: loginJar,
    responseType: 'text',
  });
  if (response.status < 200 || response.status >= 300) {
    // Surface the actual failure (403 CSRF, 429 rate limit, 500) instead of
    // a bare threshold breach.
    console.log(`login failed: ${response.status} ${String(response.body).slice(0, 120)}`);
  }
  check(response, { 'login returned 2xx': (result) => result.status >= 200 && result.status < 300 });
  // POST /auth/login is rate-limited to 10 attempts per 15 minutes per IP,
  // so the pacing between logins is configurable: a fast loop would measure
  // the 429 limiter instead of authentication.
  sleep(Number(__ENV.LOGIN_SLEEP || 1));
}
