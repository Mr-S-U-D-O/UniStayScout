# Project Plan

## Vision
Build a map-first, AI-assisted accommodation platform for students centered around school location and radius-based discovery.

## MVP Goals
- Ship usable web MVP for Johannesburg/UJ pilot
- Enforce listing moderation by admins
- Capture student interest leads for admin follow-up

## Phases
1. Foundation: auth, roles, core listing model
2. Map Experience: school center, radius search, pins, detail drawer
3. AI Assistant: contextual clarifying questions + recommendations
4. Moderation and Dashboards: landlord/admin workflows
5. Launch Readiness: QA, seed data, operational checks

## Current Focus
- Foundation Sprint: lock security, data integrity, and operational reliability before launch.
- Complete auth hardening (password hashing, rate limiting, strict protected endpoints).
- Start persistence migration plan for PostgreSQL + PostGIS.

## Foundation Progress (Latest)
- Auth account storage now supports PostgreSQL mode with startup bootstrap and fallback to in-memory mode.
- Local PostGIS-ready container setup added for development parity.
- Next persistence target: migrate listings/interests/reviews from memory to PostgreSQL.

## Auth and Dashboard Plan (Detailed)
1. Identity Model
- Roles: student, landlord, admin.
- Self-registration allowed for student and landlord only.
- Admin accounts are provisioned by existing admins.
- Session model for MVP: local storage session + API token placeholder.

2. Onboarding and Login Flows
- Registration fields: role, full name, email, phone, password.
- Login fields: email and password.
- Post-login redirect by role to role-specific dashboard workspace.
- Logout clears session and local UI state.

3. Role Dashboards
- Student dashboard cards: interests sent, approved listings, available schools.
- Landlord dashboard cards: listing count, pending review count, total views.
- Admin dashboard cards: pending listings, total listings, student leads.

4. Security Milestones
- M1 (done): role-gated frontend screens + role-based summary API.
- M2 (done): auth middleware and protected API endpoints.
- M3 (done): password hashing and token verification.
- M4 (in progress): login throttling and audit logs.

5. Data Persistence Migration
- Preserve endpoint contracts while moving from in-memory to PostgreSQL.
- Add user, session, and role tables with ownership constraints.
- Add migration scripts and seed users for test/demo accounts.

## Next Decisions (Auto-managed)
- Keep local in-memory mode as development default for fast iteration.
- Introduce Postgres/PostGIS in next milestone while preserving current API contracts.
- Add role-based auth middleware before public pilot exposure.
