import os

from sqlalchemy import create_engine, text

from dotenv import load_dotenv


def main() -> None:
    load_dotenv()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set in environment")

    engine = create_engine(database_url)
    with engine.begin() as connection:
        connection.execute(
            text(
                "ALTER TABLE prospective_workflows "
                "ADD COLUMN IF NOT EXISTS manager_review_status VARCHAR(20) "
                "DEFAULT 'not_requested'"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE prospective_workflows "
                "ADD COLUMN IF NOT EXISTS manager_reviewed_by VARCHAR(255)"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE prospective_workflows "
                "ADD COLUMN IF NOT EXISTS manager_reviewed_at TIMESTAMPTZ"
            )
        )
        connection.execute(
            text(
                "ALTER TABLE prospective_workflows "
                "ADD COLUMN IF NOT EXISTS manager_comments TEXT"
            )
        )
    print("OK")


if __name__ == "__main__":
    main()

