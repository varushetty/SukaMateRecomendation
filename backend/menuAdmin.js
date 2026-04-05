// ============================================================
// menuAdmin.js — Restaurant-side live menu management
// Handles: sold-out toggles, table numbers, party size
// ============================================================

const fs   = require("fs");
const path = require("path");

const DB = path.join(__dirname, "../data/menuState.json");

function loadState() {
  if (!fs.existsSync(DB)) {
    const defaults = { soldOut: [], lastUpdated: new Date().toISOString() };
    fs.mkdirSync(path.dirname(DB), { recursive: true });
    fs.writeFileSync(DB, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  return JSON.parse(fs.readFileSync(DB, "utf-8"));
}

function saveState(state) {
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DB, JSON.stringify(state, null, 2));
}

function getSoldOut()           { return loadState().soldOut || []; }
function markSoldOut(name)      { const s = loadState(); if (!s.soldOut.includes(name)) { s.soldOut.push(name); saveState(s); } }
function markAvailable(name)    { const s = loadState(); s.soldOut = s.soldOut.filter(n => n !== name); saveState(s); }
function clearAllSoldOut()      { saveState({ soldOut: [] }); }

module.exports = { getSoldOut, markSoldOut, markAvailable, clearAllSoldOut, loadState };
