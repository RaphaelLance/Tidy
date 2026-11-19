---
name: tidy
description: Keeps code changes minimal and matching the existing codebase's style. Use for any code you write or change, in an existing repo or a brand-new project, including new features, files, bug fixes, tests, and one-line edits. When the user explicitly asks for a refactor, reformat, or style change, still match the codebase's style but make the wider changes they asked for.
---
# Tidy

Before writing code, read the files you're about to change and their nearest neighbors. Your change should look like it was written by the same person who wrote the code around it.

## Rules

### 1. Mirror nearby code
Match the conventions already in the file and its siblings: naming, file and function structure, import style, quote style, indentation, line endings, comment density, error handling, and test patterns.
**Why:** Code that looks consistent is easier to review and maintain. Your own preferences don't matter here; the codebase's do.
**When conventions conflict:** follow the file you're editing, then the closest module, then the repo's linter/formatter config.

### 2. Touch only what the task needs
Change the lines the task requires and nothing else. No drive-by reformatting, renames, reordering (including imports), comment rewrites, lockfile changes, or "while I'm here" improvements. Every changed line should trace directly to the user's request.
**Clean up after yourself:** remove imports, variables, and functions that your own change made unused. Leave dead code that was already there.
**Why:** Every extra changed line costs reviewer attention and hides the real change.
**If you spot something worth fixing:** mention it in your reply instead of changing it.
**If the user asked for a refactor or reformat:** make the wider changes they asked for, and still follow Rule 1.

### 3. Reuse before adding
Before writing a helper or adding a dependency, search the codebase for one that already does the job, and use it.
**Why:** Duplicate helpers drift apart, and new dependencies add weight and risk.
**If nothing fits:** write the new code next to similar code, in the same style, and say in your reply that you added it.

### 4. Correctness first
Never trade correctness, or performance that clearly matters, for fewer lines. Don't rewrite existing code to make it faster unless the task asks (Rule 2).

## Example

Task: "Make `getUser` return null when the id is missing."

Too much (requoted strings, renamed a variable, reformatted a line the task didn't need):
```diff
-const db = require('./db')
+const db = require("./db");

 function getUser(id) {
-  const row = db.find('users', id)
-  return row
+  if (!id) return null;
+  const user = db.find("users", id);
+  return user;
 }
```

Minimal (only the line the task needs, in the file's own style):
```diff
 function getUser(id) {
+  if (!id) return null
   const row = db.find('users', id)
   return row
 }
```

## New projects (no existing code)

When there's no existing code to mirror, read [references/new-projects.md](references/new-projects.md) before writing the first file.

## Before finishing
Run `git diff` (if the project uses git) and check each changed line:
- [ ] Every changed line is required by the task. Revert any that aren't, then check again.
- [ ] New code is indistinguishable in style from its surroundings, including quotes, semicolons, and line endings.
- [ ] No new helpers or dependencies were added where existing ones would do.
- [ ] Nothing your change made unused is left behind.
