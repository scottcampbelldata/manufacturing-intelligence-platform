"""App configuration from environment."""
import os

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/manufacturing",
)

# Comma-separated list of allowed CORS origins for the Next.js frontend.
# e.g. "https://factory.scottcampbell.io,http://localhost:3000"
CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]
