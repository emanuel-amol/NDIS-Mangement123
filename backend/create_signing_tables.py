# create_signing_tables.py
import sys
sys.path.insert(0, '.')

from app.core.database import engine
from sqlalchemy import text

print("Creating signing tables...")

sql = """
-- Create signing_envelopes table
CREATE TABLE IF NOT EXISTS signing_envelopes (
    id SERIAL PRIMARY KEY,
    participant_id INTEGER NOT NULL REFERENCES participants(id),
    document_ids_json JSON NOT NULL DEFAULT '[]',
    token VARCHAR(64) UNIQUE NOT NULL,
    signer_name VARCHAR(255) NOT NULL,
    signer_email VARCHAR(255) NOT NULL,
    signer_role VARCHAR(50) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    provider_countersign_required BOOLEAN DEFAULT FALSE,
    provider_countersigned_at TIMESTAMPTZ,
    certificate_json JSON DEFAULT '{}',
    last_ip VARCHAR(64),
    created_by_user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_signing_envelopes_token ON signing_envelopes(token);
CREATE INDEX IF NOT EXISTS idx_signing_envelopes_participant ON signing_envelopes(participant_id);

-- Create signature_events table
CREATE TABLE IF NOT EXISTS signature_events (
    id SERIAL PRIMARY KEY,
    envelope_id INTEGER NOT NULL REFERENCES signing_envelopes(id) ON DELETE CASCADE,
    event_type VARCHAR(32) NOT NULL,
    at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    meta JSON DEFAULT '{}',
    note TEXT
);

CREATE INDEX IF NOT EXISTS idx_signature_events_envelope ON signature_events(envelope_id);
"""

with engine.begin() as conn:
    conn.execute(text(sql))
    print("✓ signing_envelopes table created")
    print("✓ signature_events table created")
    print("✓ Indexes created")

print("\nDone! Restart your backend server now.")
