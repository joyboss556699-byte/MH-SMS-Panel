/**
 * MH SMS Panel - Voltax Proxy Worker
 * API key is read from the Cloudflare Worker Secret VOLTAX_API_KEY.
 */
const VOLTAX_BASE =
  "https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api";
const ALLOWED_PREFIX = "/api/voltax/";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "Content-Type, mauthapi",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin)
    }
  });
}

function getApiKey(request, env) {
  if (env && env.VOLTAX_API_KEY) return String(env.VOLTAX_API_KEY).trim();
  return String(request.headers.get("mauthapi") || "").trim();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (!url.pathname.startsWith(ALLOWED_PREFIX)) {
      return env.ASSETS.fetch(request);
    }

    const endpoint = url.pathname.slice(ALLOWED_PREFIX.length).replace(/^\/+/, "");
    if (!['getnum', 'success-otp', 'console'].includes(endpoint)) {
      return json({ ok: false, error: "Unsupported Voltax endpoint." }, 404, origin);
    }

    const apiKey = getApiKey(request, env);
    if (!apiKey) {
      return json({ ok: false, error: "Voltax API key is missing." }, 401, origin);
    }

    const method = endpoint === 'getnum' ? 'POST' : 'GET';
    const headers = new Headers();
    headers.set("mauthapi", apiKey);
    headers.set("Accept", "application/json");
    if (method === 'POST') headers.set("Content-Type", "application/json");

    let body;
    if (method === 'POST') body = await request.text();

    try {
      const upstream = await fetch(`${VOLTAX_BASE}/${endpoint}`, {
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
          error: "Voltax returned a non-JSON response.",
          upstreamStatus: upstream.status,
          body: responseText.slice(0, 1000)
        };
      }

      if (!upstream.ok && responseData && typeof responseData === 'object') {
        responseData.upstreamStatus = upstream.status;
      }

      return json(responseData, upstream.status, origin);
    } catch (err) {
      return json({
        ok: false,
        error: "Voltax upstream request failed.",
        detail: String(err?.message || err)
      }, 502, origin);
    }
  }
};
