const express = require('express');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const os = require('os');

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.static('public'));
app.use('/cards', express.static('cards'));
app.use('/uploads', express.static('uploads'));

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

let latestImage = null;

// 캐릭터 이미지 제출
app.post('/api/submit', (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'no image' });

  const filename = `char_${Date.now()}.png`;
  const base64Data = image.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), base64Data, 'base64');
  latestImage = { filename, timestamp: Date.now() };
  res.json({ ok: true });
});

// 최신 이미지 조회 (polling용)
app.get('/api/latest', (req, res) => {
  if (!latestImage) return res.json({ image: null });
  res.json({
    image: `/uploads/${latestImage.filename}`,
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

// 로컬 IP 찾기
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
