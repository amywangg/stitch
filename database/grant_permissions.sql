-- ============================================================================
-- GRANT PERMISSIONS
-- Grant necessary permissions to the stitch user
-- ============================================================================

-- Make stitch user the owner of public schema
ALTER SCHEMA public OWNER TO stitch;

-- Grant all on schema
GRANT ALL ON SCHEMA public TO stitch;

-- Grant all privileges on all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO stitch;

-- Grant all privileges on all sequences (for auto-increment IDs)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO stitch;

-- Grant execute on all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO stitch;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO stitch;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO stitch;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO stitch;

-- Make stitch user superuser for development (fixes all permission issues)
ALTER USER stitch WITH SUPERUSER;

-- Grant connect and create on database
GRANT CONNECT ON DATABASE stitch TO stitch;
GRANT CREATE ON DATABASE stitch TO stitch;
GRANT ALL PRIVILEGES ON DATABASE stitch TO stitch;
