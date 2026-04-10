const express = require('express');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.static('public'));
app.use('/cards', express.static('cards'));

// 인메모리 이미지 저장 (Vercel serverless 호환)
let latestImage = null;

// 캐릭터 이미지 제출
app.post('/api/submit', (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'no image' });
  latestImage = { dataUrl: image, timestamp: Date.now() };
  res.json({ ok: true });
});

// 최신 이미지 조회 (polling용)
app.get('/api/latest', (req, res) => {
  if (!latestImage) return res.json({ image: null });
  res.json({
    image: latestImage.dataUrl,
    timestamp: latestImage.timestamp,
  });
});

// QR 코드 생성
app.get('/api/qr', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'url required' });
  const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 });
  res.json({ qr: dataUrl });
});

// Vercel: export app
module.exports = app;

// 로컬 실행
if (require.main === module) {
  const os = require('os');
  function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) return iface.address;
      }
    }
    return 'localhost';
  }

  app.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIP();
    console.log(`\n  char-maker server running\n`);
    console.log(`  Display: http://localhost:${PORT}/display.html`);
    console.log(`  Mobile:  http://${ip}:${PORT}/mobile.html\n`);
  });
}
