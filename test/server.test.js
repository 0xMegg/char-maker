const assert = require("node:assert/strict");
const { after, before, describe, test } = require("node:test");
const { createApp } = require("../server");

const TEST_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+3iZkWQAAAABJRU5ErkJggg==";

describe("char-maker server", { concurrency: false }, () => {
  let baseUrl;
  let server;

  before(async () => {
    await new Promise((resolve) => {
      server = createApp().listen(0, "127.0.0.1", () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  test("redirects the root to the display", async () => {
    const response = await fetch(`${baseUrl}/`, { redirect: "manual" });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "/display.html");
  });

  test("serves the mobile composer with security headers", async () => {
    const response = await fetch(`${baseUrl}/mobile.html`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-powered-by"), null);
    assert.match(html, /id="submitBtn"/);
  });

  test("reports health without caching", async () => {
    const response = await fetch(`${baseUrl}/api/health`);

    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(response.headers.get("cache-control"), "no-store");
  });

  test("starts without a submitted character", async () => {
    const response = await fetch(`${baseUrl}/api/latest`);

    assert.deepEqual(await response.json(), { image: null, timestamp: null });
    assert.equal(response.headers.get("cache-control"), "no-store");
  });

  test("rejects malformed image submissions", async () => {
    const response = await fetch(`${baseUrl}/api/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "https://example.com/tracker.png" }),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "valid PNG data URL required" });
  });

  test("rejects invalid JSON with a stable response", async () => {
    const response = await fetch(`${baseUrl}/api/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "invalid JSON" });
  });

  test("accepts a PNG data URL and exposes it to the display poller", async () => {
    const submitResponse = await fetch(`${baseUrl}/api/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: TEST_PNG }),
    });
    const submitBody = await submitResponse.json();

    assert.equal(submitResponse.status, 200);
    assert.equal(submitBody.ok, true);
    assert.equal(typeof submitBody.timestamp, "number");

    const latestResponse = await fetch(`${baseUrl}/api/latest`);
    assert.deepEqual(await latestResponse.json(), {
      image: TEST_PNG,
      timestamp: submitBody.timestamp,
    });
  });

  test("creates QR codes only for http and https URLs", async () => {
    const rejected = await fetch(
      `${baseUrl}/api/qr?url=${encodeURIComponent("javascript:alert(1)")}`,
    );
    assert.equal(rejected.status, 400);

    const accepted = await fetch(
      `${baseUrl}/api/qr?url=${encodeURIComponent(`${baseUrl}/mobile.html`)}`,
    );
    const body = await accepted.json();

    assert.equal(accepted.status, 200);
    assert.match(body.qr, /^data:image\/png;base64,/);
  });
});
