export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Static file extensions - serve directly from Pages assets (faster, no Worker needed)
    const staticExtensions = ['.js', '.css', '.woff2', '.woff', '.ttf', '.eot', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.mp4', '.webm', '.json', '.xml', '.txt', '.map'];
    const isStaticFile = staticExtensions.some(ext => pathname.endsWith(ext));

    if (isStaticFile) {
      // Let Pages handle static assets directly - much faster than proxying through Worker
      return env.ASSETS.fetch(request);
    }

    // For dynamic requests (HTML pages, API routes), proxy to the Worker
    try {
      const workerUrl = `https://ntplus.westonkevin97.workers.dev${pathname}${url.search}`;

      const newRequest = new Request(workerUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      const response = await fetch(newRequest);

      // Clone the response so we can modify headers
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });

      return newResponse;
    } catch (error) {
      // If Worker is down, try serving from static assets as fallback
      try {
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status === 200) {
          return assetResponse;
        }
      } catch {}

      // Last resort: return a simple error page
      return new Response(
        `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>NetPlus - Temporairement indisponible</title></head>
<body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#0f0f23;color:#fff;font-family:system-ui,sans-serif;padding:2rem;">
<div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#e5a00d,#ff6b35);display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:bold;color:#0f0f23;margin-bottom:1.5rem;">N</div>
<h1 style="font-size:1.5rem;margin:0 0 0.5rem;">Temporairement indisponible</h1>
<p style="color:#94a3b8;margin:0 0 1.5rem;text-align:center;">Le service est momentanément indisponible. Veuillez réessayer dans quelques instants.</p>
<button onclick="location.reload()" style="padding:0.6rem 1.5rem;border-radius:0.5rem;background:linear-gradient(135deg,#e5a00d,#ff6b35);color:#0f0f23;font-weight:bold;border:none;cursor:pointer;font-size:0.9rem;">Réessayer</button>
</body>
</html>`,
        {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }
  }
};
