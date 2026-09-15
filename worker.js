const CONFIG_KEY = 'zenex:config';
const ADMIN_EMAIL = 'joyboss556699@gmail.com';
// Firebase Web API keys are client identifiers, not server secrets.
const FIREBASE_WEB_API_KEY = 'AIzaSyAG3qckC4mWEMwwOLGnaSjD8vugKDDe640';

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store'
  };
}

function json(data, status = 200, origin = '') {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) }
  });
}

async function verifyAdmin(request) {
  const auth = request.headers.get('Authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return { ok: false, status: 401, message: 'Authentication required.' };

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: match[1] })
    });
    const data = await res.json().catch(() => ({}));
    const user = Array.isArray(data.users) ? data.users[0] : null;
    const email = String(user?.email || '').trim().toLowerCase();
    const verified = user?.emailVerified === true;

    if (!res.ok || !user || !verified) {
      return { ok: false, status: 401, message: 'Invalid or unverified Firebase session.' };
    }
    if (email !== ADMIN_EMAIL.toLowerCase()) {
      return { ok: false, status: 403, message: 'Admin access required.' };
    }
    return { ok: true, email };
  } catch {
    return { ok: false, status: 502, message: 'Could not verify Firebase session.' };
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === '/api/zenex/admin/config') {
      const auth = await verifyAdmin(request);
      if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status, origin);
      if (!env.ZENEX_CONFIG) return json({ ok: false, message: 'ZENEX_CONFIG KV binding is missing.' }, 500, origin);

      if (request.method === 'GET') {
        const stored = await env.ZENEX_CONFIG.get(CONFIG_KEY, 'json');
        return json({ ok: true, configured: Boolean(stored?.apiKey), updatedAt: stored?.updatedAt || null }, 200, origin);
      }

      if (request.method === 'POST') {
        const body = await request.json().catch(() => null);
        const apiKey = String(body?.apiKey || '').trim();
        if (!apiKey || apiKey.length < 8 || apiKey.length > 512) {
          return json({ ok: false, message: 'Invalid Zenex API key.' }, 400, origin);
        }

        await env.ZENEX_CONFIG.put(CONFIG_KEY, JSON.stringify({
          apiKey,
          updatedAt: new Date().toISOString(),
          updatedBy: auth.email
        }));
        return json({ ok: true, configured: true }, 200, origin);
      }

      return json({ ok: false, message: 'Method not allowed.' }, 405, origin);
    }

    if (url.pathname === '/api/zenex/admin/health' && request.method === 'GET') {
      const auth = await verifyAdmin(request);
      if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status, origin);
      if (!env.ZENEX_CONFIG) return json({ ok: false, message: 'ZENEX_CONFIG KV binding is missing.' }, 500, origin);
      const stored = await env.ZENEX_CONFIG.get(CONFIG_KEY, 'json');
      return json({ ok: true, configured: Boolean(stored?.apiKey), storage: 'Cloudflare KV' }, 200, origin);
    }

    // This package intentionally exposes only Admin configuration endpoints.
    // It does not proxy incoming SMS/OTP payloads or public OTP feeds.
    return json({ ok: false, message: 'Not found.' }, 404, origin);
  }
};

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Non-API requests → serve static assets (public/index.html)
    if (!url.pathname.startsWith(ALLOWED_PREFIX)) {
      return env.ASSETS.fetch(request);
    }

    const endpoint = url.pathname
      .slice(ALLOWED_PREFIX.length)
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");

    const apiKey = getApiKey(request, env);
    if (!apiKey) {
      return json({ ok: false, error: "Zenex API key is missing. Set ZENEX_API_KEY in Cloudflare Worker secrets." }, 401, origin);
    }

    const headers = new Headers();
    headers.set("mapikey", apiKey);
    headers.set("Accept", "application/json");

    let upstreamUrl = "";
    let method = "GET";
    let body = undefined;

    // ---------- Route mapping ----------
    if (endpoint === "getnum") {
      method = "POST";
      upstreamUrl = `${ZENEX_CORE_BASE}/v1/getnum`;
      headers.set("Content-Type", "application/json");
      body = await request.text();
    } else if (endpoint === "numsuccess/info") {
      method = "GET";
      upstreamUrl = `${ZENEX_CORE_BASE}/v1/numsuccess/info`;
    } else if (endpoint === "global-broadcast") {
      method = "GET";
      upstreamUrl = `${ZENEX_WEB_BASE}/api/v1/global-broadcast`;
    } else if (endpoint === "active-ranges") {
      method = "GET";
      upstreamUrl = `${ZENEX_CORE_BASE}/v1/active-ranges`;
    } else {
      return json({ ok: false, error: "Unsupported Zenex endpoint: " + endpoint }, 404, origin);
    }

    try {
      const upstream = await fetch(upstreamUrl, {
        method,
        headers,
        body,
        redirect: "follow"
      });

      const responseText = await upstream.text();
      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : { ok: upstream.ok };
      } catch {
        responseData = {
          ok: upstream.ok,
          error: "Zenex returned a non-JSON response.",
          upstreamStatus: upstream.status,
          body: responseText.slice(0, 1000)
        };
      }

      if (!upstream.ok && responseData && typeof responseData === "object") {
        responseData.upstreamStatus = upstream.status;
      }

      return json(responseData, upstream.status, origin);
    } catch (err) {
      return json({
        ok: false,
        error: "Zenex upstream request failed.",
        detail: String(err?.message || err)
      }, 502, origin);
    }
  }
};
