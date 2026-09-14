/**
 * MH SMS Panel - Voltax Proxy Worker
 *
 * Routes:
 *   /api/voltax/getnum       -> Voltax POST /getnum
 *   /api/voltax/success-otp  -> Voltax GET  /success-otp
 *   /api/voltax/console      -> Voltax GET  /console
 *
 * Deploy with Cloudflare Workers.
 *
 * Optional Worker secret:
 *   VOLTAX_API_KEY
 *
 * The frontend may also send the `mauthapi` header. If the Worker secret
 * is configured, it takes priority over the client header.
 */

const VOLTAX_BASE =
  "https://api.2oo9.cloud/MXS47FLFX0U/tnevs/@public/api";

const ALLOWED_PREFIX = "/api/voltax/";

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, mauthapi, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResponse(data, status = 200, origin = "*") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
  });
}

function errorResponse(message, status = 500, origin = "*", extra = {}) {
  return jsonResponse(
    {
      ok: false,
      error: message,
      ...extra,
    },
    status,
    origin
  );
}

function getApiKey(request, env) {
  // Recommended: store the Voltax key as a Worker secret.
  if (env && env.VOLTAX_API_KEY) {
    return String(env.VOLTAX_API_KEY).trim();
  }

  // Backward-compatible with the current index.html, which sends mauthapi.
  return String(request.headers.get("mauthapi") || "").trim();
}

function upstreamPath(pathname) {
  if (!pathname.startsWith(ALLOWED_PREFIX)) return null;

  const endpoint = pathname.slice(ALLOWED_PREFIX.length).replace(/^\/+/, "");

  // Only expose the endpoints used by the current index.html.
  const allowed = new Set(["getnum", "success-otp", "console"]);

  if (!allowed.has(endpoint)) return null;
  return endpoint;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "*";

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    const endpoint = upstreamPath(url.pathname);

    // Let non-API routes be handled by Cloudflare's static assets binding.
    if (!endpoint) {
      if (env && env.ASSETS) {
        return env.ASSETS.fetch(request);
      }

      return errorResponse(
        "Not found. Configure the ASSETS binding for index.html.",
        404,
        origin
      );
    }

    const apiKey = getApiKey(request, env);

    if (!apiKey) {
      return errorResponse(
        "Voltax API key is missing.",
        401,
        origin
      );
    }

    // Current frontend:
    //   getnum       = POST JSON { rid }
    //   success-otp  = GET
    //   console      = GET
    const expectedMethod = endpoint === "getnum" ? "POST" : "GET";

    if (request.method !== expectedMethod) {
      return errorResponse(
        `${endpoint} requires ${expectedMethod}.`,
        405,
        origin
      );
    }

    const upstreamUrl = `${VOLTAX_BASE}/${endpoint}`;

    const headers = new Headers();
    headers.set("mauthapi", apiKey);
    headers.set("Accept", "application/json");

    let body = undefined;

    if (request.method === "POST") {
      const contentType =
        request.headers.get("Content-Type") || "application/json";

      headers.set("Content-Type", contentType);

      // Validate JSON before forwarding so malformed browser requests
      // return a useful error instead of a generic fetch failure.
      try {
        const incoming = await request.text();

        if (!incoming) {
          return errorResponse(
            "Request body is empty.",
            400,
            origin
          );
        }

        JSON.parse(incoming);
        body = incoming;
      } catch {
        return errorResponse(
          "Invalid JSON request body.",
          400,
          origin
        );
      }
    }

    try {
      const upstream = await fetch(upstreamUrl, {
        method: request.method,
        headers,
        body,
        redirect: "follow",
      });

      const responseText = await upstream.text();

      // Preserve Voltax JSON when possible.
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = {
          ok: upstream.ok,
          upstream_status: upstream.status,
          message: responseText || "Empty response from Voltax.",
        };
      }

      return new Response(JSON.stringify(responseData), {
        status: upstream.status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          ...corsHeaders(origin),
        },
      });
    } catch (error) {
      return errorResponse(
        "Unable to connect to Voltax API.",
        502,
        origin,
        {
          details:
            env && env.DEBUG === "true"
              ? String(error && error.message ? error.message : error)
              : undefined,
        }
      );
    }
  },
};
