# CryptoSharia API

This project uses OpenCode for AI-assisted development.

## AI Rules

Project-specific canonical modules are in `.agents/rules/`.

These modules define repo-wide policy, quality gates, architecture invariants, and shared context.

Start with `.agents/rules/entrypoint.md`.

## AI Skills

Project-specific skills are in `.agents/skills/`.

Skills are execution playbooks; they may reference canonical modules in `.agents/rules/` to avoid policy drift.

## Governance Updates

Session feedback should change behavior immediately.

For recurring friction or when a governance change would be reasonable and durable, the agent may propose updates to `.agents/rules/` or `.agents/skills/`.

Persistent governance edits require explicit user confirmation (for example: `codify`).

## Verification

Run `opencode` from the project root to start a session with these rules.
