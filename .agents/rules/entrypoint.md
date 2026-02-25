# CryptoSharia API Project AI Rules (Entrypoint)

These rules apply when working in the `cryptosharia-api` repository.

## Precedence

- Project rules in this repository override any global/personal rules when they conflict.
- If modular rule files conflict with this entrypoint, this entrypoint wins.

## Non-Negotiable Rules

- Never execute a plan or implement changes without explicit user approval (for example: "yes", "go", "proceed", "approved").
- Do not relax security/safety constraints without explicit user instruction.

## Collaboration Protocol

- Handshake protocol: research/plan -> propose -> wait for approval -> execute.
- No hero assumptions: do not run extra commands or do follow-up work unless explicitly approved.
- Security-first: for changes involving auth, secrets, caching, or data exposure, explicitly state the security impact.

## Rule Modules

See `.agents/rules/` for the modular rule files.
