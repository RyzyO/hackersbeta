const functions = require("firebase-functions");
const fetch = require("node-fetch");

exports.proxyScorecard = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  try {
    const scriptUrl = "https://script.google.com/macros/s/AKfycbypvHmqzGelnYDxIHNnTFBrYrQGVdTzQYJBcnc7xfYGPhbjr-PL2F17kLJQJ8UXvjgY1Q/exec";

    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const result = await response.text();
    res.status(200).send(result);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).send("Proxy failed.");
  }
});
