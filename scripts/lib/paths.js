const fs = require("fs");
const path = require("path");

function resolveProjectRoot(fromDir = __dirname) {
  let current = path.resolve(fromDir);
  while (current && current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, "datamine")) || fs.existsSync(path.join(current, "package.json"))) {
      return current;
    }
    current = path.dirname(current);
  }
  return path.resolve(fromDir, "..");
}

function resolveRawDir(projectRoot) {
  const customArg = process.argv.find((arg) => arg.startsWith("--raw-dir="));
  if (customArg) {
    return path.resolve(customArg.split("=")[1]);
  }

  const candidateDirs = [
    path.join(projectRoot, "raw_exports"),
    path.join(projectRoot, "datamine-pipeline", "raw_exports"),
    path.join(projectRoot, "temperary"),
    path.resolve("D:/TofMods/picgit/Exports")
  ];

  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  return path.join(projectRoot, "raw_exports");
}

function findFirstExisting(candidates) {
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

module.exports = {
  resolveProjectRoot,
  resolveRawDir,
  findFirstExisting
};
