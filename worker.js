/**
 * MH SMS Panel - Zenex Proxy Worker
 * API key is read from the Cloudflare Worker Secret ZENEX_API_KEY.
 * All /api/zenex/* requests are proxied to the Zenex Core API.
 */
const ZENEX_CORE_BASE = "https://api.zenexnetwork.com";
const ZENEX_WEB_BASE  = "https://www.zenexnetwork.com";
const ALLOWED_PREFIX = "/api/zenex/";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "Content-Type, mapikey",
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
  if (env && env.ZENEX_API_KEY) return String(env.ZENEX_API_KEY).trim();
  return String(request.headers.get("mapikey") || "").trim();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

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
