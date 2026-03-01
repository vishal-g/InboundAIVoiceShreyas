-- 17_knowledgebase_schema.sql
-- Multi-tenant Knowledgebase and RAG system setup

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Knowledgebase Settings
CREATE TABLE IF NOT EXISTS kb_settings (
    sub_account_id UUID PRIMARY KEY REFERENCES sub_accounts(id) ON DELETE CASCADE,
    embedding_model TEXT DEFAULT 'text-embedding-3-small',
    chunk_size INTEGER DEFAULT 1000,
    chunk_overlap INTEGER DEFAULT 200,
    top_k INTEGER DEFAULT 5,
    use_mock BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Knowledgebase Documents (PDFs)
CREATE TABLE IF NOT EXISTS kb_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_account_id UUID REFERENCES sub_accounts(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'error')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Knowledgebase URLs (Crawling)
CREATE TABLE IF NOT EXISTS kb_urls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_account_id UUID REFERENCES sub_accounts(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'crawling', 'completed', 'error')),
    error_message TEXT,
    last_crawled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Knowledgebase Chunks (Vectors for RAG)
CREATE TABLE IF NOT EXISTS kb_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_account_id UUID REFERENCES sub_accounts(id) ON DELETE CASCADE,
    document_id UUID REFERENCES kb_documents(id) ON DELETE CASCADE,
    url_id UUID REFERENCES kb_urls(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- 1536 is standard for OpenAI text-embedding-3-small/ada-002
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable RLS
ALTER TABLE kb_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_chunks ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- First, drop all possible old policies to ensure a clean state
DROP POLICY IF EXISTS "kb_settings_sub_account_policy" ON kb_settings;
DROP POLICY IF EXISTS "kb_settings_platform_admin_policy" ON kb_settings;
DROP POLICY IF EXISTS "kb_settings_access" ON kb_settings;

DROP POLICY IF EXISTS "kb_documents_sub_account_policy" ON kb_documents;
DROP POLICY IF EXISTS "kb_documents_platform_admin_policy" ON kb_documents;
DROP POLICY IF EXISTS "kb_documents_access" ON kb_documents;

DROP POLICY IF EXISTS "kb_urls_sub_account_policy" ON kb_urls;
DROP POLICY IF EXISTS "kb_urls_platform_admin_policy" ON kb_urls;
DROP POLICY IF EXISTS "kb_urls_access" ON kb_urls;

DROP POLICY IF EXISTS "kb_chunks_sub_account_policy" ON kb_chunks;
DROP POLICY IF EXISTS "kb_chunks_platform_admin_policy" ON kb_chunks;
DROP POLICY IF EXISTS "kb_chunks_access" ON kb_chunks;

-- Now create robust, unified policies
CREATE POLICY "kb_settings_access" ON kb_settings FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
    OR
    sub_account_id IN (SELECT id FROM public.sub_accounts WHERE agency_id IN (SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'agency_admin'))
    OR 
    sub_account_id IN (SELECT sub_account_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'sub_account_user')
);

CREATE POLICY "kb_documents_access" ON kb_documents FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
    OR
    sub_account_id IN (SELECT id FROM public.sub_accounts WHERE agency_id IN (SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'agency_admin'))
    OR 
    sub_account_id IN (SELECT sub_account_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'sub_account_user')
);

CREATE POLICY "kb_urls_access" ON kb_urls FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
    OR
    sub_account_id IN (SELECT id FROM public.sub_accounts WHERE agency_id IN (SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'agency_admin'))
    OR 
    sub_account_id IN (SELECT sub_account_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'sub_account_user')
);

CREATE POLICY "kb_chunks_access" ON kb_chunks FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
    OR
    sub_account_id IN (SELECT id FROM public.sub_accounts WHERE agency_id IN (SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'agency_admin'))
    OR 
    sub_account_id IN (SELECT sub_account_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'sub_account_user')
);

-- 8. Storage Policy (Requires `storage` schema access)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('knowledgebase', 'knowledgebase', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Knowledgebase Storage Access" ON storage.objects;

CREATE POLICY "Knowledgebase Storage Access" ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'knowledgebase' AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
    OR
    (storage.foldername(name))[1]::uuid IN (
      SELECT id FROM public.sub_accounts WHERE agency_id IN (SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'agency_admin')
    )
    OR
    (storage.foldername(name))[1]::uuid IN (
      SELECT sub_account_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'sub_account_user'
    )
  )
)
WITH CHECK (
  bucket_id = 'knowledgebase' AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
    OR
    (storage.foldername(name))[1]::uuid IN (
      SELECT id FROM public.sub_accounts WHERE agency_id IN (SELECT agency_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'agency_admin')
    )
    OR
    (storage.foldername(name))[1]::uuid IN (
      SELECT sub_account_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'sub_account_user'
    )
  )
);

-- 9. Update Navigation Items
DO $$ 
BEGIN
    -- Knowledgebase Main Menu
    IF NOT EXISTS (SELECT 1 FROM navigation_items WHERE label = 'Knowledgebase' AND href = '/dashboard/{subAccountId}/knowledgebase') THEN
        INSERT INTO navigation_items (label, href, icon, sort_order, view_mode, required_role) VALUES
            ('Knowledgebase', '/dashboard/{subAccountId}/knowledgebase', 'Library', 8, 'sub_account', 'all');
    END IF;

    -- Knowledgebase Settings Menu
    IF NOT EXISTS (SELECT 1 FROM navigation_items WHERE label = 'KB Settings' AND href = '/dashboard/{subAccountId}/knowledgebase/settings') THEN
        INSERT INTO navigation_items (label, href, icon, sort_order, view_mode, required_role) VALUES
            ('KB Settings', '/dashboard/{subAccountId}/knowledgebase/settings', 'Settings2', 9, 'sub_account', 'all');
    END IF;
END $$;

-- Shift sequence of existing final items
UPDATE navigation_items SET sort_order = 10 WHERE label = 'Call Logs';
UPDATE navigation_items SET sort_order = 11 WHERE label = 'Manage Menu';
