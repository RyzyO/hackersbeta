import { jwtVerify, createRemoteJWKSet } from "jose";

const FIREBASE_PROJECT_ID = "hackers-cup";
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

const ALLOWED_ORIGINS = new Set([
  "https://hackerscup.live",
  "http://localhost:5500",
]);

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, headers);
    }

    // Require the caller to be a signed-in Firebase user (same bar as the admin page's
    // own auth gate) — verifies the ID token's signature, issuer and expiry.
    const authHeader = request.headers.get("Authorization") || "";
    const idToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!idToken) {
      return json({ error: "Missing Authorization bearer token" }, 401, headers);
    }
    try {
      await jwtVerify(idToken, JWKS, {
        issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
        audience: FIREBASE_PROJECT_ID,
      });
    } catch (err) {
      return json({ error: "Invalid or expired token" }, 401, headers);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (err) {
      return json({ error: "Invalid JSON body" }, 400, headers);
    }

    // app_id is fixed server-side so a caller can never redirect sends to a different app.
    payload.app_id = env.ONESIGNAL_APP_ID;

    const onesignalRes = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await onesignalRes.text();
    return new Response(text, {
      status: onesignalRes.status,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  },
};
