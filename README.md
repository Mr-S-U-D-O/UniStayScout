# UniStayScout

Map-first student accommodation platform with AI-assisted discovery, role-based workflows, and admin moderation.

## Monorepo Layout

- `apps/web`: React + Vite frontend
- `apps/api`: Node + Express backend
- `packages/shared`: Shared types and contracts
- `docs`: Architecture and planning docs

## Quick Start

1. Install dependencies:
   - `npm install`
2. Run frontend:
   - `npm run dev:web`
3. Run backend:
   - `npm run dev:api`
4. Provision real data into Postgres:
   - `npm run provision:api -- --file path/to/provision.json`

## Current Scope (MVP)

- Real-time map-first listing discovery
- AI sidebar assistant for contextual recommendations
- Roles: student, landlord, admin
- Manual admin approval before listing publication
- Lead capture for student interest

## Notes

This scaffold is local-first and zero-cost focused for MVP development.

The API includes a provisioning command for importing real accounts, listings, profiles,
interests, and reviews from an explicit JSON file. It does not ship with seeded dummy data.

## Project Status

All planning, task tracking, decision history, and update logs now live in [PROJECT_STATUS.md](PROJECT_STATUS.md).
