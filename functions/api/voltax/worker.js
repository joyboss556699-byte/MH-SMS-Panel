‎const VOLTAX_BASE = "https://api.2009.cloud/MXS47FLFX0U/tnevs/@public/api";
‎const VOLTAX_KEY = "MU1P1LW7QKO";
‎
‎export default {
‎  async fetch(request) {
‎    const cors = {
‎      "Access-Control-Allow-Origin": "*",
‎      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
‎      "Access-Control-Allow-Headers": "Content-Type, mauthapi",
‎    };
‎
‎    if (request.method === "OPTIONS") {
‎      return new Response(null, { headers: cors });
‎    }
‎
‎    const url = new URL(request.url);
‎    const targetUrl = VOLTAX_BASE + url.pathname + url.search;
‎
‎    const headers = new Headers();
‎    headers.set("mauthapi", VOLTAX_KEY);
‎    headers.set("Content-Type", "application/json");
‎
‎    const options = {
‎      method: request.method,
‎      headers: headers,
‎    };
‎
‎    if (request.method === "POST") {
‎      options.body = await request.text();
‎    }
‎
‎    const response = await fetch(targetUrl, options);
‎    const data = await response.text();
‎
‎    return new Response(data, {
‎      status: response.status,
‎      headers: {
‎        ...cors,
‎        "Content-Type": "application/json",
‎      },
‎    });
‎  }
‎};
