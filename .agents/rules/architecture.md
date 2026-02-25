# Architecture Principles

These principles guide how the project should be designed and extended.

## API-First Backbone

All business logic and authoritative data lives in `cryptosharia-api`. Other platforms are consumers.

## Unified Identity

Authentication and user management are centralized. All platforms share the same identity system via SSO.

## Server-to-Server Security

Consumers are primarily SvelteKit apps calling this API from their server runtime. Direct browser-to-API calls for protected data are not supported.

## BFF-Only Default

CORS headers are intentionally absent. Platforms communicate with the API via their SvelteKit server (Backend-for-Frontend pattern).

## Identity Model

A unified `users` table covers both regular users and staff/admin. Staff capabilities are granted via roles/permissions (RBAC), not a separate identity system.
