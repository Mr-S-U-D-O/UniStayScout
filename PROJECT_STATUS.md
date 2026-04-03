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
- Production Architecture Sprint: security, real operations flow, and platform reliability.
- Remove hardcoded secrets and enforce environment-driven bootstrap/provisioning.
- Complete lead handoff lifecycle so admin can operationally route verified leads to landlords.
- Replace heuristic AI with model-backed responses while keeping map context grounding.

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
- Synthetic demo listings and demo credentials were removed; the app now boots from persisted real data only.
- PostGIS geometry column/indexes and SQL radius filtering for listings implemented.
- Role-intent dashboard split implemented: student discovery map, landlord portfolio workspace, admin operations workspace.
- Backend-driven landlord/admin KPI endpoints implemented and wired into role dashboards.
- Admin command-center UI implemented with governance visibility, privileges, user-mix metrics, and operations queues.
- Advanced map filtering, sorting, verified-only, and amenity filtering implemented.
- Live school directory discovery from OpenStreetMap added.
- Geocoded landlord property locations added.
- Live preview and build pipeline validated.
- Login and register endpoints fortified with regex format validations.
- Security audit logs table created and hooked to login endpoints for suspicious behavior monitoring.
- PostGIS proximity analytics endpoint added to admin backend.
- Admin Panel expanded to include Superuser invitation UI.
- Listing media upload flow converted from text URLs to actual multipart file uploads with multer.
- Playwright E2E test added for role flows and map behaviors.
- Admin lead handoff endpoints and delivery workflow designed and implemented.
- Model-backed AI service integration (Google Gemini) defined and integrated for live conversational mapping recommendations.

## In Progress
- Lock down first-admin bootstrap using environment variables (actually, this was already done natively, keeping it verified).

## Backlog

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
- Synthetic seed accounts/listings were removed so the app now depends on persisted data instead of dummy records.
- PostGIS SQL filtering for listing proximity was added with in-memory fallback.
- Role-specific dashboard intent separation was added to remove cross-role search behavior.
- Landlord and admin dashboards were switched to backend-provided KPI insights.
- Admin dashboard redesign now surfaces selection policy, privileges, and operational health in one console.
- Live build validation passed after consolidation work.
- Real-data provisioning command was added for importing accounts, listings, profiles, interests, and reviews from JSON.
- First superuser bootstrap was added for Mosa Moleleki, and admin invitations are now restricted to that superuser.
- Added email/phone validation and database-backed audit logging for logins.
- Setup multer file-upload endpoint for listing photos instead of relying solely on URLs.
- Admin Panel UI expanded with Superuser admin invitation capabilities.
- Added a new PostGIS analytics proximity endpoint.
- Added Playwright end-to-end test spec for mapping and role auth behaviors.
- Implemented `/api/admin/leads/:id/handoff` endpoint and admin dashboard UI to route student leads to landlords.
- Replaced mock AI fallback logic with a `@google/genai` Gemini integration for smart matching.

## Working Rules
- Update this file whenever priorities change, work is completed, or major decisions are made.
- Do not create separate planning, task board, changelog, or decision files going forward.
