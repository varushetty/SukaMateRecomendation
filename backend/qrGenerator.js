// ============================================================
// qrGenerator.js — Generate QR codes for restaurant tables
// ============================================================

const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

async function generateQRCode(url) {
  const dataURL = await QRCode.toDataURL(url, {
    width: 600,
    margin: 1,
    color: {
      dark: "#000000",  // Pure black — required for reliable phone scanning
      light: "#ffffff",
    },
    errorCorrectionLevel: "M", // M = smaller QR (less dense), easier to scan than H
  });
  return dataURL;
}

// Also save QR as PNG file for printing
async function saveQRCodePNG(url, filename = "suka-brew-qr.png") {
  const outputPath = path.join(__dirname, "../data", filename);
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  await QRCode.toFile(outputPath, url, {
    width: 1000,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });

  console.log(`📱 QR Code saved: ${outputPath}`);
  return outputPath;
}

module.exports = { generateQRCode, saveQRCodePNG };
