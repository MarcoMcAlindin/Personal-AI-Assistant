import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.api.v1.endpoints import router as api_v1_router

app = FastAPI(title="SuperCyan API Gateway")

# CORS: read from CORS_ORIGINS env var, fall back to dev defaults
# No Wildcards: never use ["*"]
_default_origins = (
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:3000,http://127.0.0.1:3000,"
    "https://supercyan-backend-enffsru5pa-ew.a.run.app"
)
origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

@app.get("/")
async def root():
    return {"status": "SuperCyan Gateway Online"}

app.include_router(api_v1_router, prefix="/api/v1")
