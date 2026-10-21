---
name: tidy
description: Use when writing new code or changing existing code in an established codebase or in a brand-new project, including new features, files, fixes, and edits. Makes the code match the surrounding style and conventions, and keeps the diff as small as possible. Do not use when the user explicitly asks for a refactor, reformat, or style change.
---
# Tidy

Before writing code, read the files you're about to change and their nearest neighbors. Your change should look like it was written by the same person who wrote the code around it.

## Rules

### 1. Mirror nearby code
Match the conventions already in the file and its siblings: naming, file and function structure, import style, comment density, error handling, and test patterns.
**Why:** Code that looks consistent is easier to review and maintain. Your own preferences don't matter here; the codebase's do.
**When conventions conflict:** follow the file you're editing, then the closest module, then the repo's linter/formatter config.

### 2. Touch only what the task needs
Change the lines the task requires and nothing else. No drive-by reformatting, renames, reordering, comment rewrites, or "while I'm here" improvements.
**Why:** Every extra changed line costs reviewer attention and hides the real change.
**If you spot something worth fixing:** mention it in your reply instead of changing it.

### 3. Reuse before adding
Before writing a helper or adding a dependency, search the codebase for one that already does the job, and use it.
**Why:** Duplicate helpers drift apart, and new dependencies add weight and risk.
**If nothing fits:** write the new code next to similar code, in the same style, and say in your reply that you added it.

### 4. Prioritize correctness, then performance, then conciseness
Make the code correct first. Then make it efficient where it matters. Only then make it shorter, and never trade correctness or clear performance for fewer lines. This applies to the code you write. Don't rewrite existing code to make it faster unless the task asks (Rule 2).
**Why:** Short code that's wrong or slow costs more than a few extra lines.

## New projects (no existing code)

When there's no existing code to mirror, establish conventions instead of copying them:

1. **Use the project's config first.** If there's a linter, formatter, or editorconfig (e.g. `.prettierrc`, `.eslintrc`, `pyproject.toml`), follow it.
2. **Otherwise, use the language's standard conventions** (e.g. PEP 8 for Python, the framework's official style guide).
3. **Stay consistent with yourself.** Once you've written the first file, treat it as the "nearby code" for Rule 1, and match it in every file after.
4. **Keep it minimal.** Build only what the task asks for, with no extra scaffolding, abstractions, or dependencies "for later". Rules 2 and 3 still apply.
5. **Set up formatting first (JS/TS projects).** Before writing any code, if the project has a `package.json` and no formatter yet, ask the user whether to add Prettier. If they agree:
   - Run `npm install --save-dev --save-exact prettier`
   - Create a `.prettierrc` with `{}` (Prettier's defaults)
   - Create a `.prettierignore` listing build output (e.g. `dist`, `build`, `coverage`)

   Skip this step if the project already uses another formatter (e.g. Biome, dprint), or if it isn't a JS/TS project.
6. **Avoid commenting excessively.** Add comments to functions that are complex in nature. For simple variable names, simple functions, and lists of variables, there's no need to add comments.
7. **Make names obvious.** Name variables and functions so their purpose is clear without reading the body.

**Why:** A new project's first files become the style everything else copies, so make them clean and consistent.

## Before finishing
- [ ] Every changed line is required by the task.
- [ ] New code is indistinguishable in style from its surroundings.
- [ ] No new helpers or dependencies were added where existing ones would do.
- [ ] The code is correct first; any optimization was needed, not speculative.
