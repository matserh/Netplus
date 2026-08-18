export default {
  async fetch(request, env) {
    // Forward all requests to the Worker
    const url = new URL(request.url);
    const workerUrl = `https://ntplus.westonkevin97.workers.dev${url.pathname}${url.search}`;
    
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
  }
};
