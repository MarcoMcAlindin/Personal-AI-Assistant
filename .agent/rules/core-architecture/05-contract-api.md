---
trigger: glob
globs: backend/routes/**, web/src/api/**, mobile/src/api/**
---

# Strict Contract-Driven Development

Frontend and Backend domains must never guess what data the other is sending or receiving. 
- **Mr. Green (Backend):** Before finalizing any FastAPI route (e.g., the Scottish concert feed or the health analysis endpoint), you must define a strict Pydantic model for the request and response.
- **Mr. Blue (Frontend):** You must strictly type all API fetch calls in TypeScript using interfaces that exactly match Mr. Green's Pydantic models.
- **No `any` Types:** Using `any` in TypeScript for API responses is strictly forbidden. If the data structure is unknown, halt and initiate a handoff to Mr. Green to define the schema.