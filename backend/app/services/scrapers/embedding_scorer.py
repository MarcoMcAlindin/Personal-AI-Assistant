"""
EmbeddingScorer — post-scrape semantic scoring.

After scrapers insert jobs with keyword-based scores, this service:
  1. Fetches the user's primary CV embedding from cv_files
  2. Embeds each new job description concurrently (OpenAI text-embedding-3-small)
  3. Computes cosine similarity
  4. Updates inbox_items.match_score, match_reasoning, embedding

Falls back silently to keyword scores if no CV is uploaded or any error occurs.
"""
import asyncio
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class EmbeddingScorer:

    def _cosine_similarity(self, a: list[float], b: list[float]) -> float:
        """
        Cosine similarity in [0, 1]. Returns 0.0 for zero vectors.
        Clamps result to [0.0, 1.0] to guard against float precision drift.
        """
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(x * x for x in b) ** 0.5
        if not norm_a or not norm_b:
            return 0.0
        raw = dot / (norm_a * norm_b)
        return min(1.0, max(0.0, raw))

    async def score_new_jobs(
        self,
        supabase,
        user_id: str,
        job_ids: list[str],
    ) -> None:
        """
        Fetch CV embedding, embed job descriptions, update match scores.
        Silently returns on any missing data or error.
        """
        if not job_ids:
            return

        # Fetch primary CV embedding
        try:
            res = (
                supabase.table("cv_files")
                .select("embedding")
                .eq("user_id", user_id)
                .eq("is_primary", True)
                .limit(1)
                .execute()
            )
        except Exception as e:
            logger.warning(f"[EmbeddingScorer] CV fetch failed: {e}")
            return

        rows = res.data or []
        if not rows or not rows[0].get("embedding"):
            logger.info("[EmbeddingScorer] No primary CV embedding — skipping semantic scoring")
            return

        cv_embedding: list[float] = rows[0]["embedding"]
        await self._embed_and_update(supabase, cv_embedding, job_ids)

    async def _embed_and_update(
        self,
        supabase,
        cv_embedding: list[float],
        job_ids: list[str],
    ) -> None:
        from app.services.cv_service import embed_text  # avoid circular import at module level

        # Fetch all job descriptions in one query
        try:
            res = (
                supabase.table("inbox_items")
                .select("id, job_description")
                .in_("id", job_ids)
                .execute()
            )
        except Exception as e:
            logger.warning(f"[EmbeddingScorer] Failed to fetch job descriptions: {e}")
            return

        jobs: list[dict] = res.data or []
        if not jobs:
            return

        # Concurrently embed all job descriptions (semaphore cap = 20)
        sem = asyncio.Semaphore(20)

        async def embed_one(job_id: str, description: str):
            async with sem:
                return job_id, await embed_text(description)

        raw_results = await asyncio.gather(
            *[embed_one(j["id"], j.get("job_description", "")) for j in jobs],
            return_exceptions=True,
        )

        # Update each job row with semantic score
        for item in raw_results:
            if isinstance(item, Exception):
                logger.warning(f"[EmbeddingScorer] Embed failed for a job: {item}")
                continue

            job_id, job_embedding = item
            if job_embedding is None:
                continue

            score = self._cosine_similarity(cv_embedding, job_embedding)
            reasoning = f"Semantic similarity: {score:.2f} — CV embedding match via text-embedding-3-small"

            try:
                supabase.table("inbox_items").update({
                    "match_score": round(score, 2),
                    "match_reasoning": reasoning,
                    "embedding": job_embedding,
                }).eq("id", job_id).execute()
            except Exception as e:
                logger.warning(f"[EmbeddingScorer] Failed to update job {job_id}: {e}")
