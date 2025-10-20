import sys
from pathlib import Path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
result = db.execute(text('SELECT id, support_date, status, eligibility FROM rosters ORDER BY id DESC LIMIT 5'))
print('Recent rosters:')
for row in result:
    print(f'  ID: {row[0]}, Date: {row[1]}, Status: {row[2]}, Service: {row[3]}')
db.close()
