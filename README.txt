MH SMS PANEL - READY TO DEPLOY

FILES
-----
worker.js
public/index.html
wrangler.jsonc

WHAT THIS FIXES
---------------
The panel uses /api/voltax as a same-origin proxy. This package provides
the Worker proxy and serves the supplied index.html as static assets.

Supported proxy routes:
  POST /api/voltax/getnum
  GET  /api/voltax/success-otp
  GET  /api/voltax/console

DEPLOY WITH WRANGLER
--------------------
1. Install/login:
   npx wrangler login

2. From this folder:
   npx wrangler deploy

3. Recommended: add the Voltax API key as a Worker secret:
   npx wrangler secret put VOLTAX_API_KEY

   Paste the Voltax API key when prompted.

The Worker can still accept the frontend's `mauthapi` header if the secret
is not configured, so the existing panel configuration remains compatible.

IMPORTANT
---------
Do NOT put the Voltax API key inside wrangler.jsonc.
Cloudflare recommends Worker secrets for API keys.

If you already have a Worker named differently, change the "name" value in
wrangler.jsonc before deploying.

If your existing Worker already owns the domain
panel.joyboss556699.workers.dev, deploying this project to that same Worker
name/domain is the intended setup.

DASHBOARD OPTION
----------------
If you prefer the Cloudflare dashboard, create/update a Worker with:
  - Worker code: worker.js
  - Static Assets directory: public
  - Binding name: ASSETS
Then add a Worker secret named:
  VOLTAX_API_KEY

After deployment, open the panel URL and test GET NUMBER.

DIAGNOSTICS
-----------
If GET NUMBER still fails after deployment, the browser should now receive a
real JSON error instead of the generic "Failed to fetch". That error will
identify whether the problem is the Worker route, missing API key, or the
upstream Voltax API.
