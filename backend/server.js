// ============================================================
// SUKA BREW AI CHATBOT BACKEND - server.js
// Production-grade: auto-clears port, graceful shutdown
// ============================================================

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const path = require("path");
const { execSync } = require("child_process");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const HAS_KEY =
  process.env.ANTHROPIC_API_KEY &&
  process.env.ANTHROPIC_API_KEY.trim() !== "" &&
  !process.env.ANTHROPIC_API_KEY.startsWith("your_");

if (!HAS_KEY) {
  console.warn("\n⚠️  No ANTHROPIC_API_KEY set — running in offline mode (built-in recommendations).\n");
}

const { handleChat } = require("./chatHandler");
const { synthesizeSpeech } = require("./tts");
const { saveFeedback, getFeedbackStats } = require("./feedbackStore");
const { generateQRCode } = require("./qrGenerator");
const { getSoldOut, markSoldOut, markAvailable, clearAllSoldOut } = require("./menuAdmin");

const PORT = parseInt(process.env.PORT || "3000", 10);

// Auto-detect the public base URL (works on Render, Railway, local)
function getBaseUrl(req) {
  if (process.env.PUBLIC_URL && process.env.PUBLIC_URL.trim()) {
    return process.env.PUBLIC_URL.trim().replace(/\/$/, "");
  }
  // req.protocol correctly returns "https" on Render when trust proxy is enabled
  const proto = req ? req.protocol : "http";
  const host  = req ? req.headers.host : `localhost:${PORT}`;
  return `${proto}://${host}`;
}

// ─── Pre-flight: free the port before binding ─────────────────────────────
// This runs synchronously so the port is guaranteed clear before listen()
function freePort(port) {
  try {
    const pids = execSync(`lsof -ti tcp:${port} 2>/dev/null || true`).toString().trim();
    if (pids) {
      pids.split("\n").filter(Boolean).forEach((pid) => {
        try { execSync(`kill -9 ${pid} 2>/dev/null`); } catch (_) {}
      });
      // Brief pause so the OS reclaims the socket
      execSync("sleep 0.5");
      console.log(`♻️  Cleared old process(es) on port ${port}`);
    }
  } catch (_) {
    // lsof / kill not available on this platform — continue anyway
  }
}

freePort(PORT);

// ─── App & server setup ───────────────────────────────────────────────────
const app = express();

// Attach WebSocket AFTER server is created — NOT during construction
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true }); // noServer = we upgrade manually

// Upgrade HTTP → WebSocket manually so errors stay on `server`, not `wss`
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

app.set("trust proxy", true); // Required: makes req.protocol = "https" on Render
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// ─── REST: Chat endpoint ──────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { sessionId, message, preferences } = req.body;
    const reply = await handleChat(sessionId || uuidv4(), message, preferences || {});
    res.json({ success: true, reply });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── REST: Text-to-Speech ─────────────────────────────────────────────────
app.post("/api/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });
    const audioBuffer = await synthesizeSpeech(text);
    res.set("Content-Type", "audio/mpeg");
    res.send(audioBuffer);
  } catch (err) {
    console.error("TTS error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── REST: Save feedback ──────────────────────────────────────────────────
app.post("/api/feedback", async (req, res) => {
  try {
    const { sessionId, likedSuggestions, enjoyedRecommendation, wouldRecommend, comments } = req.body;
    const record = await saveFeedback({
      sessionId: sessionId || uuidv4(),
      likedSuggestions,
      enjoyedRecommendation,
      wouldRecommend,
      comments,
      timestamp: new Date().toISOString(),
    });
    res.json({ success: true, id: record.id });
  } catch (err) {
    console.error("Feedback error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── REST: Analytics ─────────────────────────────────────────────────────
app.get("/api/analytics", async (req, res) => {
  try {
    const stats = await getFeedbackStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── REST: QR Code ───────────────────────────────────────────────────────
// Table-specific MUST come before generic /api/qr to avoid Express shadowing it
app.get("/api/qr/table/:num", async (req, res) => {
  try {
    const base = getBaseUrl(req);
    const url  = `${base}/?table=${encodeURIComponent(req.params.num)}`;
    const qr   = await generateQRCode(url);
    res.json({ success:true, qr, table: req.params.num, url });
  } catch(e){ res.status(500).json({ success:false, error:e.message }); }
});

app.post("/api/qr", async (req, res) => {
  try {
    const { url } = req.body;
    const qrDataURL = await generateQRCode(url || getBaseUrl(req));
    res.json({ success: true, qr: qrDataURL });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/qr", async (req, res) => {
  try {
    const url = req.query.url || getBaseUrl(req);
    const qrDataURL = await generateQRCode(url);
    res.json({ success: true, qr: qrDataURL });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Admin: serve dashboard ──────────────────────────────────────────────
app.get("/admin", (req, res) => {
  res.sendFile(require("path").join(__dirname, "../frontend/admin.html"));
});

// ─── Admin: sold-out management ──────────────────────────────────────────
app.get("/api/admin/soldout",      (req, res) => res.json({ success:true, soldOut: getSoldOut() }));
app.post("/api/admin/soldout",     (req, res) => { markSoldOut(req.body.name); res.json({ success:true, soldOut: getSoldOut() }); });
app.delete("/api/admin/soldout/:n",(req, res) => { markAvailable(decodeURIComponent(req.params.n)); res.json({ success:true, soldOut: getSoldOut() }); });
app.delete("/api/admin/soldout",   (req, res) => { clearAllSoldOut(); res.json({ success:true, soldOut: [] }); });


// ─── WebSocket ────────────────────────────────────────────────────────────
wss.on("connection", (ws) => {
  const sessionId = uuidv4();
  console.log(`WebSocket connected: ${sessionId}`);

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "chat") {
        const reply = await handleChat(msg.sessionId || sessionId, msg.text, msg.preferences || {});
        ws.send(JSON.stringify({ type: "reply", text: reply, sessionId }));
        if (msg.tts) {
          const audio = await synthesizeSpeech(reply);
          ws.send(JSON.stringify({ type: "audio", data: audio.toString("base64") }));
        }
      }
      if (msg.type === "feedback") {
        const record = await saveFeedback({ ...msg.feedback, sessionId, timestamp: new Date().toISOString() });
        ws.send(JSON.stringify({ type: "feedback_saved", id: record.id }));
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: "error", message: err.message }));
    }
  });

  ws.on("close", () => console.log(`WebSocket disconnected: ${sessionId}`));
  ws.on("error", (err) => console.error(`WebSocket error [${sessionId}]:`, err.message));
});

// ─── Graceful shutdown — always free the port on exit ────────────────────
function gracefulShutdown(signal) {
  console.log(`\n🛑  ${signal} received — shutting down gracefully...`);
  wss.clients.forEach((ws) => ws.terminate());
  server.close(() => {
    console.log("✅  Server closed cleanly.\n");
    process.exit(0);
  });
  // Force exit after 5 s if something hangs
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGINT",  () => gracefulShutdown("SIGINT"));   // Ctrl+C
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));  // kill / Railway/Render stop
process.on("SIGHUP",  () => gracefulShutdown("SIGHUP"));   // terminal closed

// Catch any unhandled errors so the process never silently crashes
process.on("uncaughtException",  (err) => console.error("Uncaught exception:",  err.message));
process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err));

// ─── Start ────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🍺  Suka Brew AI Server  →  http://localhost:${PORT}`);
  console.log(`📊  Analytics           →  http://localhost:${PORT}/analytics.html`);
  console.log(`🍽️   Admin Dashboard     →  http://localhost:${PORT}/admin`);
  console.log(`🔗  QR Code             →  http://localhost:${PORT}/api/qr\n`);
});
