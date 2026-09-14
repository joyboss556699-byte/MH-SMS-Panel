const API_BASE =
  "https://api.2009.cloud/MXS47FLFX0U/tnevs/@public/api";

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  // Allowed routes
  const allowedRoutes = {
    "/api/voltax/getnum": "POST",
    "/api/voltax/success-otp": "GET",
    "/api/voltax/console": "GET"
  };

  const requiredMethod = allowedRoutes[url.pathname];

  // Route check
  if (!requiredMethod) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Route not found"
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  // Method check
  if (request.method !== requiredMethod) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `${requiredMethod} method required`
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  // API key comes from your Admin Panel
  const apiKey = request.headers.get("x-voltax-key");

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Voltax API key not found"
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  // Remove /api/voltax from the route
  const endpoint = url.pathname.replace(
    "/api/voltax",
    ""
  );

  // Create Voltax API URL
  const targetUrl =
    API_BASE + endpoint + url.search;

  const headers = new Headers();

  // Voltax authentication
  headers.set("mauthapi", apiKey);

  headers.set(
    "Accept",
    "application/json, text/plain, */*"
  );

  const fetchOptions = {
    method: request.method,
    headers: headers
  };

  // Forward POST body
  if (request.method === "POST") {
    headers.set(
      "Content-Type",
      request.headers.get("Content-Type") ||
        "application/json"
    );

    fetchOptions.body = await request.text();
  }

  try {
    // Request Voltax API
    const response = await fetch(
      targetUrl,
      fetchOptions
    );

    // Return Voltax response
    return new Response(
      response.body,
      {
        status: response.status,
        statusText: response.statusText,
        headers: {
          "Content-Type":
            response.headers.get(
              "Content-Type"
            ) ||
            "application/json; charset=UTF-8",

          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {

    return new Response(
      JSON.stringify({
        success: false,
        error: "Voltax request failed",
        message:
          error?.message ||
          String(error)
      }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}
