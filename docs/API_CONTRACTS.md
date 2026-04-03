# API Contracts (Initial)

## Health
- GET /health -> { status: "ok" }
- GET /health/db -> postgres connectivity status

## Real-Time Events
- GET /api/events
- Server-sent-events stream for listing, moderation, interest, and review updates

## Authentication
- GET /api/auth/demo-accounts
- POST /api/auth/register
- POST /api/auth/login
- Authenticated routes require `Authorization: Bearer <token>`

## Dashboard Summary
- GET /api/dashboard-summary

## Schools
- GET /api/schools

## Listings
- GET /api/listings?schoolId=&radiusKm=&minPrice=&maxPrice=&roomType=&verifiedOnly=&sortBy=&amenities=
- POST /api/listings

## Landlord
- GET /api/landlords/:landlordId/listings

## Admin Moderation
- GET /api/admin/pending-listings
- POST /api/admin/listings/:id/review with body { decision, comment }

## Student Interest Leads
- POST /api/interests
- GET /api/admin/interests

## Reviews
- GET /api/listings/:id/reviews
- POST /api/listings/:id/reviews

## AI Assistant
- POST /api/ai/recommendations
- Request: { profile, mapContext, conversation }
- Response: { questions, recommendedListingIds, rationale }
