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
- Validate all student, landlord, and admin journeys in live development mode.
- Stabilize real-time refresh behavior under multi-action usage.
- Prepare next increment: persistent database and authentication hardening.

## Next Decisions (Auto-managed)
- Keep local in-memory mode as development default for fast iteration.
- Introduce Postgres/PostGIS in next milestone while preserving current API contracts.
- Add role-based auth middleware before public pilot exposure.
