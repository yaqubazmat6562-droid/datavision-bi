# config.py
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration."""

    # ========================================
    # SECURITY
    # ========================================
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

    # ========================================
    # UPLOAD
    # ========================================
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")
    CLEANED_FOLDER = os.getenv("CLEANED_FOLDER", "cleaned")
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 16 * 1024 * 1024))
    ALLOWED_EXTENSIONS = set(
        os.getenv("ALLOWED_EXTENSIONS", "xlsx,xls,csv").split(",")
    )

    # ========================================
    # SESSION
    # ========================================
    SESSION_TYPE = os.getenv("SESSION_TYPE", "filesystem")
    SESSION_FILE_DIR = os.getenv("SESSION_FILE_DIR", "flask_session")
    SESSION_PERMANENT = os.getenv("SESSION_PERMANENT", "False").lower() == "true"
    SESSION_USE_SIGNER = os.getenv("SESSION_USE_SIGNER", "True").lower() == "true"
    SESSION_KEY_PREFIX = os.getenv("SESSION_KEY_PREFIX", "datavision_")

    # ========================================
    # DATABASE
    # ========================================
    # Fix Render's postgres:// URL format
    database_url = os.getenv("DATABASE_URL", "")
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    # Also handle postgresql:// with psycopg3 driver
    if database_url.startswith("postgresql://") and "psycopg2" not in database_url and "psycopg" not in database_url:
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

    SQLALCHEMY_DATABASE_URI = database_url or "sqlite:///instance/datavision.db"
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

    # ========================================
    # RATE LIMITING
    # ========================================
    RATELIMIT_STORAGE_URL = os.getenv("RATELIMIT_STORAGE_URL", "memory://")
    RATELIMIT_DEFAULT = os.getenv("RATELIMIT_DEFAULT", "200 per day;50 per hour")
    RATELIMIT_HEADERS_ENABLED = True

    # ========================================
    # CSRF
    # ========================================
    WTF_CSRF_ENABLED = False  # Disabled for API (using JSON)
    WTF_CSRF_TIME_LIMIT = None

    # ========================================
    # COOKIES
    # ========================================
    SESSION_COOKIE_SECURE = os.getenv("ENVIRONMENT") == "production"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    REMEMBER_COOKIE_SECURE = os.getenv("ENVIRONMENT") == "production"
    REMEMBER_COOKIE_HTTPONLY = True

    # ========================================
    # CLOUDINARY (optional)
    # ========================================
    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")

    # ========================================
    # STRIPE (optional)
    # ========================================
    STRIPE_PUBLIC_KEY = os.getenv("STRIPE_PUBLIC_KEY", "")
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")

    # ========================================
    # ANALYTICS
    # ========================================
    GA_TRACKING_ID = os.getenv("GA_TRACKING_ID", "")

    # ========================================
    # SENTRY
    # ========================================
    SENTRY_DSN = os.getenv("SENTRY_DSN", "")