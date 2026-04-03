# Changelog

## 0.1.0 - 2026-04-03
- Initialized monorepo scaffold
- Added web/api/shared package structure
- Added architecture and roadmap docs
- Added tracking artifacts and issue templates

## 0.2.0 - 2026-04-03
- Implemented map-first frontend with school selection and live radius filtering
- Implemented AI sidebar assistant flow with contextual recommendation calls
- Implemented listing detail drawer with interest action and ratings/comments
- Implemented landlord listing creation and listing status dashboard
- Implemented admin moderation queue with approve/reject actions
- Implemented admin interest lead monitoring dashboard
- Added server-sent-events endpoint and frontend subscriptions for live refresh

## 0.3.0 - 2026-04-03
- Added login and registration screen with role-based account creation
- Added session persistence on frontend and role-locked post-login workspace
- Added auth endpoints (register/login/demo accounts) on API
- Added role-based dashboard summary endpoint and summary cards UI

## 0.4.0 - 2026-04-03
- Added bcrypt-based password hashing for seeded and newly registered accounts
- Added auth endpoint rate limiting for login and registration routes
- Hardened token-based auth contract alignment in API docs

## 0.5.0 - 2026-04-03
- Added optional PostgreSQL-backed account persistence with startup bootstrap
- Added DB health endpoint (`/health/db`) for runtime database connectivity checks
- Added local PostGIS docker compose setup and account schema init SQL
