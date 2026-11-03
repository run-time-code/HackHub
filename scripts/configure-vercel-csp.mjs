import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export function buildCsp(apiBaseUrl, currentPolicy) {
  let apiUrl;
  try {
    apiUrl = new URL(apiBaseUrl);
  } catch {
    throw new Error("VITE_API_BASE_URL must be an absolute HTTP(S) URL.");
  }

  const isLocalHttp = apiUrl.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(apiUrl.hostname);
  if ((!isLocalHttp && apiUrl.protocol !== "https:") || apiUrl.username || apiUrl.password) {
    throw new Error("VITE_API_BASE_URL must use HTTPS (HTTP is allowed only for localhost).");
  }

  const apiOrigin = apiUrl.origin;
  if (!currentPolicy.includes("connect-src 'self'")) {
    throw new Error("The Vercel CSP is missing its expected connect-src directive.");
  }

  let policy = currentPolicy.replace(/connect-src[^;]*/, `connect-src 'self' ${apiOrigin}`);
  policy = policy.replace(/img-src([^;]*)/, (_match, sources) => {
    const allowed = sources.trim().split(/\s+/);
    if (!allowed.includes("https://res.cloudinary.com")) allowed.push("https://res.cloudinary.com");
    return `img-src ${allowed.join(" ")}`;
  });
  return policy;
}

async function main() {
  const apiBaseUrl = process.env.VITE_API_BASE_URL;
  if (!apiBaseUrl) throw new Error("VITE_API_BASE_URL is required to configure the Vercel CSP.");

  const configPath = fileURLToPath(new URL("../vercel.json", import.meta.url));
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const cspHeader = config.headers?.flatMap((rule) => rule.headers || [])
    .find((header) => header.key.toLowerCase() === "content-security-policy");
  if (!cspHeader) throw new Error("vercel.json is missing its Content-Security-Policy header.");

  cspHeader.value = buildCsp(apiBaseUrl, cspHeader.value);
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
