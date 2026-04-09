# char-maker

모바일에서 캐릭터를 조합하고, 디스플레이 화면에 실시간으로 표시하는 인터랙티브 웹앱.

## 개요

이벤트/전시 등에서 활용할 수 있는 캐릭터 메이커입니다. 방문자가 모바일로 QR 코드를 스캔하면 캐릭터 조합 페이지에 접속하고, 완성된 캐릭터가 대형 디스플레이에 실시간으로 나타납니다.

## 구조

```
mobile.html  →  서버(Express)  →  display.html
(캐릭터 조합)    (이미지 저장)      (실시간 표시 + QR)
```

- **모바일 페이지** (`/mobile.html`) — 몸, 헤어, 상의 파츠를 골라 캐릭터를 조합하고 전송
- **디스플레이 페이지** (`/display.html`) — 최신 캐릭터를 애니메이션 배경과 함께 표시, QR 코드 제공
- **서버** (`server.js`) — Express 기반. 이미지 제출/조회 API, QR 코드 생성

## 실행

```bash
npm install
npm start
```

서버가 시작되면 콘솔에 표시되는 URL로 접속합니다:

- **Display**: `http://localhost:3000/display.html`
- **Mobile**: `http://<로컬IP>:3000/mobile.html`

## 기술 스택

- Node.js + Express
- Vanilla HTML/CSS/JS (프레임워크 없음)
- SVG 레이어 합성 (Canvas API)
- QR 코드 생성 (`qrcode`)
