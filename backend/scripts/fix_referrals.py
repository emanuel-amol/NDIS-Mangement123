import os, sys
from sqlalchemy import text
sys.path.append(os.getcwd())
from app.db.session import engine

from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / ".env")


SQL = """
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  raw_submission JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS raw_submission JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE referrals DROP COLUMN IF EXISTS service_type;
ALTER TABLE referrals DROP COLUMN IF EXISTS service_types;
ALTER TABLE referrals DROP COLUMN IF EXISTS status;
ALTER TABLE referrals DROP COLUMN IF EXISTS participant_id;
"""

def main():
    with engine.begin() as conn:
        conn.execute(text(SQL))
    print("✅ referrals table aligned to JSONB model")

if __name__ == "__main__":
    main()
