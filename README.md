# VibeOS — Personal Assistant Dashboard

A private, highly customized dashboard serving as a comprehensive "second brain." Combines a private AI assistant, curated feeds, focused email, health tracking, and daily task management.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND CLIENTS                       │
│  ┌──────────────────┐          ┌──────────────────────────┐ │
│  │   /web            │          │   /mobile                │ │
│  │   React + Vite    │          │   React Native (Expo)    │ │
│  │   Desktop layouts │          │   Tab-based navigation   │ │
│  └────────┬─────────┘          └───────────┬──────────────┘ │
└───────────┼────────────────────────────────┼────────────────┘
            │             REST API           │
            ▼                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  /backend (FastAPI)                          │
│                  Deployed on Google Cloud Run                │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ │
│  │  Chat  │ │ Feeds  │ │ Email  │ │ Health │ │  Tasks   │ │
│  └────────┘ └────────┘ └────────┘ └────────┘ └──────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
  ┌──────────┐  ┌──────────┐  ┌──────────────┐
  │ Supabase │  │  Qwen AI │  │ External APIs│
  │ Postgres │  │ vLLM GPU │  │ Gmail, RSS,  │
  │ pgvector │  │ Cloud Run│  │ Ticketmaster │
  │ pg_cron  │  │          │  │              │
  └──────────┘  └──────────┘  └──────────────┘
```

## Project Structure

| Directory          | Stack                | Purpose                                    |
|--------------------|----------------------|--------------------------------------------|
| `/web`             | React + Vite         | Desktop web dashboard (multi-pane layouts)  |
| `/mobile`          | React Native (Expo)  | Mobile app (tab navigation, health sync)    |
| `/backend`         | Python FastAPI       | Cloud gateway: AI, email proxy, feeds, RAG  |
| `/docs`            | Markdown             | Setup guides and schema references          |
| `/.github/workflows` | GitHub Actions     | Automated 8AM health analysis cron          |

## Quick Start

### Web Client
```bash
cd web
cp .env.example .env    # fill in values
npm install
npm run dev
```

### Mobile Client
```bash
cd mobile
cp .env.example .env    # fill in values
npm install
npx expo start
```

### Backend
```bash
cd backend
cp .env.example .env    # fill in values
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Core Features

- **Private AI Chat** — Qwen 3.5 27B with 10-day RAG memory + permanent save/pin
- **Tech Feed** — AI news, tools, and model releases via RSS
- **Concert Feed** — Metal/Rock concerts in Scotland via Ticketmaster
- **Whitelisted Email** — Spam-free Gmail client with approved senders only
- **Health Hub** — Samsung Watch sync, water tracking, 8AM AI health analysis
- **Daily Planner** — Transient task manager with midnight auto-archiving via `pg_cron`

## Tech Stack

- **Web:** React, Vite, Supabase JS
- **Mobile:** React Native, Expo, react-native-health-connect
- **Backend:** Python 3.12, FastAPI, Docker, Google Cloud Run
- **Database:** Supabase (PostgreSQL, pgvector, pg_cron, RLS)
- **AI:** Qwen 3.5 27B via vLLM on GPU-enabled Cloud Run
- **Automation:** GitHub Actions (8AM health analysis cron)
