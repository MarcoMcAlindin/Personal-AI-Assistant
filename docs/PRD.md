# Product Requirements Document (PRD): "SuperCyan" Personal Assistant

## 1. Objective & Vision
To build a private, highly customized dashboard application that serves as a comprehensive "second brain." The system will deliver optimized, platform-specific user experiences by utilizing distinct codebases for mobile and web. It combines a private AI assistant, curated high-signal feeds, a focused email client, robust health tracking, and a transient daily task manager. By hosting the core routing and intelligence in the cloud, SuperCyan remains accessible, secure, and fully automated 24/7, regardless of whether personal devices are powered on.

## 2. Tech Stack & Architecture


The architecture strictly decouples the web and mobile clients for layout flexibility while unifying them through a shared cloud database and a Python-powered cloud gateway.

* **Mobile Frontend:** React Native (Expo). Delivers native performance, fluid animations, and direct access to Android device health sensors.
* **Web Frontend:** React + Vite. Provides blazing-fast build times and complete freedom to design complex, multi-pane desktop command-center layouts.
* **Cloud Gateway Backend:** Python (FastAPI) deployed on Google Cloud Run. The optimal, 24/7 available choice for securely managing external API keys, parsing feeds, proxying email, and orchestrating AI embeddings without relying on a local PC.
* **Database & Auth:** Supabase (PostgreSQL). Handles real-time syncing, Row Level Security (RLS) zero-trust authentication, and server-side automation (pg_cron).
* **Private AI:** Qwen3.5-9B-Instruct (via Google Cloud Run). Deployed in a customized vLLM container with GPU allocation for private, highly capable inference.
* **Cloud Automation:** GitHub Actions. Executes strict time-based workflows (like the 8:00 AM daily health analysis) entirely independent of the user's hardware.

## 3. Core Features & Functional Requirements

### 3.1. UI/UX & Theming
A consistent, modern aesthetic tailored perfectly to the screen it is displayed on.
* **Cool Dark Theme:** A system-wide, non-negotiable OLED-optimized theme featuring deep blacks, slate grays, and vibrant accent colors (e.g., neon blue or purple) to match the "vibe coding" aesthetic.
* **Responsive Paradigm:** The web app (Vite) will utilize expansive grid layouts to view multiple modules side-by-side. The mobile app will use a focused, tab-based navigation system optimized for one-handed use.

### 3.2. Private AI Chat & RAG Memory (Qwen3.5-9B-Instruct)
A secure conversational interface with intelligent, cost-effective memory management.
* **10-Day Rolling Context:** To prevent context limit bloat, the Python backend uses Retrieval-Augmented Generation (RAG) powered by Supabase's pgvector. When chatting, the AI automatically retrieves relevant context strictly from the last 10 days of conversation history.
* **Permanent "Save" Override:** The UI features a "Save/Pin" button on AI responses. Saved messages bypass the 10-day deletion/ignore rule and are permanently embedded into the AI's core knowledge base, ensuring it never forgets critical insights.
* **Capabilities:** General reasoning, vibe coding assistance, and cross-referencing personal data from other SuperCyan modules.

### 3.3. Curated Information Feeds
A split-feed system designed to surface high-signal content without traditional social media noise, parsed securely by the Python Cloud Run backend.
* **Tech Feed:** Aggregates RSS feeds and APIs focusing exclusively on AI news, technology, AI tools, and model releases.
* **Local Concert Feed:** Pulls from APIs (like Ticketmaster) to show upcoming Metal, Heavy Metal, Rock, and Hard Rock concerts specifically in Scotland.

### 3.4. Whitelisted Email Client
A focused inbox that completely eliminates spam.
* **Backend Proxy:** The Python backend securely connects to the Gmail API using OAuth, ensuring the client side never handles raw email tokens.
* **Whitelist Filtering:** Incoming emails are checked against a Supabase table of "Approved Addresses." Unapproved emails are ignored entirely by the application.
* **Full Editor:** Users can read, compose, reply, and forward emails natively within SuperCyan using a rich text editor.

### 3.5. Health, Sleep & Self-Care Hub
A dedicated wellness dashboard combining curated advice with automated biometric tracking.
* **Content Feeds:** Daily water tracking (liter count), health news, meditation benefits, and a library of stretching examples specifically for men.
* **On-Open Biometric Syncing:** The React Native app natively reads Samsung Watch data (heart rate, sleep stages) via react-native-health-connect. To bypass aggressive Android battery management, this sync fires immediately in the foreground whenever the user opens the mobile app, pushing the latest data to Supabase.
* **Automated 8:00 AM AI Analysis:** Every day at exactly 8:00 AM GMT, a GitHub Action triggers a Python script. It pulls the most recently synced watch data from Supabase, sends it to Qwen3.5-9B-Instruct, and stores the personalized health and sleep analysis in the database, ready for morning review.

### 3.6. Daily Planner & Task Tracker
A transient, day-by-day task manager designed to keep focus strictly on the present.
* **Daily View:** Add tasks for the current day with Name, Duration, Time, and Description.
* **Server-Side Nightly Archiving:** At exactly midnight, a native pg_cron job running directly inside the Supabase PostgreSQL database automatically flips the is_archived status of all active tasks. This guarantees a clean slate every morning without relying on the phone or PC to trigger the event.
* **Archive View:** Accessible via settings to review past productivity.

## 4. Data Model (Supabase Schema Overview)


* **users:** OAuth tokens, general settings.
* **chat_history:** id, user_id, role, message, timestamp, is_saved (Boolean), embedding (Vector).
* **email_whitelist:** id, email_address, contact_name.
* **health_metrics:** id, date, water_liters, sleep_duration, avg_heart_rate, raw_watch_data (JSON), ai_analysis (Text).
* **tasks:** id, date, title, description, duration, time, status, is_archived (Boolean).

## 5. Implementation Roadmap

* **Phase 1: Foundation & Cloud Database**
    * Initialize Supabase. Set up tables, Row Level Security (RLS), Google OAuth, the pgvector extension, and the pg_cron midnight archiving job (Mr. White).
    * Set up the three decoupled GitHub repositories: /mobile (Expo), /web (Vite), and/backend (FastAPI).
* **Phase 2: The Python Gateway & AI**
    * Deploy the vLLM Qwen3.5-9B-Instruct container to Google Cloud Run (Mr. Red).
    * Deploy the Python FastAPI backend to Cloud Run to handle the Gmail proxy, feed parsing, and RAG embedding logic (Mr. Green).
* **Phase 3: Frontends & Hardware Integration**
    * Build the multi-pane desktop UI in the/web repo and the tabbed mobile UI in the/mobile repo (Mr. Blue).
    * Implement the foreground react-native-health-connect sync trigger on mobile.
* **Phase 4: Automation & Polish**
    * Configure the GitHub Action to run the 8:00 AM AI health analysis.
    * Finalize the dark theme styling and cross-platform syncing tests.