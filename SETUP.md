# 🚀 Business AI Builder — Hướng Dẫn Chạy Thực Tế

## 🐛 Các lỗi đã được sửa

| # | Lỗi | Mức độ | Sửa như thế nào |
|---|-----|--------|-----------------|
| 1 | `Toast` useEffect thiếu `[]` dependency | 🔴 Bug | Thêm `[onDone]` vào deps array |
| 2 | `generateModule` không gọi `setLoading(true)` | 🔴 Bug | Thêm `setLoading(true)` + `finally` block |
| 3 | `useEffect` queue thiếu `generateModule` trong deps | 🟡 Warn | Thêm vào dependency array |
| 4 | `callClaude` dùng stale closure của `messages` | 🟡 Warn | Dùng `useRef` + `addMessage()` helper |
| 5 | Browser gọi thẳng Anthropic API → **CORS blocked** | 🔴 Critical | Proxy qua Express server `/api/chat` |
| 6 | `exportAll` thiếu `URL.revokeObjectURL()` | 🟢 Minor | Thêm cleanup sau khi download |

---

## 📁 Cấu Trúc Dự Án

```
business-ai-builder/
├── index.html          ← Entry HTML
├── package.json        ← Dependencies & scripts
├── vite.config.js      ← Vite + proxy config
├── server.js           ← Express backend (giải quyết CORS)
├── .env                ← API key (bạn tự tạo)
└── src/
    ├── main.jsx        ← React entry point
    └── App.jsx         ← Toàn bộ app
```

---

## ⚡ Cách Chạy (5 bước)

### Bước 1 — Cài Node.js
Tải về tại https://nodejs.org (chọn LTS, version 18+)

Kiểm tra:
```bash
node --version   # phải >= 18.0.0
npm --version    # phải >= 8.0.0
```

### Bước 2 — Tạo thư mục & copy files
```bash
mkdir business-ai-builder
cd business-ai-builder
```
Copy tất cả files vào thư mục này.

### Bước 3 — Tạo file `.env` với API Key
```bash
# Tạo file .env trong thư mục gốc
echo "ANTHROPIC_API_KEY=sk-ant-xxxxxx" > .env
```
Lấy API key tại: https://console.anthropic.com/settings/keys

> ⚠️ **Không** commit file `.env` lên Git!

### Bước 4 — Cài packages
```bash
npm install
```

### Bước 5 — Chạy app
```bash
npm start
# Lệnh này chạy đồng thời:
#   - Express server  tại http://localhost:3001
#   - Vite dev server tại http://localhost:5173
```

Mở trình duyệt: **http://localhost:5173**

---

## 🏗️ Kiến Trúc Khi Chạy

```
Trình duyệt (React)
     │
     │  POST /api/chat
     ▼
Vite Proxy (port 5173)
     │
     │  forward to localhost:3001
     ▼
Express Server (port 3001)
     │
     │  POST https://api.anthropic.com/v1/messages
     │  Header: x-api-key: sk-ant-...
     ▼
Anthropic Claude API
```

**Lý do cần proxy:** Trình duyệt không được phép gọi thẳng đến Anthropic API vì:
- CORS policy của Anthropic không cho phép browser requests
- API key sẽ bị lộ trong network tab nếu gọi từ client

---

## 🚀 Build & Deploy Production

### Build static files
```bash
npm run build
# Output: dist/ folder
```

### Deploy lên Vercel (Frontend) + Railway (Backend)

**Frontend (Vercel):**
```bash
npm install -g vercel
vercel --prod
```
Thêm env var `VITE_API_URL` trong Vercel dashboard.

**Backend (Railway):**
1. Push code lên GitHub
2. Vào https://railway.app → New Project → Deploy from GitHub
3. Thêm env var: `ANTHROPIC_API_KEY=sk-ant-...`
4. Railway tự động deploy

---

## 🔧 Troubleshooting

### Lỗi: `CORS error` khi gọi API
→ Server chưa chạy. Kiểm tra `npm run server` đang hoạt động.

### Lỗi: `401 Unauthorized`
→ API key sai hoặc chưa có trong `.env`. Kiểm tra `ANTHROPIC_API_KEY`.

### Lỗi: `Cannot find module 'express'`
→ Chưa cài packages. Chạy `npm install`.

### Port 3001 bị chiếm
```bash
# Đổi port trong server.js
const PORT = 3002;
# Và trong vite.config.js
target: "http://localhost:3002"
```

### App chạy chậm khi generate nhiều module
→ Bình thường — mỗi module gọi 1 API request (~5-15 giây). Các module được queue tự động.

---

## 💡 Tips

- **Chọn 1-2 module trước** để test, sau đó thêm dần
- **Quick prompts** sau khi generate giúp tinh chỉnh nhanh
- **Export All** → copy code vào dự án React thật của bạn
- Mỗi module là 1 React component độc lập, dễ tích hợp
