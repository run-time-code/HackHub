// Demo mode can be switched on explicitly with VITE_USE_MOCKS=true or by
// running Vite in the "demo" mode (npm run dev:demo). The latter keeps the
// flag out of environment files so the command works on every platform.
export const DEMO_MODE =
  import.meta.env.VITE_USE_MOCKS === "true" || import.meta.env.MODE === "demo";

// Same-origin base so mocked requests stay inside the service worker scope,
// including when the demo build is hosted under a sub-path.
export function demoApiBase() {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/$/, "")}/api`;
}
