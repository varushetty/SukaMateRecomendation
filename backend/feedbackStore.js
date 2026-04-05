// ============================================================
// feedbackStore.js — Store & analyze customer feedback (JSON file)
// Upgrade: swap jsonDb with MongoDB/Supabase for production
// ============================================================

const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const DB_PATH = path.join(__dirname, "../data/feedback.json");

// Ensure data directory and file exist
function ensureDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify([]));
}

function readAll() {
  ensureDb();
  try {
    // Strip any stray non-ASCII / non-printable characters that corrupt JSON
    const raw = fs.readFileSync(DB_PATH, "utf-8").replace(/[^\x20-\x7E\n\r\t]/g, "").trim();
    return JSON.parse(raw || "[]");
  } catch (e) {
    console.warn("⚠️  feedback.json was corrupted — resetting to empty list.");
    fs.writeFileSync(DB_PATH, JSON.stringify([]));
    return [];
  }
}

function writeAll(records) {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(records, null, 2));
}

// ─── Save feedback ────────────────────────────────────────────────────────
async function saveFeedback(data) {
  const records = readAll();
  const record = { id: uuidv4(), ...data };
  records.push(record);
  writeAll(records);
  console.log(`✅ Feedback saved: ${record.id}`);
  return record;
}

// ─── Compute analytics stats ──────────────────────────────────────────────
async function getFeedbackStats() {
  const records = readAll();
  const total = records.length;

  if (total === 0) {
    return {
      total: 0,
      likedSuggestions: { yes: 0, no: 0, pct: 0 },
      enjoyedRecommendation: { yes: 0, no: 0, pct: 0 },
      wouldRecommend: { yes: 0, no: 0, pct: 0 },
      recentFeedback: [],
      dailyTrend: [],
    };
  }

  const count = (field) => ({
    yes: records.filter((r) => r[field] === true || r[field] === "yes").length,
    no: records.filter((r) => r[field] === false || r[field] === "no").length,
    pct: Math.round(
      (records.filter((r) => r[field] === true || r[field] === "yes").length / total) * 100
    ),
  });

  // Daily trend (last 7 days)
  const now = new Date();
  const dailyTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayCount = records.filter((r) => r.timestamp && r.timestamp.startsWith(dateStr)).length;
    dailyTrend.push({ date: dateStr, count: dayCount });
  }

  return {
    total,
    likedSuggestions: count("likedSuggestions"),
    enjoyedRecommendation: count("enjoyedRecommendation"),
    wouldRecommend: count("wouldRecommend"),
    recentFeedback: records.slice(-10).reverse().map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      comments: r.comments || "",
      wouldRecommend: r.wouldRecommend,
    })),
    dailyTrend,
  };
}

module.exports = { saveFeedback, getFeedbackStats };
