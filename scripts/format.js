#!/usr/bin/env node
// Tidy PostToolUse hook: after Claude writes or edits a file, format it with the
// project's own Prettier, but only if the project already uses Prettier.
// Always exits 0 so a formatting problem never blocks Claude.

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const CONFIG_FILES = [
  ".prettierrc",
  ".prettierrc.json",
  ".prettierrc.json5",
  ".prettierrc.yaml",
  ".prettierrc.yml",
  ".prettierrc.toml",
  ".prettierrc.js",
  ".prettierrc.cjs",
  ".prettierrc.mjs",
  "prettier.config.js",
  "prettier.config.cjs",
  "prettier.config.mjs",
];

// Walk up from startDir; return the first folder that has a Prettier config, or null.
function findConfigDir(startDir) {
  let dir = startDir;
  while (true) {
    if (CONFIG_FILES.some((name) => fs.existsSync(path.join(dir, name)))) return dir;

    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg.prettier) return dir;
    }

    const parent = path.dirname(dir);
    if (parent === dir) return null; // reached the drive root
    dir = parent;
  }
}

// Find the project's installed Prettier CLI (same lookup Node uses for require).
function findPrettierBin(startDir) {
  let pkgPath;
  try {
    pkgPath = require.resolve("prettier/package.json", { paths: [startDir] });
  } catch {
    return null; // Prettier isn't installed in this project
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin.prettier;
  return path.join(path.dirname(pkgPath), bin);
}

function main(hookInput) {
  const filePath = hookInput.tool_input && hookInput.tool_input.file_path;
  if (!filePath || !fs.existsSync(filePath)) return;

  const fileDir = path.dirname(filePath);
  const configDir = findConfigDir(fileDir);
  if (!configDir) return; // project doesn't use Prettier: leave the file alone

  const prettierBin = findPrettierBin(fileDir);
  if (!prettierBin) return;

  const result = spawnSync(
    process.execPath, // the current node.exe, so no shell or npx is needed
    [prettierBin, "--write", "--ignore-unknown", filePath],
    { cwd: configDir, encoding: "utf8" }
  );
  if (result.status !== 0) {
    console.error(`tidy: prettier failed on ${filePath}\n${result.stderr}`);
  }
}

// Claude Code sends the hook's input as JSON on stdin.
let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    main(JSON.parse(input));
  } catch (err) {
    console.error(`tidy: ${err.message}`);
  }
  process.exit(0);
});
