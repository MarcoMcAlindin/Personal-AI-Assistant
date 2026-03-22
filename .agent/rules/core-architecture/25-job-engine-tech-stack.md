# Rule 25: Job Engine Technology Alignment

**Context:** The AI-Driven Job Campaign Engine must be integrated strictly within the existing SuperCyan (formerly VibeOS) monorepo constraints.

**Enforcements:**
1. **NO EXTERNAL LLMs:** Ignore the spec's suggestion for external API providers (Anthropic, Replicate). You MUST use our internal `unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF` deployed via vLLM on Cloud Run for all cover letter generation and job data parsing.
2. **NO CELERY OR REDIS:** The spec suggests Celery and Redis for background workers. Do NOT introduce these infrastructure components. Instead, design background tasks using **Google Cloud Scheduler/Tasks** triggering a FastAPI endpoint, or use **pg_cron** directly in Supabase to trigger edge functions/webhooks.
3. **FRONTEND UI:** We have already imported the `JobsView.tsx` and related components from the SuperCyan Figma design system. Do NOT build new pages from scratch; extend the existing SuperCyan components.
4. **EMBEDDINGS:** For Semantic CV matching, utilize the exact same `pgvector` workflow established in `services/rag_service.py`. Keep embedding models aligned with existing project choices (1536 dimensions).
