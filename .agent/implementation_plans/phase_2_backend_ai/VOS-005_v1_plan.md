# Implementation Plan: VOS-005 FastAPI Scaffold & Cloud Run Deployment (v1)

- **Date:** 2026-03-14
- **Task ID:** VOS-005

As Mr. Green, I will scaffold the Python FastAPI application in the `/backend` directory and configure it for deployment to Google Cloud Run. This will serve as the 24/7 private gateway for VibeOS.

## Proposed Changes

### Backend Scaffold

#### [NEW] main.py (file:///home/marco/Personal%20AI%20Assistant/backend/app/main.py)
- Initialize the `FastAPI` application.
- Implement the `fastapi-cors-shield` logic as per Mr. Pink's scouting.
- Include the `/api/v1` router.

#### [NEW] api/v1/endpoints.py (file:///home/marco/Personal%20AI%20Assistant/backend/app/api/v1/endpoints.py)
- Define placeholder routes for:
  - `GET /feeds/tech`
  - `GET /feeds/concerts`
  - `GET /email/inbox`
  - `POST /email/send`
  - `GET /chat`
  - `POST /health-sync`

#### [MODIFY] pyproject.toml (file:///home/marco/Personal%20AI%20Assistant/backend/pyproject.toml)
- Define dependencies: `fastapi`, `uvicorn`, `pydantic-settings`, etc.

### Deployment Configuration

#### [MODIFY] Dockerfile (file:///home/marco/Personal%20AI%20Assistant/backend/Dockerfile)
- Standard Python 3.11-slim base.
- Copy application code and install dependencies from pyproject.toml.
- Expose port 8080 (Cloud Run default).

#### [NEW] deploy.sh (file:///home/marco/Personal%20AI%20Assistant/backend/deploy.sh)
- Script to build and deploy to Google Cloud Run.
- Ensures `--min-instances=0` as requested.

## Verification Plan

### Automated Tests
- Run `curl` or use the browser to verify placeholder endpoints respond with 200 OK and expected JSON structure.
- Validate Docker build finishes successfully.

### Manual Verification
- Verify the FastAPI Swagger UI (`/docs`) loads and correctly lists all versioned endpoints.
