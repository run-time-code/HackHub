'use strict';

// A small polite HTTP client used by every scraper source.
// - identifies itself with a configurable User-Agent
// - times out instead of hanging a scheduled run
// - retries 429/5xx with exponential backoff and honours Retry-After
// - throttles requests per host so we do not hammer a single platform

const config = require('../config');
const logger = require('../utils/logger');

const DEFAULT_HEADERS = {
  Accept: 'application/json, text/html;q=0.9, */*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
};

const lastRequestByHost = new Map();
const MIN_HOST_INTERVAL_MS = 750;
const MAX_ATTEMPTS = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttle(host) {
  const previous = lastRequestByHost.get(host) || 0;
  const wait = previous + MIN_HOST_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestByHost.set(host, Date.now());
}

async function request(url, { headers = {}, timeoutMs, attempts = MAX_ATTEMPTS } = {}) {
  const { host } = new URL(url);
  const timeout = timeoutMs || config.scrapers.timeoutMs;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    await throttle(host);
    try {
      const response = await fetch(url, {
        headers: {
          ...DEFAULT_HEADERS,
          'User-Agent': config.scrapers.userAgent,
          ...headers,
        },
        signal: AbortSignal.timeout(timeout),
        redirect: 'follow',
      });

      if (response.ok) return response;

      if (response.status === 429 || response.status >= 500) {
        if (attempt === attempts) {
          throw new Error(`HTTP ${response.status} from ${url}`);
        }
        const retryAfter = Number(response.headers.get('retry-after'));
        const backoff = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 500 * 2 ** attempt;
        logger.warn(
          { url, status: response.status, attempt, backoff },
          '[scraper-http] retrying request'
        );
        await sleep(backoff);
        continue;
      }

      throw new Error(`HTTP ${response.status} from ${url}`);
    } catch (error) {
      lastError = error;
      const retryable = error.name === 'TimeoutError' || error.name === 'AbortError'
        || /fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN/i.test(error.message || '');
      if (attempt === attempts || !retryable) break;
      await sleep(500 * 2 ** attempt);
    }
  }

  throw lastError || new Error(`Request to ${url} failed`);
}

async function fetchJson(url, options) {
  const response = await request(url, options);
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${url} but received ${text.slice(0, 120)}`);
  }
}

async function fetchText(url, options) {
  const response = await request(url, options);
  return response.text();
}

module.exports = { fetchJson, fetchText, request };
