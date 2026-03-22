-- Create an RPC to find matching jobs based on vector similarity using pgvector
CREATE OR REPLACE FUNCTION match_cv_to_jobs(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  job_id UUID,
  job_title VARCHAR,
  company_name VARCHAR,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    inbox_items.id AS job_id,
    inbox_items.job_title,
    inbox_items.company_name,
    1 - (inbox_items.embedding <=> query_embedding) AS similarity
  FROM
    public.inbox_items
  WHERE
    1 - (inbox_items.embedding <=> query_embedding) > match_threshold
  ORDER BY
    inbox_items.embedding <=> query_embedding ASC
  LIMIT
    match_count;
END;
$$;
