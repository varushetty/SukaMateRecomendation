// ============================================================
// qrGenerator.js — Generate QR codes for restaurant tables
// ============================================================

const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

async function generateQRCode(url) {
  const dataURL = await QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: {
      dark: "#1a1a2e",  // Dark navy
      light: "#ffffff",
    },
    errorCorrectionLevel: "H",
  });
  return dataURL;
}

// Also save QR as PNG file for printing
async function saveQRCodePNG(url, filename = "suka-brew-qr.png") {
  const outputPath = path.join(__dirname, "../data", filename);
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  await QRCode.toFile(outputPath, url, {
    width: 800,
    margin: 2,
    color: { dark: "#1a1a2e", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });

  console.log(`📱 QR Code saved: ${outputPath}`);
  return outputPath;
}

module.exports = { generateQRCode, saveQRCodePNG };
