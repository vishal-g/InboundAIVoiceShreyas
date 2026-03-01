-- Vector Similarity Search function for Knowledgebase
-- Uses cosine distance (<=>) for better semantic relevance

CREATE OR REPLACE FUNCTION match_kb_chunks (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_sub_account_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb_chunks.id,
    kb_chunks.content,
    kb_chunks.metadata,
    1 - (kb_chunks.embedding <=> query_embedding) AS similarity
  FROM kb_chunks
  WHERE kb_chunks.sub_account_id = p_sub_account_id
    AND 1 - (kb_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY kb_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
