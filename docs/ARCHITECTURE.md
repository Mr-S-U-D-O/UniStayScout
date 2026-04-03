# Architecture

## Overview
UniStayScout uses a monorepo architecture with separate web and API apps plus shared contracts.

## Components
- Web App: React map-first client, AI sidebar UI, role dashboards
- API App: REST and real-time endpoints, auth, moderation workflows
- Shared Package: type contracts and reusable models
- Data Layer (planned): PostgreSQL + PostGIS

## Real-time Model (planned)
- Map filter updates trigger near-instant listing refresh
- Approval changes are broadcast to active clients
- Interest events stream to admin dashboards
