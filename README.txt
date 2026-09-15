MH SMS PANEL - READY TO DEPLOY

1. Put the supplied index.html inside ./public/.
2. Keep VOLTAX_API_KEY OUT of wrangler.jsonc and out of index.html.
3. Add the Voltax credential as a Cloudflare Worker Secret named:
   VOLTAX_API_KEY
4. Deploy the Worker.

Wrangler:
  npx wrangler login
  npx wrangler secret put VOLTAX_API_KEY
  npx wrangler deploy

The Worker proxies:
  POST /api/voltax/getnum
  GET  /api/voltax/success-otp
  GET  /api/voltax/console

The frontend uses the same-origin /api/voltax path and does not need the
Voltax secret in browser code.

IMPORTANT: if the credential was exposed publicly, revoke it and create a
new credential before putting it into Cloudflare Secret storage.
