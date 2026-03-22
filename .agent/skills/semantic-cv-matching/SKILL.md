---
name: semantic-cv-matching
description: Implementing CV-to-Job similarity scoring using pgvector and existing RAG patterns.
---
# Semantic CV Matching

The Jobs feature requires scoring CVs against Job Descriptions.

## Implementation Steps
1. **Vector Storage:** Add a `VECTOR(1536)` column to the `cv_files` and `inbox_items` tables (aligning with our existing `chat_history` embeddings).
2. **Embedding Generation:** Use the exact same embedding approach found in `services/rag_service.py` to convert the CV text and the Job Description into vectors.
3. **Similarity Query:** Write a Supabase RPC (Postgres Function) that uses the `<#>` (inner product) or `<=>` (cosine distance) operator to calculate the `match_score` dynamically within the database layer.
4. **Hybrid Scoring:** In Python (`services/matcher.py`), combine the `pgvector` similarity score with keyword exact-matching (must-haves) to produce the final 0.0 - 1.0 confidence score.
