---
name: code-comments
description: Applies concise TypeScript comment conventions for public contracts, architectural decisions, security boundaries, and non-obvious behavior.
---

# Code Comments

## 1. TSDoc for Public Contracts

- Use TSDoc format (`/** ... */`) for exported services, public service methods,
  guards, decorators, repository methods with non-obvious behavior, and reusable
  application contracts.
- Do not add TSDoc to every exported schema, enum, constant, simple type alias,
  getter, or one-line method. Add it only when the contract is not obvious.
- Document business constraints, idempotency, side effects, security behavior,
  transaction boundaries, and compatibility requirements.
- Do not rewrite explicit type definitions in the TSDoc text.
- Use `@param`, `@returns`, `@throws`, and `@remarks` only when they add useful
  information. Never add empty or boilerplate tags.

## 2. NestJS Project Boundaries

- Controllers own HTTP decorators, validation, guards, status codes, and response
  presentation. Comment only non-obvious HTTP or compatibility decisions.
- Services own business workflows and are public application contracts that other
  modules may consume. Document cross-module assumptions when they matter.
- Repositories own persistence queries for their module's data. Document unusual
  query semantics, atomic updates, concurrency protections, or ownership rules.
- Each module owns its domain data and exposes services as application contracts.
  Comments must not hide a boundary violation; fix the architecture instead.
- OpenAPI schemas and route configuration are part of the external contract. Explain
  only non-obvious serialization, status-code, or security decisions.

## 3. Security and Compatibility Comments

- Explain why code hashes or redacts credentials, tokens, client data, or other
  sensitive values when the reason is not obvious.
- Never put real secrets, raw tokens, passwords, API keys, or private URLs in
  comments, examples, fixtures, or logs.
- Document compatibility behavior only when it is intentionally retained or
  intentionally changed.
- For authentication, authorization, sensitive data, external providers, and
  other security-sensitive workflows, prefer comments that state the invariant
  and failure behavior rather than restating the code.

## 4. Technical Debt Tag Hierarchy

Always format inline technical debt using exactly these uppercase tags:

- `// TODO:` Features/refactors to track later.
- `// FIXME:` Definite bugs or broken behavior needing immediate repair.
- `// HACK:` Brittle workarounds. Include an explanation and a tracking reference
  when the project has one.

## 5. Intent-Driven Line Comments (Obscure/Complex Logic)

When code cannot be made immediately obvious through clean naming, you MUST use an intent-driven comment directly above the line or block of code.

- **Explain the "Why":** Focus on the business context, hidden assumptions, or downstream risks. Do not explain syntax.
- **Third-Party Quirks:** Explicitly name the external API, browser engine, or legacy system causing the weird behavior.
- **Performance Optimizations:** Justify complex regex, bitwise operations, or intensive algorithms so they are not accidentally refactored away.
- **Edge Cases:** Document race conditions, strict legal/compliance math, or security protections.

## 6. Code As Truth & Refactoring Rules

- Do not write comments explaining "WHAT" a clear line of code does (e.g., no `// loop through users`).
- **Refactor First:** Before writing a line comment, attempt to extract the logic into a self-documenting variable or helper function (e.g., replace a cryptic multi-condition `if` statement with a well-named `const isLegacyPremiumUser`).
- Keep comments short and plain-spoken.
- Do not use comments as a substitute for a domain error, schema description,
  OpenAPI description, or architectural boundary that belongs in code.
