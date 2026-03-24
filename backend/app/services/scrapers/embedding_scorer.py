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
        # Placeholder — implemented in Task 3
        pass
