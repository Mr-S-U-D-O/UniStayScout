# UniStayScout Project Status

## Purpose
This is the single source of truth for what we are building, what is done, what is next, and the decisions that shape the product.

## Vision
Build a map-first, AI-assisted accommodation platform for students centered around school location and radius-based discovery.

## MVP Goals
- Ship a usable web MVP for the Johannesburg/UJ pilot.
- Enforce listing moderation by admins.
- Capture student interest leads for admin follow-up.

## Current Focus
- Foundation Sprint: security, data integrity, and operational reliability before launch.
- Complete auth hardening and persistence migration for core data.
- Keep the map and dashboard experience stable while the foundation evolves.

## Done
- Monorepo scaffold created with web, API, shared packages, and docs.
- Map-first student discovery flow implemented.
- AI sidebar recommendation flow implemented.
- Student, landlord, and admin dashboards implemented.
- Auth screens and role-based access routing implemented.
- Auth middleware, signed tokens, bcrypt hashing, and auth throttling implemented.
- PostgreSQL-backed account store bootstrap with in-memory fallback implemented.
- Local PostGIS docker foundation and DB init SQL added.
- PostgreSQL-backed listings, interests, and reviews persistence implemented with in-memory fallback.
- PostGIS geometry column/indexes and SQL radius filtering for listings implemented.
- Role-intent dashboard split implemented: student discovery map, landlord portfolio workspace, admin operations workspace.
- Backend-driven landlord/admin KPI endpoints implemented and wired into role dashboards.
- Admin command-center UI implemented with governance visibility, privileges, user-mix metrics, and operations queues.
- Advanced map filtering, sorting, verified-only, and amenity filtering implemented.
- Live school directory discovery from OpenStreetMap added.
- Geocoded landlord property locations added.
- Live preview and build pipeline validated.

## In Progress
- Add login/register validation refinements and suspicious-login audit logs.
- Keep tightening the UI/UX foundation without changing product behavior.
- Add PostGIS proximity analytics endpoints and deeper admin SLA/risk insights.

## Backlog
- Add production-grade file upload pipeline for listing media.
- Harden moderation and anti-abuse controls.
- Add end-to-end tests for role flows and map behaviors.

## Decisions
- Product is map-first, AI-assisted sidebar interaction.
- Roles are student, landlord, and admin.
- Manual admin approval is required for each listing.
- Launch geography is Johannesburg/UJ first.
- MVP is strict zero-cost setup.
- Exclude student-landlord in-app chat from MVP.
- Use OpenStreetMap + Leaflet for zero-cost map rendering in MVP.
- Use SSE for lightweight live updates before a websocket upgrade.
- Use in-memory API data for rapid iteration, then migrate to Postgres/PostGIS.
- Use role-aware account onboarding and role-locked dashboards.
- Enforce password hashing and auth endpoint throttling as baseline security.
- Use PostgreSQL as the primary account store with automatic in-memory fallback for offline development.

## Update Log
### 2026-04-03
- Consolidated planning, task board, decisions, and changelog into this file.
- Foundation security hardening was implemented for auth.
- PostgreSQL account-store foundation was added.
- Live school discovery and listing geocoding were wired to OpenStreetMap/Nominatim.
- PostgreSQL persistence was added for listings, interests, and reviews.
- PostGIS SQL filtering for listing proximity was added with in-memory fallback.
- Role-specific dashboard intent separation was added to remove cross-role search behavior.
- Landlord and admin dashboards were switched to backend-provided KPI insights.
- Admin dashboard redesign now surfaces selection policy, privileges, and operational health in one console.
- Live build validation passed after consolidation work.

## Working Rules
- Update this file whenever priorities change, work is completed, or major decisions are made.
- Do not create separate planning, task board, changelog, or decision files going forward.
