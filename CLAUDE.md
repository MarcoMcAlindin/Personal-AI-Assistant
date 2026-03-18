# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VibeOS** — a personal AI assistant monorepo with three decoupled services:
- `/web` — React + Vite desktop app (port 3000)
- `/mobile` — React Native + Expo iOS/Android app
- `/backend` — Python FastAPI cloud gateway (Cloud Run, port 8080)
- `/vllm_deployment` — unsloth/Qwen3.5-35B-A3B-GGUF inference on GPU Cloud Run (scale-to-zero)
- `/supabase` — PostgreSQL migrations (pgvector + pg_cron)

## Development Commands

### Web
```bash
cd web && npm install
npm run dev      # Vite dev server on localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

### Mobile
```bash
cd mobile && npm install
npm start        # Expo tunnel (scan QR for device)
npm run android  # Android emulator
npm run ios      # iOS simulator
npm run lint     # ESLint
```

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload   # Dev server on port 8000
```

### Deploy
```bash
bash backend/deploy.sh          # gcloud builds submit + run deploy
bash vllm_deployment/deploy.sh  # GPU Cloud Run deployment
```

## Architecture

### Data Flow
```
Web / Mobile → REST API → FastAPI (Cloud Run) → Supabase (PostgreSQL)
                                              ↘ vLLM unsloth/Qwen3.5-35B-A3B-GGUF (Cloud Run GPU)
```

### Backend Services (`/backend/app/`)
- `api/v1/endpoints.py` — all route handlers
- `services/ai_service.py` — routes to vLLM via OpenAI-compatible API
- `services/rag_service.py` — pgvector embeddings + 10-day rolling chat window
- `services/email_service.py` — Gmail OAuth proxy
- `services/feed_service.py` — RSS + Ticketmaster API aggregation
- `services/health_service.py` — Samsung Watch health metric analysis
- `models/schemas.py` — Pydantic request/response models
- `utils/config.py` — env/config loading

### API Routes
| Method | Path | Description |
|--------|------|-------------|
| GET | `/feeds/tech` | Tech news RSS |
| GET | `/feeds/concerts` | Scottish metal concerts (Ticketmaster) |
| GET | `/email/inbox` | Whitelisted emails via Gmail OAuth |
| POST | `/email/send` | Send email proxy |
| POST | `/chat` | AI chat with SSE streaming |
| PATCH | `/chat/save/:id` | Pin AI response to permanent RAG memory |
| GET/POST | `/tasks` | Daily task management |
| PATCH | `/tasks/:id` | Update/archive task |
| GET | `/health` | Health metrics |

### Database (Supabase PostgreSQL)
5 tables: `users`, `chat_history`, `email_whitelist`, `health_metrics`, `tasks`
- All tables use RLS with `auth.uid() = user_id` zero-trust policies
- `chat_history.is_saved = true` — bypasses 10-day auto-cleanup, permanent RAG knowledge
- `pgvector` IVFFlat index for semantic search (1536-dim embeddings)
- `pg_cron` auto-archives tasks at midnight

### Frontend Structure
- Web (`/web/src`): components by feature (feeds, email, planner, chat, health, common), services (API clients), ThemeContext for OLED dark theme
- Mobile (`/mobile/src`): 6 tab screens (Chat, Feeds, Email, Health, Planner, Settings), shared components, `theme.ts` for Figma-aligned OLED palette
- Theme: OLED-optimized dark (deep blacks, slate grays), CSS variables in `web/src/styles/theme.css`

### Automation
- **GitHub Actions `health_analysis.yml`**: daily cron at 8:00 AM GMT — pulls Samsung Watch data → Qwen analysis → stores in Supabase
- **pg_cron**: midnight task auto-archiving

## Git Workflow
- `main` — production
- `staging` — integration hub (all features merge here first)
- Feature branches: `feature/<agent-color>/<issue-number>-<description>`
- PRs go `feature/* → staging`, then `staging → main`

## Key Configuration
- `.env.example` — all required environment variables
- Supabase migrations in `/supabase/migrations/`
- Backend Dockerfile targets port 8080; local dev runs on 8000
- vLLM cloud endpoint uses OpenAI-compatible API (model: `Qwen/unsloth/Qwen3.5-35B-A3B-GGUF`)
- Three inference tiers: Cloud (`unsloth/Qwen3.5-35B-A3B-GGUF`), Home PC (`DavidAU/Qwen3.5-9B-Claude-4.6-HighIQ-INSTRUCT`), On-Device (`DavidAU/Qwen3.5-2B-GPT-5.1-HighIQ-INSTRUCT`)
- Cloud Run region: `europe-west1`
