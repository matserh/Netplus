/**
 * Patch _worker.js for Cloudflare Pages deployment.
 * 1. Expose env.AI binding to the app via globalThis.__CF_AI_BINDING
 * 2. Add static asset passthrough so Pages serves static files directly
 * 3. Add token rate limiting via Cloudflare KV (Durable Object lite)
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const WORKER_PATH = join(".open-next", "pages-deploy", "_worker.js");

let workerCode = readFileSync(WORKER_PATH, "utf8");

// Check if already patched
if (workerCode.includes("/* PATCHED: Pages static asset passthrough */")) {
  console.log("✅ _worker.js already patched for Pages");
  process.exit(0);
}

const patchCode = `\
    /* PATCHED: Expose CF AI binding */
    if (env.AI) globalThis.__CF_AI_BINDING = env.AI;

    /* PATCHED: Token rate limiting — per-IP, 100 AI requests/hour */
    try {
      const __clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (__url.pathname.startsWith('/api/ai')) {
        const __rateKey = \`ai-rate:\${__clientIP}\`;
        const __now = Math.floor(Date.now() / 60000); // minute bucket
        const __bucket = (await env.AI_RATE?.get(__rateKey)) || \`0:\${__now}\`;
        const [__count, __min] = __bucket.split(':').map(Number);
        if (__min === __now && __count >= 100) {
          return new Response(JSON.stringify({
            error: 'rate_limit',
            response: 'Limite atteinte ! Réessayez dans quelques minutes. Les requêtes IA sont limitées pour garantir le service pour tous.',
            results: []
          }), { status: 429, headers: { 'Content-Type': 'application/json' } });
        }
        const __newCount = __min === __now ? __count + 1 : 1;
        await env.AI_RATE?.put(__rateKey, \`\${__newCount}:\${__now}\`, { expirationTtl: 3600 });
      }
    } catch (__rateErr) { /* KV not bound, skip rate limiting */ }

    /* PATCHED: Pages static asset passthrough */
    const __url = new URL(request.url);
    if (
      __url.pathname.startsWith("/_next/static/") ||
      __url.pathname.startsWith("/_next/image") ||
      __url.pathname.match(/\\.(js|css|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|gif|ico|webp|avif|json|webmanifest|xml|txt|map)$/i)
    ) {
      const __assetResp = await env.ASSETS.fetch(request);
      if (__assetResp && __assetResp.status !== 404) {
        return __assetResp;
      }
    }
`;

// Insert the patch right after the fetch handler opens
workerCode = workerCode.replace(
  /async fetch\(request,\s*env,\s*ctx\)\s*\{/,
  `async fetch(request, env, ctx) {\n${patchCode}`
);

writeFileSync(WORKER_PATH, workerCode, "utf8");
console.log("✅ _worker.js patched for Pages static asset passthrough + AI binding + rate limiting");
