-- Remove the old text columns we mistakenly added earlier
ALTER TABLE public.checklist_steps DROP COLUMN IF EXISTS widget_type;
ALTER TABLE public.checklist_steps DROP COLUMN IF EXISTS widget_title;
ALTER TABLE public.checklist_steps DROP COLUMN IF EXISTS widget_placeholder;

-- Add the new powerful JSONB columns for dynamic forms
ALTER TABLE public.checklist_steps ADD COLUMN IF NOT EXISTS widget_config JSONB;
ALTER TABLE public.sub_account_settings ADD COLUMN IF NOT EXISTS credentials JSONB DEFAULT '{}'::jsonb;
