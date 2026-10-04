# app.py
# DATAVISION BI - Production-Ready Application

import os
import logging
from logging.handlers import RotatingFileHandler

from flask import (
    Flask, render_template, jsonify,
    request, redirect, url_for
)
from flask_login import LoginManager
from flask_talisman import Talisman
from flask_wtf.csrf import CSRFProtect

from config import Config
from models import db, User
from utils.helpers import ensure_folder
from utils.limiter import limiter
from routes import register_blueprints


# ==========================================================
# LOGGING SETUP
# ==========================================================
def setup_logging(app):
    """Setup rotating file logging."""
    if app.config["DEBUG"]:
        return

    os.makedirs("logs", exist_ok=True)

    file_handler = RotatingFileHandler(
        "logs/datavision.log",
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5
    )

    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.INFO)

    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info("DATAVISION BI started")


# ==========================================================
# APPLICATION FACTORY
# ==========================================================
def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Ensure required folders exist
    ensure_folder(app.config["UPLOAD_FOLDER"])
    ensure_folder(app.config["CLEANED_FOLDER"])
    ensure_folder(app.config.get("SESSION_FILE_DIR", "flask_session"))

    # ========================================
    # SECURITY MIDDLEWARE
    # ========================================

    # Rate limiter
    limiter.init_app(app)

    # CSRF Protection
    csrf = CSRFProtect()
    # csrf.init_app(app)  # Uncomment when adding form-based routes

    # HTTPS Enforcement (only in production WITH HTTPS)
    force_https = (
        app.config["ENVIRONMENT"] == "production"
        and os.getenv("FORCE_HTTPS", "False").lower() == "true"
    )

    if force_https:
        Talisman(
            app,
            force_https=True,
            strict_transport_security=True,
            session_cookie_secure=True,
            content_security_policy={
                "default-src": "'self'",
                "script-src": [
                    "'self'",
                    "'unsafe-inline'",
                    "https://cdn.jsdelivr.net",
                    "https://cdnjs.cloudflare.com",
                ],
                "style-src": [
                    "'self'",
                    "'unsafe-inline'",
                    "https://fonts.googleapis.com",
                ],
                "font-src": [
                    "'self'",
                    "https://fonts.gstatic.com",
                ],
                "img-src": ["'self'", "data:", "blob:"],
                "connect-src": ["'self'"],
            },
        )
        app.logger.info("HTTPS enforcement enabled")
    else:
        app.logger.info("HTTPS enforcement disabled (development mode)")

    # ========================================
    # LOGGING
    # ========================================
    setup_logging(app)

       # ========================================
    # DATABASE INITIALIZATION
    # ========================================
    db.init_app(app)

    with app.app_context():
        try:
            # Ensure instance folder exists
            db_uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
            if db_uri.startswith("sqlite:///"):
                db_path = db_uri.replace("sqlite:///", "")
                db_dir = os.path.dirname(db_path)
                if db_dir:
                    os.makedirs(db_dir, exist_ok=True)

            db.create_all()
            app.logger.info(f"Database initialized at: {db_uri}")
        except Exception as e:
            app.logger.error(f"Database initialization failed: {e}")
            import traceback
            app.logger.error(traceback.format_exc())
            raise
    # ========================================
    # LOGIN MANAGER
    # ========================================
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = "auth.login_page"
    login_manager.session_protection = "strong"
    login_manager.login_message = "Please log in to access this page."
    login_manager.login_message_category = "warning"

    @login_manager.user_loader
    def load_user(user_id):
        """Load user from session by user_id."""
        try:
            return User.query.get(int(user_id))
        except (ValueError, TypeError):
            return None

    @login_manager.unauthorized_handler
    def unauthorized():
        """
        Handle unauthenticated access.
        - API routes → JSON 401 response
        - Page routes → Redirect to login
        """
        api_prefixes = (
            "/api/",
            "/upload",
            "/dashboard",
            "/query",
            "/export",
            "/clean",
            "/explorer",
        )

        if request.path.startswith(api_prefixes):
            return jsonify({
                "success": False,
                "message": "Please log in to continue.",
                "redirect": "/login"
            }), 401

        return redirect(url_for("auth.login_page"))

    # ========================================
    # REGISTER ROUTES
    # ========================================
    register_blueprints(app)

    # ========================================
    # CORE ROUTES
    # ========================================
    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/health")
    def health():
        return jsonify({
            "status": "healthy",
            "version": "1.0.0",
            "environment": app.config["ENVIRONMENT"],
        })

    # ========================================
    # ERROR HANDLERS
    # ========================================
    @app.errorhandler(413)
    def too_large(e):
        return jsonify({
            "success": False,
            "message": "File too large (max 16MB)."
        }), 413

    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({
            "success": False,
            "message": "Too many requests. Please slow down."
        }), 429

    @app.errorhandler(500)
    def server_error(e):
        app.logger.error(f"Server error: {e}")
        return jsonify({
            "success": False,
            "message": "Internal server error."
        }), 500

    return app


# ==========================================================
# ENTRYPOINT
# ==========================================================

# Create global app for gunicorn (Render, Heroku, etc.)
app = create_app()

if __name__ == "__main__":
    app.run(
        debug=app.config["DEBUG"],
        host="0.0.0.0" if app.config["ENVIRONMENT"] == "production" else "127.0.0.1",
        port=int(os.getenv("PORT", 5000)),
    )