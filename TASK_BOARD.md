# Task Board

## Backlog
- Persist listings/interests/reviews in PostgreSQL + PostGIS
- Add production-grade file upload pipeline for listing media
- Harden moderation and anti-abuse controls
- Add end-to-end tests for role flows and map behaviors
- Add auth audit logs and suspicious login monitoring

## In Progress
- Foundation Sprint QA for security and data reliability
- Begin persistence migration for listings/interests/reviews

## Done
- Planning scope locked for MVP
- Defined MVP domain schema in API in-memory model
- Implemented school-centered radius listing API
- Implemented student map + AI sidebar recommendation flow
- Implemented landlord listing submit and status dashboard flow
- Implemented admin moderation queue and interest lead monitoring
- Implemented listing detail drawer with comments and ratings
- Added server-sent-events channel for live client refresh
- Implemented account login/register UI with role-based access routing
- Implemented auth API endpoints (register/login/demo accounts)
- Implemented role-based dashboard summary API and UI cards
- Built auth and RBAC middleware for protected API routes
- Added password hashing and signed token verification
- Added PostgreSQL-backed account store bootstrap with in-memory fallback
- Added local PostGIS docker foundation and DB init SQL
- Added login/register auth endpoint rate limiting and password validation baseline
