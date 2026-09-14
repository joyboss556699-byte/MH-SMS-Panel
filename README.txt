CHAK VOLTAX CLOUDFLARE PAGES PROXY

Folder structure:
functions/
  api/
    voltax/
      [[path]].js

Deploy the `functions` folder together with your Cloudflare Pages project.

This proxy supports the existing frontend routes:
- /api/voltax/getnum
- /api/voltax/success-otp
- /api/voltax/console
- /api/voltax/liveaccess

The frontend sends the Voltax API key using the `mauthapi` header.
The proxy forwards that header to the Voltax public API.

Important:
This code is intended for Cloudflare Pages Functions because the current
index.html is configured with VOLTAX_API_BASE_DEFAULT = "/api/voltax".
