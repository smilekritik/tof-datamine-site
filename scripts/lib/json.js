const fs = require("fs");
const path = require("path");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const buf = fs.readFileSync(filePath);
  let str;

  // Handle UTF-16 LE, UTF-16 BE, or UTF-8 BOM
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    str = buf.toString("utf16le");
  } else if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    str = buf.toString("utf16be");
  } else {
    str = buf.toString("utf8");
  }

  str = str.replace(/^\uFEFF/, "").trim();

  // Guard against potential duplicate object prefix in corrupted files
  const firstBrace = str.indexOf("{", 1);
  if (firstBrace !== -1 && str.startsWith('{"stave_thunder_plasm":1,{')) {
    str = str.slice(firstBrace);
  }

  try {
    return JSON.parse(str);
  } catch (err) {
    console.warn(`[JSON Lib] Warning parsing JSON from ${filePath}:`, err.message);
    return null;
  }
}

function writeJsonFile(filePath, data, indent = 2) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, indent), "utf8");
}

module.exports = {
  ensureDir,
  readJsonFile,
  writeJsonFile
};
