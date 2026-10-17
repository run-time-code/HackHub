import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = (__ENV.BASE_URL || '').replace(/\/$/, '');
const browsePath = __ENV.BROWSE_PATH;
const searchPath = __ENV.SEARCH_PATH;
const loginPath = __ENV.LOGIN_PATH;
const loginEmail = __ENV.LOGIN_EMAIL;
const loginPassword = __ENV.LOGIN_PASSWORD;

if (!baseUrl || !browsePath || !searchPath || !loginPath || !loginEmail || !loginPassword) {
  throw new Error('Set BASE_URL, BROWSE_PATH, SEARCH_PATH, LOGIN_PATH, LOGIN_EMAIL, and LOGIN_PASSWORD.');
}

const loginPayload = __ENV.LOGIN_PAYLOAD
  ? JSON.parse(__ENV.LOGIN_PAYLOAD)
  : { email: loginEmail, password: loginPassword };

export const options = {
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

export function login() {
  const response = http.post(`${baseUrl}${loginPath}`, JSON.stringify(loginPayload), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(response, { 'login returned 2xx': (result) => result.status >= 200 && result.status < 300 });
  sleep(1);
}