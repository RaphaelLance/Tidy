# New projects (no existing code)

When there's no existing code to mirror, establish conventions instead of copying them:

1. **Use the project's config first.** If there's a linter, formatter, or editorconfig (e.g. `.prettierrc`, `.eslintrc`, `pyproject.toml`), follow it.
2. **Otherwise, use the language's standard conventions** (e.g. PEP 8 for Python, the framework's official style guide).
3. **Stay consistent with yourself.** Once you've written the first file, treat it as the "nearby code" for Rule 1, and match it in every file after.
4. **Keep it minimal.** Build only what the task asks for, with no extra scaffolding, abstractions, or dependencies "for later". Rules 2 and 3 still apply.
5. **Offer formatting, don't assume it (JS/TS projects).** If the project has a `package.json` and no formatter yet, ask the user whether to add Prettier before writing code. Adding it is a new dependency, so only do it if they agree:
   - Run `npm install --save-dev --save-exact prettier`
   - Create a `.prettierrc` with `{}` (Prettier's defaults)
   - Create a `.prettierignore` listing build output (e.g. `dist`, `build`, `coverage`)

   Skip this step if the project already uses another formatter (e.g. Biome, dprint), or if it isn't a JS/TS project.
6. **Comment only what's complex.** Simple names, simple functions, and lists of variables don't need comments.

**Why:** A new project's first files become the style everything else copies, so make them clean and consistent.
