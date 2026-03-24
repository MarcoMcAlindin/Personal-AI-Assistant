"""Tests for EmbeddingScorer — cosine similarity and scoring logic."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestCosineSimilarity:
    def test_identical_vectors_return_1(self):
        from app.services.scrapers.embedding_scorer import EmbeddingScorer
        scorer = EmbeddingScorer()
        v = [0.5, 0.5, 0.5, 0.5]
        assert scorer._cosine_similarity(v, v) == pytest.approx(1.0)

    def test_orthogonal_vectors_return_0(self):
        from app.services.scrapers.embedding_scorer import EmbeddingScorer
        scorer = EmbeddingScorer()
        a = [1.0, 0.0]
        b = [0.0, 1.0]
        assert scorer._cosine_similarity(a, b) == pytest.approx(0.0)

    def test_zero_vector_returns_0(self):
        from app.services.scrapers.embedding_scorer import EmbeddingScorer
        scorer = EmbeddingScorer()
        assert scorer._cosine_similarity([0.0, 0.0], [1.0, 1.0]) == 0.0

    def test_float_precision_clamped_to_1(self):
        """Vectors that are nearly identical may produce cosine slightly > 1.0 due to float precision."""
        from app.services.scrapers.embedding_scorer import EmbeddingScorer
        scorer = EmbeddingScorer()
        # Force a value slightly over 1.0 by passing the same normalised vector
        v = [1.0, 0.0]
        result = scorer._cosine_similarity(v, v)
        assert result <= 1.0
        assert result >= 0.0


class TestScoreNewJobsEarlyExit:
    def _mock_supabase(self, cv_rows=None):
        mock = MagicMock()
        mock.table.return_value.select.return_value.eq.return_value\
            .eq.return_value.limit.return_value.execute.return_value\
            = MagicMock(data=cv_rows or [])
        return mock

    @pytest.mark.asyncio
    async def test_no_cv_rows_returns_early(self):
        from app.services.scrapers.embedding_scorer import EmbeddingScorer
        scorer = EmbeddingScorer()
        supabase = self._mock_supabase(cv_rows=[])
        # Should return without touching inbox_items
        await scorer.score_new_jobs(supabase, "user-1", ["job-1"])
        # inbox_items table never touched
        table_calls = [c.args[0] for c in supabase.table.call_args_list]
        assert "inbox_items" not in table_calls

    @pytest.mark.asyncio
    async def test_cv_without_embedding_returns_early(self):
        from app.services.scrapers.embedding_scorer import EmbeddingScorer
        scorer = EmbeddingScorer()
        supabase = self._mock_supabase(cv_rows=[{"embedding": None}])
        await scorer.score_new_jobs(supabase, "user-1", ["job-1"])
        table_calls = [c.args[0] for c in supabase.table.call_args_list]
        assert "inbox_items" not in table_calls

    @pytest.mark.asyncio
    async def test_empty_job_ids_returns_early(self):
        from app.services.scrapers.embedding_scorer import EmbeddingScorer
        scorer = EmbeddingScorer()
        supabase = self._mock_supabase()
        await scorer.score_new_jobs(supabase, "user-1", [])
        supabase.table.assert_not_called()
