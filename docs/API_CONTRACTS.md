# API Contracts (Initial)

## Health
- GET /health -> { status: "ok" }

## Placeholder Listing Search
- GET /api/listings?schoolId=&radiusKm=&lat=&lng=
- Response: list of approved listing cards for map pins

## Placeholder AI Endpoint
- POST /api/ai/recommendations
- Request: { profile, mapContext, conversation }
- Response: { questions, recommendedListingIds, rationale }
