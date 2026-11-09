/**
 * Local Development Server with Built-in CORS Proxy
 * Serves static files and provides /proxy?url=... to bypass CORS during localhost testing.
 */

const PORT = 3000;

console.log(`XML Pro Toolkit Server running on http://localhost:${PORT}`);

Deno.serve({ port: PORT }, async (req) => {
  const url = new URL(req.url);

  // 1. CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      }
    });
  }

  // 2. Built-in CORS Proxy: /proxy?url=https://...
  if (url.pathname === '/proxy') {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return new Response('Missing "url" query parameter', {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    try {
      const response = await fetch(targetUrl);
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', '*');

      const body = await response.text();
      return new Response(body, {
        status: response.status,
        headers
      });
    } catch (err) {
      return new Response(`Proxy Error: ${err.message}`, {
        status: 502,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  // 3. Static File Serving
  let filePath = '.' + decodeURIComponent(url.pathname);
  if (filePath === './' || filePath === '.') {
    filePath = './index.html';
  }

  try {
    const file = await Deno.readFile(filePath);
    const mimeMap = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.ico': 'image/x-icon',
      '.md': 'text/markdown; charset=utf-8',
      '.xml': 'application/xml; charset=utf-8'
    };

    const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
    const contentType = mimeMap[ext] || 'application/octet-stream';

    return new Response(file, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (_) {
    return new Response('404 Not Found', { status: 404 });
  }
});
