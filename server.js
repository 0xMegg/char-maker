const express = require('express');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 최신 이미지를 메모리에 보관 (base64 data URL)
let latestImage = null;

// 캐릭터 이미지 제출
app.post('/api/submit', (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'no image' });

  latestImage = { image, timestamp: Date.now() };
  res.json({ ok: true });
});

// 최신 이미지 조회 (polling용)
app.get('/api/latest', (req, res) => {
  if (!latestImage) return res.json({ image: null });
  res.json({
    image: latestImage.image,
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

// 로컬 실행용
if (require.main === module) {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  let ip = 'localhost';
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) { ip = iface.address; break; }
    }
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  char-maker server running\n`);
    console.log(`  Display: http://localhost:${PORT}/display.html`);
    console.log(`  Mobile:  http://${ip}:${PORT}/mobile.html\n`);
  });
}

module.exports = app;
