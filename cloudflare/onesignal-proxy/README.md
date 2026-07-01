# OneSignal send proxy

Browsers can't call OneSignal's REST API directly (`https://onesignal.com/api/v1/notifications`
rejects cross-origin requests), and the REST API key can't live in client-side code. This Worker
sits between `admin-send-notifications.html` and OneSignal: it checks the caller has a valid
Firebase ID token (same bar as the admin page itself — any signed-in user), then forwards the
notification payload to OneSignal with the real key attached server-side.

## Deploy (one-time)

```
cd cloudflare/onesignal-proxy
npm install
npx wrangler login              # opens a browser to authorize your Cloudflare account
npx wrangler secret put ONESIGNAL_REST_API_KEY
# paste the OneSignal REST API key from Settings > Keys & IDs when prompted
npx wrangler deploy
```

The deploy step prints the live URL, e.g. `https://hackerscup-onesignal-proxy.<subdomain>.workers.dev`.
Put that URL into `ONESIGNAL_PROXY_URL` in `admin-send-notifications.html`.

## Important: rotate the OneSignal key

The old REST API key was hardcoded directly in `admin-send-notifications.html` and shipped to
every visitor's browser (view-source could see it), so treat it as compromised. Generate a new
REST API key in the OneSignal dashboard (Settings > Keys & IDs) and use *that* one for
`wrangler secret put` above — don't reuse the old one.

## Local testing

```
npm run dev
```

Runs the Worker on `http://localhost:8787`. Point `ONESIGNAL_PROXY_URL` at that during local
testing, and make sure `http://localhost:5500` (or whatever origin your local site runs on) is
in the `ALLOWED_ORIGINS` set in `src/index.js`.
