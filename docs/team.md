# [cite_start]VibeOS: Developer Role & Boundary Definition (Cloud-Native Architecture) [cite: 104]

## [cite_start]Overview [cite: 105]
[cite_start]This document outlines the strictly separated development domains for the VibeOS project[cite: 106]. [cite_start]With the move to a fully cloud-hosted backend and decoupled frontends, each agent's "territory" has been updated[cite: 107]. [cite_start]Strict boundaries virtually eliminate merge conflicts and keep development velocity high[cite: 108]. [cite_start]Code reviews and API contracts remain the primary communication method across these boundaries[cite: 109].

## [cite_start]Mr. Blue: Frontend & Mobile Architect [cite: 110]
[cite_start]**Domain:** The Decoupled Client Layer [cite: 110]
[cite_start]**Codebase Territory:** `/web` directory (React + Vite) and `/mobile` directory (React Native via Expo)[cite: 111].

[cite_start]**Core Responsibilities:** [cite: 112]
* [cite_start]**Web UI Implementation:** Building the expansive, multi-pane desktop command center in the `/web` directory using React and Vite[cite: 113].
* [cite_start]**Mobile UI Implementation:** Building the focused, tab-based mobile application in the `/mobile` directory[cite: 114].
* [cite_start]**Theming Consistency:** Maintaining the strict, OLED-optimized cool dark theme (slate grays, deep blacks, vibrant accents) across both distinct codebases[cite: 115].
* [cite_start]**Hardware & Sync Logic:** Writing the frontend logic to read data natively via `react-native-health-connect` on Android[cite: 116]. [cite_start]Implementing the "On-Open Sync" pattern to push health data to Supabase the moment the mobile app comes into the foreground[cite: 117].
* [cite_start]**Strict Boundary:** Mr. Blue strictly consumes APIs[cite: 118]. [cite_start]He does not write server routing, cloud deployment scripts, or database cron jobs[cite: 118]. [cite_start]He no longer handles the midnight task-clearing logic, as that is now a database-level event[cite: 119].

## [cite_start]Mr. Green: Cloud Backend & API Engineer [cite: 120]
[cite_start]**Domain:** The 24/7 Python Cloud Gateway [cite: 120]
[cite_start]**Codebase Territory:** `/backend` directory (all FastAPI routing, Python parsers, and Cloud Run deployment configs for the API)[cite: 121].

[cite_start]**Core Responsibilities:** [cite: 122]
* [cite_start]**FastAPI Routing:** Building the REST endpoints that both the Vite web app and Expo mobile app will consume[cite: 123].
* [cite_start]**Data Aggregation:** Writing the Python scripts to parse external APIs for the tech feeds and Scottish heavy metal concerts[cite: 124].
* [cite_start]**Email Proxy Logic:** Handling the secure Gmail OAuth connection and filtering incoming messages against the Supabase whitelist before sending them to the frontends[cite: 125].
* [cite_start]**RAG Orchestration:** Building the logic that searches Supabase pgvector embeddings, enforcing the 10-day rolling context window, and ensuring messages marked as "saved" are permanently injected into the Qwen 3.5 context[cite: 126].
* [cite_start]**Strict Boundary:** Mr. Green writes the Python logic that acts as the 24/7 bridge[cite: 127]. [cite_start]He does not touch UI code, database table creation, or the raw AI model deployment[cite: 128].

## [cite_start]Mr. Red: Cloud Intelligence & Automation Ops [cite: 129]
[cite_start]**Domain:** AI Infrastructure and CI/CD [cite: 129]
[cite_start]**Codebase Territory:** `/.github/workflows`, `/vllm_deployment`, and prompt configuration files[cite: 130].

[cite_start]**Core Responsibilities:** [cite: 131]
* [cite_start]**LLM Deployment:** Configuring the vLLM Docker container and deployment scripts for hosting the private Qwen 3.5 27B model on Google Cloud Run with GPU allocation[cite: 132].
* [cite_start]**Time-Based Automation:** Writing the GitHub Actions.yml workflow that triggers exactly at 8:00 AM GMT every day[cite: 133].
* [cite_start]**Cloud Scripts:** Developing the lightweight Python script used by the 8:00 AM GitHub Action to pull the latest health data from Supabase, ping the Qwen model, and save the generated analysis back to the database[cite: 134].
* [cite_start]**Prompt Engineering:** Tuning the system prompts for Qwen 3.5 to ensure the health analysis and chat responses match the required VibeOS persona[cite: 135].
* [cite_start]**Strict Boundary:** Mr. Red handles the AI execution and automated chronometers[cite: 136]. [cite_start]He does not touch the FastAPI gateway routes or the React Native mobile code[cite: 137].

## [cite_start]Mr. White: Data Layer & Auth Architect [cite: 138]
[cite_start]**Domain:** Database Schema, Automation, and Security [cite: 139]
[cite_start]**Codebase Territory:** `/supabase` directory (migrations, seed data, SQL extensions)[cite: 140].

[cite_start]**Core Responsibilities:** [cite: 141]
* [cite_start]**Schema Design:** Writing the PostgreSQL migration files to create the `users`, `chat_history`, `email_whitelist`, `health_metrics`, and `tasks` tables[cite: 142].
* [cite_start]**Advanced PostgreSQL Setup:** Enabling and configuring the pgvector extension for AI chat embeddings, and ensuring the `is_saved` boolean column is properly indexed[cite: 143].
* [cite_start]**Server-Side Automation:** Writing the native `pg_cron` SQL script inside Supabase that triggers at exactly 12:00 AM every night to automatically flip the `is_archived` status on active tasks[cite: 144].
* [cite_start]**Security & Auth:** Enforcing Row Level Security (RLS) policies and configuring Google OAuth within the Supabase dashboard[cite: 145].
* [cite_start]**Strict Boundary:** Mr. White builds the foundation and the database-level automations[cite: 146]. [cite_start]He does not write user interfaces or handle third-party API parsing[cite: 147].