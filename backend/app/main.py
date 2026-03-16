import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import router as api_v1_router

app = FastAPI(title="VibeOS API Gateway")

# CORS: read from CORS_ORIGINS env var, fall back to dev defaults
# No Wildcards: never use ["*"]
_default_origins = (
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:3000,http://127.0.0.1:3000,"
    "https://vibeos-backend-enffsru5pa-ew.a.run.app"
)
origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "VibeOS Gateway Online"}

app.include_router(api_v1_router, prefix="/api/v1")
