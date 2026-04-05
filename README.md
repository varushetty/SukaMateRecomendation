# 🍺 Suka Brew AI Chatbot — Complete Guide

A fully self-hosted AI restaurant chatbot with voice assistant, built from your Voiceflow project.

---

## 📁 Project Structure

```
sukabrew/
├── backend/
│   ├── server.js         ← Main Express server + WebSocket
│   ├── chatHandler.js    ← Claude AI chat logic
│   ├── tts.js            ← ElevenLabs voice output
│   ├── feedbackStore.js  ← Save & analyze feedback
│   └── qrGenerator.js    ← QR code generator
├── frontend/
│   ├── index.html        ← Main chatbot UI (voice + chat)
│   └── analytics.html    ← Analytics dashboard
├── data/
│   └── feedback.json     ← Auto-created on first feedback
├── .env.example          ← Copy to .env and add API keys
├── package.json
└── README.md
```

---

## 🚀 Quick Start (Local)

### 1. Prerequisites
- Node.js v18+ → https://nodejs.org/

### 2. Setup — run these commands in order

```bash
# Step 1: Enter the folder
cd sukabrew

# Step 2: Install dependencies  ← THIS IS REQUIRED, do not skip
npm install

# Step 3: Create your .env file
cp .env.example .env

# Step 4: Add your Anthropic API key to .env
# Open .env in any text editor and paste your key:
# ANTHROPIC_API_KEY=sk-ant-...

# Step 5: Start the server
npm start
```

Then open **http://localhost:3000** in your browser.

> ⚠️ **Common error fix**: If you see `Cannot find module 'express'`, you forgot Step 2. Run `npm install` first.

### 3. Get your FREE Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up (free)
3. Go to API Keys → Create Key
4. Paste it in your `.env` file as `ANTHROPIC_API_KEY=sk-ant-...`

> **Voice input & output**: Both use the browser's **built-in Web Speech API** — completely FREE, no sign-up needed. Works best in Chrome or Edge.

---

## 🌐 Publishing / Deployment

### Option A: Railway (Recommended — Easiest, Free tier available)
1. Create account at https://railway.app
2. Click "New Project" → "Deploy from GitHub" OR "Deploy from local"
3. Upload this folder
4. Add environment variables in Railway dashboard
5. Your app gets a public URL like: `https://sukabrew.railway.app`
6. **Cost: ~₹0–₹400/month** (hobby tier)

### Option B: Render
1. https://render.com → New Web Service
2. Connect GitHub repo or upload
3. Build command: `npm install`
4. Start command: `npm start`
5. **Cost: Free tier available** (sleeps after 15min inactivity)

### Option C: Fly.io
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Deploy
fly launch
fly deploy
```
**Cost: ~₹0–₹800/month**

### Option D: VPS (Best control — DigitalOcean/Hetzner)
```bash
# On your VPS
git clone <your-repo>
cd sukabrew
npm install
cp .env.example .env
# Edit .env

# Run with PM2 (keeps it alive)
npm install -g pm2
pm2 start backend/server.js --name sukabrew
pm2 startup   # auto-restart on reboot
```
- Hetzner CX11: **~₹350/month**
- DigitalOcean Droplet: **~₹600/month**

---

## 📱 QR Code Generation

After deploying, generate a QR code pointing to your live URL:

```bash
# API call
curl -X POST https://your-app.railway.app/api/qr \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-app.railway.app"}'
```

Or visit `https://your-app.railway.app/api/qr` in browser.

**Print the QR code and place it on restaurant tables.**

---

## 💰 Monthly Cost Estimate (INR)

| Item | Tool | Monthly Cost |
|------|------|-------------|
| AI Recommendations | Claude API | ~₹200–800 (usage-based) |
| Voice Output (TTS) | Browser Web Speech API | **₹0 FREE** |
| Voice Input (STT) | Browser Web Speech API | **₹0 FREE** |
| Hosting | Railway/Render | ₹0–₹400 |
| **TOTAL** | | **₹200–₹800/month** |

**Savings vs Voiceflow ₹4,000–5,000/month = ~85% savings ✅**

---

## ✨ Features Included

- ✅ AI-powered menu recommendations (Claude)
- ✅ Voice input (browser Web Speech API)
- ✅ Voice output (ElevenLabs TTS)
- ✅ Smart quick-reply buttons
- ✅ Customer feedback collection
- ✅ Analytics dashboard with charts
- ✅ QR code generator
- ✅ Real-time WebSocket support
- ✅ Mobile responsive UI
- ✅ Session management

---

## 🛠️ Customization

- **Change restaurant name/menu**: Edit `chatHandler.js` → `MENU` object and `SYSTEM_PROMPT`
- **Change voice**: Get voice ID from ElevenLabs → update `ELEVENLABS_VOICE_ID` in `.env`
- **Add more flows**: Extend `chatHandler.js` with custom routing logic
- **Database**: Replace `feedbackStore.js` JSON with MongoDB/Supabase for production

---

## 📞 Support

Built from your Voiceflow project: **Suka Brew / My first AI agent v13.07**
