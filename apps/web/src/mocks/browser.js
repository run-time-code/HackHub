import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

export async function startMockWorker() {
  await worker.start({
    onUnhandledRequest: "bypass",
    serviceWorker: {
      url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
    },
  });
}
