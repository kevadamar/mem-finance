-- Apply before deploying the ownership-aware application and GAS code.
ALTER TABLE memfinance.user_profiles
  ADD COLUMN IF NOT EXISTS storage_status TEXT NOT NULL DEFAULT 'CHOICE_REQUIRED',
  ADD COLUMN IF NOT EXISTS google_owner_email TEXT,
  ADD COLUMN IF NOT EXISTS setup_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS setup_mode TEXT,
  ADD COLUMN IF NOT EXISTS storage_initialized BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS transfer_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ownership_verified_at TIMESTAMPTZ;

ALTER TABLE memfinance.user_profiles
  ADD CONSTRAINT storage_status_valid CHECK (storage_status IN (
    'CHOICE_REQUIRED', 'SETUP_IN_PROGRESS', 'ADMIN_OWNED', 'TRANSFER_PENDING', 'USER_OWNED_ADMIN_EDITOR', 'ACCESS_RECOVERY', 'SETUP_ERROR'
  ));

ALTER TABLE memfinance.user_profiles
  ADD CONSTRAINT setup_mode_valid CHECK (setup_mode IS NULL OR setup_mode IN ('admin', 'personal'));

UPDATE memfinance.user_profiles SET storage_initialized = TRUE WHERE ga_sheet_id IS NOT NULL;
UPDATE memfinance.user_profiles SET storage_status = 'ADMIN_OWNED' WHERE ga_sheet_id IS NOT NULL AND storage_status = 'CHOICE_REQUIRED';
UPDATE memfinance.user_profiles SET storage_status = 'CHOICE_REQUIRED' WHERE ga_sheet_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_unique_sheet_id
  ON memfinance.user_profiles (ga_sheet_id) WHERE ga_sheet_id IS NOT NULL;

-- The client may read its profile but may not forge the sheet mapping or ownership state.
REVOKE INSERT, UPDATE, DELETE ON memfinance.user_profiles FROM anon, authenticated;
GRANT SELECT ON memfinance.user_profiles TO authenticated;
