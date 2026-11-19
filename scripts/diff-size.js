#!/usr/bin/env node
// Tidy Stop hook: when Claude finishes a turn, measure the diff of the files it
// edited this session and warn about churn (whitespace-only changes, lockfiles,
// dependency changes). Warn-only: it shows a message and never makes Claude continue.

const fs = require("fs");
const path = require("path");
const { runHook, findProjectRoot, isInside, git, editLogPath } = require("./common");

// Warn when at least this many changed lines differ only in whitespace or line endings.
const WHITESPACE_WARN_LINES = 10;

const DEPENDENCY_FILES = [
  "package.json",
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "bun.lock",
];

// Sum `git diff --numstat` lines per file; whitespaceOnly = true ignores whitespace changes.
function numstat(root, files, whitespaceOnly) {
  const args = ["diff", "--numstat", "HEAD"];
  if (whitespaceOnly) args.push("-w", "--ignore-blank-lines", "--ignore-cr-at-eol");
  const output = git(root, [...args, "--", ...files]);
  const stats = new Map();
  if (!output) return stats;

  for (const line of output.split("\n")) {
    const [added, removed, file] = line.split("\t");
    if (!file || added === "-") continue; // binary file
    stats.set(file, Number(added) + Number(removed));
  }
  return stats;
}

// Count the lines in edited files git doesn't track yet (numstat skips them).
function untrackedLines(root, files) {
  const output = git(root, ["ls-files", "--others", "--exclude-standard", "--", ...files]);
  if (!output) return { count: 0, lines: 0 };

  const untracked = output.split("\n").filter(Boolean);
  const lines = untracked.reduce((sum, file) => {
    const text = fs.readFileSync(path.join(root, file), "utf8");
    return sum + text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
  }, 0);
  return { count: untracked.length, lines };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function main(hookInput) {
  if (hookInput.stop_hook_active || !hookInput.session_id) return;

  const logPath = editLogPath(hookInput.session_id);
  if (!fs.existsSync(logPath)) return;

  const root = findProjectRoot(hookInput);
  if (git(root, ["rev-parse", "--verify", "HEAD"]) === null) return; // not a repo, or no commits yet

  const files = fs
    .readFileSync(logPath, "utf8")
    .split("\n")
    .filter((file) => file && isInside(root, file) && fs.existsSync(file))
    .map((file) => path.relative(root, file).split(path.sep).join("/"));
  if (files.length === 0) return;

  const total = numstat(root, files, false);
  const ignoringWhitespace = numstat(root, files, true);
  const untracked = untrackedLines(root, files);

  let changedLines = 0;
  let whitespaceLines = 0;
  const whitespaceOnlyFiles = [];
  for (const [file, lines] of total) {
    const realLines = ignoringWhitespace.get(file) || 0;
    changedLines += lines;
    whitespaceLines += Math.max(0, lines - realLines);
    if (realLines === 0) whitespaceOnlyFiles.push(file);
  }
  const dependencyFiles = [...total.keys()].filter((file) =>
    DEPENDENCY_FILES.includes(path.posix.basename(file))
  );
  if (changedLines === 0 && untracked.count === 0) return;

  let summary = `Tidy: ${plural(changedLines, "changed line")} in ${plural(total.size, "file")}`;
  if (untracked.count > 0) {
    summary += `, ${plural(untracked.lines, "line")} in ${plural(untracked.count, "new file")}`;
  }

  const warnings = [];
  if (whitespaceLines >= WHITESPACE_WARN_LINES) {
    warnings.push(`${whitespaceLines} lines differ only in whitespace or line endings`);
  }
  if (whitespaceOnlyFiles.length > 0) {
    warnings.push(`whitespace-only changes in ${whitespaceOnlyFiles.join(", ")}`);
  }
  if (dependencyFiles.length > 0) {
    warnings.push(`dependency files changed: ${dependencyFiles.join(", ")}`);
  }

  const message = warnings.length > 0 ? `${summary}. Check: ${warnings.join("; ")}.` : `${summary}.`;
  console.log(JSON.stringify({ systemMessage: message }));
}

runHook(main);
