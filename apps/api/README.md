# SYNTAX IDE API

Initial API scaffold for the SYNTAX IDE project.

## Endpoints
- `GET /health` — service health check.
- `GET /api/v1/status` — reports which integrations are not yet configured.

## Local development
```bash
npm install
npm run dev
```

## Important
This is a scaffold, not a finished authentication or workspace API. It deliberately does not expose project files, run shell commands, connect to databases, or call AI yet. Before adding those features, implement Supabase JWT verification, project ownership checks, rate limits, audit logging, and isolated workspace execution. Configure credentials in hosting secrets, never in Git.
