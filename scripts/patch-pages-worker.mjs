/**
 * Patch _worker.js for Cloudflare Pages deployment.
 * 1. Expose env.AI binding
 * 2. Static asset passthrough
 * 3. Token rate limiting
 * 4. Force no-cache on HTML responses
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const WORKER_PATH = join(".open-next", "worker.js");

let code = readFileSync(WORKER_PATH, "utf8");

if (code.includes("/* PATCHED: NP */")) {
  console.log("✅ Already patched");
  process.exit(0);
}

// --- INSERT pre-processing block right after 'async fetch(request, env, ctx) {' ---
const prePatch = `
    /* PATCHED: NP pre-processing */
    const __npUrl = new URL(request.url);

    /* PATCHED: AI binding */
    if (env.AI) globalThis.__CF_AI_BINDING = env.AI;

    /* PATCHED: Rate limiting for /api/ai */
    try {
      const __ip = request.headers.get("CF-Connecting-IP") || "x";
      if (__npUrl.pathname.startsWith("/api/ai")) {
        const __rk = \`ai:\${__ip}\`;
        const __now = Math.floor(Date.now() / 3600000);
        const __b = (await env.AI_RATE?.get(__rk)) || \`0:\${__now}\`;
        const [c, m] = __b.split(":").map(Number);
        if (m === __now && c >= 100) return new Response('{"error":"rate_limit"}', { status: 429, headers: { "Content-Type": "application/json" } });
        await env.AI_RATE?.put(__rk, \`\${m===__now?c+1:1}:\${__now}\`, { expirationTtl: 3600 });
      }
    } catch(e) {}

    /* PATCHED: Static asset passthrough */
    if (
      __npUrl.pathname.startsWith("/_next/static/") ||
      __npUrl.pathname.startsWith("/_next/image") ||
      __npUrl.pathname.match(/\.(js|css|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|gif|ico|webp|avif|json|webmanifest|xml|txt|map)$/i)
    ) {
      const __ar = await env.ASSETS.fetch(request);
      if (__ar && __ar.status !== 404) return __ar;
    }
`;

code = code.replace(
  /async fetch\(request,\s*env,\s*ctx\)\s*\{\n/,
  `async fetch(request, env, ctx) {\n${prePatch}`
);

// --- WRAP the entire fetch handler body to post-process responses ---
// Find the pattern: fetch(request, env, ctx) { ... return SOMETHING; },
// and wrap it so we can intercept the return value
//
// Strategy: replace the closing of the fetch handler with a wrapper
// The fetch handler ends with a return statement followed by },
//
// We'll wrap by replacing the export default pattern:
//
// ORIGINAL: export default { async fetch(request, env, ctx) { BODY } };
// NEW:      export default { async fetch(request, env, ctx) { const __npR = await (async () => { BODY })(); /* post-process */ return __npR; } };

// Actually, simpler approach: wrap at the module level using a Proxy-like pattern
// Just replace 'return runWithCloudflareRequestContext' with a wrapper

code = code.replace(
  'return runWithCloudflareRequestContext(request, env, ctx, async () => {',
  'return (async () => { const __npResult = await runWithCloudflareRequestContext(request, env, ctx, async () => {'
);

// Now close the wrapper after the runWithCloudflareRequestContext call
// The original code has: 
//   return runWithCloudflareRequestContext(request, env, ctx, async () => {
//     ... body ...
//   });
//   },
// We changed the opening, now we need to change the closing ');' to add our post-processing
code = code.replace(
  /return handler\(reqOrResp, env, ctx, request\.signal\);\s*\}\);\s*\},\s*\};\s*$/,
  `return handler(reqOrResp, env, ctx, request.signal);
        });
        /* PATCHED: Force no-cache on HTML */
        const __npCT = __npResult.headers.get("content-type") || "";
        if (__npCT.includes("text/html")) {
          const __npH = new Headers(__npResult.headers);
          __npH.set("Cache-Control", "no-store, no-cache, must-revalidate");
          __npH.set("Pragma", "no-cache");
          __npH.set("Expires", "0");
          return new Response(__npResult.body, { status: __npResult.status, statusText: __npResult.statusText, headers: __npH });
        }
        return __npResult;
    })();
  },
};
`
);

writeFileSync(WORKER_PATH, code, "utf8");
console.log("✅ _worker.js patched: assets + AI + rate-limit + HTML no-cache");
