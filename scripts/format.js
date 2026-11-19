#!/usr/bin/env node
// Tidy PostToolUse hook: after Claude writes or edits a file, format it with the
// project's own Prettier, but only if the project already uses Prettier and the
// file was already Prettier-formatted, so formatting never adds unrelated diff noise.
// Exits 0 so a formatting problem never blocks Claude; exits 2 on a syntax error so
// Claude sees Prettier's message.

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { runHook, findProjectRoot, isInside, git } = require("./common");

// Find the project's installed Prettier CLI (same lookup Node uses for require),
// ignoring copies outside the project such as a stray ~/node_modules.
function findPrettierBin(startDir, root) {
  let pkgPath;
  try {
    pkgPath = require.resolve("prettier/package.json", { paths: [startDir] });
  } catch {
    return null; // Prettier isn't installed in this project
  }
  if (!isInside(root, pkgPath)) return null;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin.prettier;
  return path.join(path.dirname(pkgPath), bin);
}

// Run the Prettier CLI with the current node.exe, so no shell or npx is needed.
// Runs from the project root so Prettier picks up the root .prettierignore.
function prettier(prettierBin, root, args, input) {
  return spawnSync(process.execPath, [prettierBin, ...args], {
    cwd: root,
    encoding: "utf8",
    input,
    timeout: 20000,
  });
}

// Prettier's own config lookup; returns the config path, or null if there's none.
function findConfig(prettierBin, root, filePath) {
  const result = prettier(prettierBin, root, ["--find-config-path", filePath]);
  const configPath = result.status === 0 && result.stdout.trim();
  return configPath ? path.resolve(root, configPath) : null;
}

// True if Prettier can format this file and .prettierignore doesn't exclude it.
function isFormattable(prettierBin, root, filePath) {
  const result = prettier(prettierBin, root, ["--file-info", filePath]);
  if (result.status !== 0) return false;
  const info = JSON.parse(result.stdout);
  return !info.ignored && Boolean(info.inferredParser);
}

const normalizeEol = (text) => text.replace(/\r\n/g, "\n");

// True if the committed version of the file was already Prettier-formatted.
// New and untracked files count as formatted, since every line in them is new.
function wasFormattedAtHead(prettierBin, root, filePath) {
  const dir = path.dirname(filePath);
  const name = path.basename(filePath);
  if (git(dir, ["ls-files", "--error-unmatch", "--", name]) === null) return true;

  const committed = git(dir, ["show", `HEAD:./${name}`]);
  if (committed === null) return true; // no commits yet

  const result = prettier(prettierBin, root, ["--stdin-filepath", filePath], committed);
  return result.status === 0 && normalizeEol(result.stdout) === normalizeEol(committed);
}

// Tell Claude something without blocking (shown as context on its next request).
function addContext(message) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: message },
    })
  );
}

function main(hookInput) {
  const filePath = hookInput.tool_input && hookInput.tool_input.file_path;
  if (!filePath || !fs.existsSync(filePath)) return;

  const root = findProjectRoot(hookInput);
  if (!isInside(root, filePath)) return;

  const prettierBin = findPrettierBin(path.dirname(filePath), root);
  if (!prettierBin) return;

  const configPath = findConfig(prettierBin, root, filePath);
  if (!configPath || !isInside(root, configPath)) return; // project doesn't use Prettier
  if (!isFormattable(prettierBin, root, filePath)) return;

  if (!wasFormattedAtHead(prettierBin, root, filePath)) {
    addContext(
      `tidy: ${path.basename(filePath)} wasn't Prettier-formatted before this change, ` +
        "so Prettier was skipped to keep the diff minimal. Match the file's existing formatting by hand."
    );
    return;
  }

  const before = fs.readFileSync(filePath, "utf8");
  const result = prettier(prettierBin, root, ["--write", filePath]);
  if (result.error) {
    console.error(`tidy: couldn't run prettier on ${filePath}: ${result.error.message}`);
    return;
  }
  if (result.status === 2) {
    console.error(`tidy: prettier couldn't parse ${filePath}\n${result.stderr}`);
    return 2;
  }
  if (result.status !== 0) {
    console.error(`tidy: prettier failed on ${filePath}\n${result.stderr}`);
    return;
  }

  // Keep CRLF files as CRLF (e.g. git autocrlf on Windows), so line endings don't churn.
  const after = fs.readFileSync(filePath, "utf8");
  const wasCrlf = before.includes("\r\n") && !/(^|[^\r])\n/.test(before);
  if (wasCrlf && !after.includes("\r\n")) {
    fs.writeFileSync(filePath, after.replace(/\n/g, "\r\n"));
  }
}

runHook(main);
