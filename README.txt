MH SMS PANEL - ZENEX ADMIN CONFIG READY

What this package does:
- Keeps the existing index.html UI.
- Adds Admin-only Zenex API-key management through the Cloudflare Worker.
- The Admin enters the key in Admin Panel -> Zenex API Provider -> Save.
- The key is stored in Cloudflare KV, not in index.html or wrangler.jsonc.
- The Worker verifies the Firebase session before allowing GET/POST config access.
- No incoming SMS/OTP payload proxy or public OTP feed is included in this package.

Files:
  worker.js
  wrangler.jsonc
  public/index.html

Setup:
1. Create a Cloudflare KV namespace for this Worker.
2. Put its namespace ID into wrangler.jsonc, replacing:
   REPLACE_WITH_YOUR_KV_NAMESPACE_ID
3. Deploy with Wrangler.
4. Log in as the configured owner email and open Admin Panel.
5. Enter the Zenex API key and press Save.

Important:
- The admin email is currently: joyboss556699@gmail.com
- The Firebase Web API key in worker.js is a client identifier; do not treat it as a secret.
- This package is for Admin configuration only. It intentionally does not implement OTP/SMS retrieval or display.
