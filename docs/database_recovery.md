# Database Recovery Guide

This document describes how to restore the local Supabase database for the RapidX AI project from a full SQL backup.

## Prerequisites
- Docker must be running.
- Supabase services must be started in the project root:
  ```bash
  supabase start
  ```

## Restoration Methods

### 1. Full Restoration (Preferred)
To restore the entire database (including `auth`, `public`, `storage`, and extensions) to the verified state of March 1st, 2026:

```bash
# Path: backups/supabase_full_backup_20260302.sql
docker exec -i supabase_db_InboundAIVoiceShreyas psql -U postgres < backups/supabase_full_backup_20260302.sql
```

> [!IMPORTANT]
> This will overwrite your existing data. If you have made progress you wish to keep, consider making a separate backup first.

### 2. Schema Reconstruction (Manual)
If the full backup is not appropriate, you can re-run the reconstruction sequence manually from the project root:

```bash
# 1. Wipe Public Schema
docker exec -i supabase_db_InboundAIVoiceShreyas psql -U postgres -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO anon; GRANT ALL ON SCHEMA public TO authenticated; GRANT ALL ON SCHEMA public TO service_role;"

# 2. Re-run scripts (dependency order)
docker exec -i supabase_db_InboundAIVoiceShreyas psql -U postgres < db_scripts/supabase_setup.sql
docker exec -i supabase_db_InboundAIVoiceShreyas psql -U postgres < db_scripts/01_multi_tenant_schema.sql
# ... execute other scripts in db_scripts/ order ...

# 3. Repair Permissions & Auth Metadata
docker exec -i supabase_db_InboundAIVoiceShreyas psql -U postgres < db_scripts/repair_permissions.sql
```

## Post-Restoration Steps
1. **Clear Browser Site Data**: Since session tokens are stored in the browser, a database restore will invalidate them. Clear data for `http://localhost:3000`.
2. **Reload Dashboard**: Refresh the browser and log in with your test credentials.

## Troubleshooting
If you encounter `500: Database error querying schema` after a restore:
- Run the `repair_permissions.sql` script specifically:
  ```bash
  docker exec -i supabase_db_InboundAIVoiceShreyas psql -U postgres < db_scripts/repair_permissions.sql
  ```
- This script fixes search paths and ensures the `auth.users` metadata is correctly formatted for the Supabase GoTrue service.
