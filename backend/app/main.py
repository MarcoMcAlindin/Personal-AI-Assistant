from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import router as api_v1_router

app = FastAPI(title="VibeOS API Gateway")

# Mr Pink Scouting: Apply fastapi-cors-shield logic
# No Wildcards: never use ["*"]
# Strict Allowed Origins: Vite production and Expo tunnels
origins = [
    "http://localhost:5173", # Vite Dev
    "http://127.0.0.1:5173",
    # "https://vibeos-web.vercel.app", # Placeholder for production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "VibeOS Gateway Online"}

app.include_router(api_v1_router, prefix="/api/v1")
