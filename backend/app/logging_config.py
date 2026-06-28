"""Structured-ish logging configuration for the API.

Keeps stdlib logging (no extra dependency). uvicorn captures stdout under
systemd, so a single console handler with timestamps is enough for the VPS.
"""
import logging
import os

_configured = False


def configure_logging() -> logging.Logger:
    """Configure root logging once and return the app logger."""
    global _configured
    if not _configured:
        level = os.environ.get("LOG_LEVEL", "INFO").upper()
        logging.basicConfig(
            level=level,
            format="%(asctime)s %(levelname)-7s %(name)s :: %(message)s",
        )
        _configured = True
    return logging.getLogger("factory-api")
