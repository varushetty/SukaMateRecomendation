// ============================================================
// tts.js — TTS is handled entirely in the browser (Web Speech API)
// This file is kept as a stub so server.js import doesn't break.
// The actual voice playback happens in frontend/index.html using
// window.speechSynthesis — 100% FREE, no API key needed.
// ============================================================

async function synthesizeSpeech(text) {
  // Server-side TTS is not used. Voice is handled in the browser.
  return Buffer.alloc(0);
}

module.exports = { synthesizeSpeech };
