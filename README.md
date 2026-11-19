# Tidy

A Claude Code plugin that makes Claude follow your codebase's existing style and keep its diffs small.

## What it does

- **Skill** (`skills/tidy/SKILL.md`): tells Claude to mirror nearby code, touch only what the task needs, reuse before adding, and check its own `git diff` before finishing.
- **Formatter hook** (`scripts/format.js`): after Claude writes or edits a file, runs your project's own Prettier on it. It only runs when Prettier is installed in the project, a Prettier config exists inside the project, and the file was already Prettier-formatted at `HEAD`. Otherwise it leaves the file alone, so formatting never adds unrelated diff noise. CRLF files stay CRLF.
- **Diff-size check** (`scripts/diff-size.js`): when Claude finishes a turn, shows a one-line summary of the files it edited, and warns about whitespace-only changes and changed lockfiles. It only warns; it never makes Claude continue.

## Install

```
claude plugin marketplace add RaphaelLance/Tidy
claude plugin install tidy@tidy
```

To try it from a local clone instead: `claude --plugin-dir ./Tidy`.

## Turning the hooks off

Disable the plugin with `/plugin`, or remove the entries you don't want from `hooks/hooks.json` in your copy.

## Requirements

Node.js (any version Claude Code supports) and git. The hooks run `node` directly, so they work on Windows without Git Bash.
