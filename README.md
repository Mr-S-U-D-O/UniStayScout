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

For secure first-admin bootstrap (only when no admin exists), configure these API env vars:
- `BOOTSTRAP_ADMIN_ENABLED=true`
- `BOOTSTRAP_ADMIN_NAME=<full name>`
- `BOOTSTRAP_ADMIN_EMAIL=<admin email>`
- `BOOTSTRAP_ADMIN_PHONE=<phone number>`
- `BOOTSTRAP_ADMIN_PASSWORD=<strong password>`
- Optional: `BOOTSTRAP_ADMIN_ID=<custom id>`

If these are missing and no admin exists, the API will log a warning and skip bootstrap.

## Production Admin Setup

For a direct create/promote flow against Postgres, run:

- `npm run setup:admin -- --email="you@domain.com" --name="Your Name" --phone="+27..." --password="StrongPass!123" --superuser`

Notes:
- If the email exists, the account is promoted to admin and updated.
- If the email does not exist, a new admin is created.
- Admin passwords must be at least 12 chars and include uppercase, lowercase, number, and special character.
- In production, `AUTH_TOKEN_SECRET` must be explicitly set to a strong value (minimum 32 characters).

## Project Status

All planning, task tracking, decision history, and update logs now live in [PROJECT_STATUS.md](PROJECT_STATUS.md).
