// Helpers shared by Tidy's hook scripts.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

// Read the hook's JSON input from stdin and pass it to handler.
// Always exits so a hook problem never blocks Claude; handler can return an exit code.
function runHook(handler) {
  let input = "";
  process.stdin.setEncoding("utf8"); // decode as a whole so multi-byte characters survive chunk boundaries
  process.stdin.on("data", (chunk) => (input += chunk));
  process.stdin.on("end", () => {
    let exitCode = 0;
    try {
      exitCode = handler(JSON.parse(input)) || 0;
    } catch (err) {
      console.error(`tidy: ${err.message}`);
    }
    process.exit(exitCode);
  });
}

// The folder Claude Code was started in. Lookups never walk above it.
function findProjectRoot(hookInput) {
  return path.resolve(process.env.CLAUDE_PROJECT_DIR || hookInput.cwd || process.cwd());
}

// True if target is root itself or somewhere under it (case-insensitive on Windows).
function isInside(root, target) {
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

// Run git in cwd; returns stdout, or null if git fails or isn't installed.
function git(cwd, args, options = {}) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", timeout: 10000, ...options });
  if (result.error || result.status !== 0) return null;
  return result.stdout;
}

// Where Tidy keeps the list of files Claude edited in a session.
function editLogPath(sessionId) {
  const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), "tidy");
  const dir = path.join(dataDir, "sessions");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${sessionId.replace(/[^\w-]/g, "_")}.txt`);
}

module.exports = { runHook, findProjectRoot, isInside, git, editLogPath };
