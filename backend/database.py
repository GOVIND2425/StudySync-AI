import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Configurable database path for production / container environments (Render, Docker, etc.)
DEFAULT_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "studysync.db")

raw_db_url = os.environ.get("DATABASE_URL")
sqlite_path = os.environ.get("SQLITE_DB_PATH")

if raw_db_url:
    DATABASE_URL = raw_db_url
    if DATABASE_URL.startswith("sqlite:///"):
        filepath = DATABASE_URL.replace("sqlite:///", "")
        dirpath = os.path.dirname(filepath)
        if dirpath:
            os.makedirs(dirpath, exist_ok=True)
elif sqlite_path:
    dirpath = os.path.dirname(os.path.abspath(sqlite_path))
    if dirpath:
        os.makedirs(dirpath, exist_ok=True)
    DATABASE_URL = f"sqlite:///{sqlite_path}"
else:
    DATABASE_URL = f"sqlite:///{DEFAULT_DB_PATH}"

# SQLite requires check_same_thread=False for FastAPI multithreaded requests
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
