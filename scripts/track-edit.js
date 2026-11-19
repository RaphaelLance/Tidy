#!/usr/bin/env node
// Tidy PostToolUse hook: remember which files Claude wrote or edited this session,
// so the Stop hook (diff-size.js) measures only Claude's changes.

const fs = require("fs");
const { runHook, editLogPath } = require("./common");

runHook((hookInput) => {
  const filePath = hookInput.tool_input && hookInput.tool_input.file_path;
  if (!filePath || !hookInput.session_id) return;

  const logPath = editLogPath(hookInput.session_id);
  const logged = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8").split("\n") : [];
  if (!logged.includes(filePath)) fs.appendFileSync(logPath, filePath + "\n");
});
