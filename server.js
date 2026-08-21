const express = require("express");
const path = require("path");
const QRCode = require("qrcode");

const PORT = process.env.PORT || 3000;
const JSON_LIMIT = "8mb";
const MAX_IMAGE_DATA_URL_LENGTH = 8 * 1024 * 1024;
const MAX_QR_URL_LENGTH = 2048;
const PNG_DATA_URL_PATTERN = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;

function createApp() {
  const app = express();
  let latestImage = null;

  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });
  app.use(express.json({ limit: JSON_LIMIT }));
  app.use(express.static(path.join(__dirname, "public")));
  app.use("/cards", express.static(path.join(__dirname, "cards")));

  app.get("/", (req, res) => {
    res.redirect("/display.html");
  });

  app.get("/api/health", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true });
  });

  // 단일 Node 프로세스에서 최신 캐릭터를 공유한다.
  // 서버리스 인스턴스 간에는 메모리가 공유되지 않으므로 README의 운영 한계를 참고한다.
  app.post("/api/submit", (req, res) => {
    const image = req.body?.image;
    if (!isValidPngDataUrl(image)) {
      return res.status(400).json({ error: "valid PNG data URL required" });
    }

    latestImage = { dataUrl: image, timestamp: Date.now() };
    res.setHeader("Cache-Control", "no-store");
    return res.json({ ok: true, timestamp: latestImage.timestamp });
  });

  app.get("/api/latest", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!latestImage) return res.json({ image: null, timestamp: null });
    return res.json({
      image: latestImage.dataUrl,
      timestamp: latestImage.timestamp,
    });
  });

  app.get("/api/qr", async (req, res, next) => {
    const url = normalizeQrUrl(req.query.url);
    if (!url) return res.status(400).json({ error: "valid http(s) URL required" });

    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 });
      res.setHeader("Cache-Control", "no-store");
      return res.json({ qr: dataUrl });
    } catch (error) {
      return next(error);
    }
  });

  app.use((error, req, res, next) => {
    if (error?.type === "entity.too.large") {
      return res.status(413).json({ error: "image payload too large" });
    }
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
      return res.status(400).json({ error: "invalid JSON" });
    }
    return next(error);
  });

  return app;
}

function isValidPngDataUrl(value) {
  return (
    typeof value === "string" &&
    value.length <= MAX_IMAGE_DATA_URL_LENGTH &&
    PNG_DATA_URL_PATTERN.test(value)
  );
}

function normalizeQrUrl(value) {
  if (typeof value !== "string" || value.length > MAX_QR_URL_LENGTH) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const app = createApp();

module.exports = app;
module.exports.createApp = createApp;

// 로컬 실행
if (require.main === module) {
  const os = require("os");
  function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === "IPv4" && !iface.internal) return iface.address;
      }
    }
    return "localhost";
  }

  app.listen(PORT, "0.0.0.0", () => {
    const ip = getLocalIP();
    console.log(`\n  char-maker server running\n`);
    console.log(`  Display: http://localhost:${PORT}/display.html`);
    console.log(`  Mobile:  http://${ip}:${PORT}/mobile.html\n`);
  });
}
