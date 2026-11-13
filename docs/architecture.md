# SYNTAX IDE architecture and rollout

## Current stage

The existing Vite/React app remains the production baseline. The Monaco component is currently a reusable component, not yet wired into `src/App.jsx`. Keep this branch separate until its build passes and the editor integration has been reviewed.

## Target architecture

- Web: React + TypeScript + Vite; Monaco editor for code editing.
- API: Node.js + TypeScript service for authorization, project operations, AI provider calls, and workspace orchestration.
- Identity/data: Supabase Auth and PostgreSQL with row-level security.
- Workspace execution: isolated container/workspace provider. Never execute user code in the API process.
- AI: server-side provider calls with per-user authorization, rate limits, budget limits, and secret management.
- Git: GitHub App/OAuth integration with minimal repository scopes and short-lived tokens where possible.
- Desktop: Electron after web/API boundaries stabilize.

## Security rules

1. Never commit real credentials. Browser-exposed `VITE_*` variables are public values, not secrets.
2. Keep service-role keys, AI keys, GitHub client secrets, database passwords, and encryption keys in server-side hosting secrets only.
3. Verify workspace/project ownership on every API request.
4. Isolate workspaces; enforce CPU/memory/time limits and network restrictions.
5. Use read-only database connections by default and apply query timeouts.
6. Validate request bodies, rate-limit expensive endpoints, audit privileged actions, and avoid logging secrets.
7. Subscription tiers are entitlements, not authorization by themselves. Enforce limits server-side and verify payment webhooks.

## Deployment sequence

1. Pass CI/build for the current Vite application.
2. Integrate Monaco in the current editor and verify language selection/file state.
3. Add Supabase Auth and project persistence with RLS.
4. Add a separately deployable API service only after confirming available Railway service capacity.
5. Add isolated workspace execution.
6. Add server-mediated AI and GitHub integration.
7. Add database connectors and billing after the security model is reviewed.

## Supabase migration

The initial schema under `supabase/migrations` is a starting point. Review it and apply it to a Supabase project before enabling application features. It does not create a workspace runtime or payment integration by itself.
