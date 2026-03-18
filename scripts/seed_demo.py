from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.db import SessionLocal
from app.services.seed_service import seed_demo_data


def main() -> None:
    db = SessionLocal()
    try:
        seed_demo_data(db)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
