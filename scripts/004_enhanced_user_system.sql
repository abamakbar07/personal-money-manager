-- Enhanced user system for robust cross-device synchronization

-- Update user_sessions table to include device information
DO $$ 
BEGIN
    -- Add device_info column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'device_info') THEN
        ALTER TABLE user_sessions ADD COLUMN device_info JSONB DEFAULT '{}';
    END IF;
END $$;

-- Create data sync tracking table
CREATE TABLE IF NOT EXISTS data_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    device_id VARCHAR(255),
    data_hash VARCHAR(64), -- For detecting conflicts
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for sync performance
CREATE INDEX IF NOT EXISTS idx_data_sync_log_user_id ON data_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_data_sync_log_timestamp ON data_sync_log(sync_timestamp);
CREATE INDEX IF NOT EXISTS idx_data_sync_log_table_record ON data_sync_log(table_name, record_id);

-- Create function to log data changes
CREATE OR REPLACE FUNCTION log_data_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log for user-specific tables
    IF TG_TABLE_NAME IN ('accounts', 'transactions', 'categories', 'budgets', 'user_settings') THEN
        INSERT INTO data_sync_log (user_id, table_name, record_id, action, data_hash)
        VALUES (
            COALESCE(NEW.user_id, OLD.user_id),
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            TG_OP,
            md5(COALESCE(row_to_json(NEW)::text, ''))
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all user data tables
DROP TRIGGER IF EXISTS sync_accounts_trigger ON accounts;
CREATE TRIGGER sync_accounts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON accounts
    FOR EACH ROW EXECUTE FUNCTION log_data_change();

DROP TRIGGER IF EXISTS sync_transactions_trigger ON transactions;
CREATE TRIGGER sync_transactions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION log_data_change();

DROP TRIGGER IF EXISTS sync_categories_trigger ON categories;
CREATE TRIGGER sync_categories_trigger
    AFTER INSERT OR UPDATE OR DELETE ON categories
    FOR EACH ROW EXECUTE FUNCTION log_data_change();

DROP TRIGGER IF EXISTS sync_budgets_trigger ON budgets;
CREATE TRIGGER sync_budgets_trigger
    AFTER INSERT OR UPDATE OR DELETE ON budgets
    FOR EACH ROW EXECUTE FUNCTION log_data_change();

DROP TRIGGER IF EXISTS sync_user_settings_trigger ON user_settings;
CREATE TRIGGER sync_user_settings_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION log_data_change();

-- Function to get sync changes since timestamp
CREATE OR REPLACE FUNCTION get_sync_changes(p_user_id UUID, p_since_timestamp TIMESTAMP WITH TIME ZONE DEFAULT '1970-01-01'::timestamp)
RETURNS TABLE (
    table_name VARCHAR(50),
    record_id UUID,
    action VARCHAR(20),
    sync_timestamp TIMESTAMP WITH TIME ZONE,
    data_hash VARCHAR(64)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dsl.table_name,
        dsl.record_id,
        dsl.action,
        dsl.sync_timestamp,
        dsl.data_hash
    FROM data_sync_log dsl
    WHERE dsl.user_id = p_user_id 
    AND dsl.sync_timestamp > p_since_timestamp
    ORDER BY dsl.sync_timestamp ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old sync logs (keep last 30 days)
CREATE OR REPLACE FUNCTION clean_old_sync_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM data_sync_log 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create a view for active user sessions with device info
CREATE OR REPLACE VIEW active_user_sessions AS
SELECT 
    us.user_id,
    us.device_id,
    us.device_info,
    us.last_accessed,
    us.created_at,
    EXTRACT(EPOCH FROM (NOW() - us.last_accessed)) / 60 AS minutes_since_last_access
FROM user_sessions us
WHERE us.expires_at > NOW()
ORDER BY us.last_accessed DESC;

-- Add constraint to ensure one user per system (for personal use)
-- This is optional and can be removed if multiple users are needed later
DO $$
BEGIN
    -- Add a check to limit to one user (can be removed later)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'single_user_constraint') THEN
        -- We'll implement this as a soft constraint in the application logic
        -- rather than a hard database constraint for flexibility
        NULL;
    END IF;
END $$;
