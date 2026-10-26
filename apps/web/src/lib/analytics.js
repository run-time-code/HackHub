const CONSENT_KEY = "hackhub:consent:v1";
const ANALYTICS_KEY = "hackhub:analytics:v1";

let analyticsAllowed = false;
let queue = [];

function safeRead(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private mode; consent still works for
    // the current page view.
  }
}

export function readConsent() {
  const raw = safeRead(CONSENT_KEY);
  if (!raw) return { decided: false, analytics: false, updatedAt: null };
  try {
    const parsed = JSON.parse(raw);
    return {
      decided: Boolean(parsed.decided),
      analytics: Boolean(parsed.analytics),
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return { decided: false, analytics: false, updatedAt: null };
  }
}

export function writeConsent({ analytics }) {
  analyticsAllowed = Boolean(analytics);
  const value = {
    decided: true,
    analytics: Boolean(analytics),
    updatedAt: new Date().toISOString(),
  };
  safeWrite(CONSENT_KEY, JSON.stringify(value));
  if (analyticsAllowed) {
    flushQueue();
  } else {
    queue = [];
  }
  return value;
}

export function setAnalyticsConsent(value) {
  analyticsAllowed = Boolean(value);
  if (analyticsAllowed) flushQueue();
}

export function hasAnalyticsConsent() {
  return analyticsAllowed;
}

function pushEvent(event) {
  if (!analyticsAllowed) {
    if (queue.length < 20) queue.push(event);
    return;
  }
  // No third-party script is loaded at any point. Events land in a local,
  // inspectable data layer so a future analytics adapter can attach to it.
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(event);
  try {
    window.dispatchEvent(new CustomEvent("hackhub:analytics", { detail: event }));
  } catch {
    // CustomEvent is always available in browsers we support.
  }
  if (import.meta.env.DEV) {
    console.debug("[analytics]", event.name, event.properties);
  }
}

function flushQueue() {
  if (!analyticsAllowed || queue.length === 0) return;
  const pending = queue;
  queue = [];
  pending.forEach(pushEvent);
}

export function track(name, properties = {}) {
  if (!name) return;
  const event = {
    name,
    properties,
    timestamp: Date.now(),
    path: typeof window !== "undefined" ? window.location.pathname : "",
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  pushEvent(event);
}

export function trackPageView(path) {
  track("page_view", { path });
}

export function resetAnalyticsForTests() {
  analyticsAllowed = false;
  queue = [];
  try {
    window.localStorage.removeItem(ANALYTICS_KEY);
  } catch {
    // no-op
  }
}
