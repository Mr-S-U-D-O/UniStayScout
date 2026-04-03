# Decisions Log

## 2026-04-03
- Product is map-first, AI-assisted sidebar interaction
- Include roles: student, landlord, admin
- Require manual admin approval for each listing
- Launch geography: Johannesburg/UJ first
- MVP is strict zero-cost setup
- Exclude student-landlord in-app chat from MVP
- Use OpenStreetMap + Leaflet for zero-cost map rendering in MVP
- Use SSE for lightweight live updates before full websocket upgrade
- Use in-memory API data for rapid iteration, then migrate to Postgres/PostGIS
