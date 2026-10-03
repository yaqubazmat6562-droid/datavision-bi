# routes/auth_routes.py
# Authentication routes - Signup, Login, Logout, Profile

import re
from datetime import datetime

from flask import (
    Blueprint, request, jsonify, current_app,
    session, redirect, url_for, render_template
)
from flask_login import login_user, logout_user, login_required, current_user
from sqlalchemy.exc import IntegrityError

from models.database import db
from models.user import User
from utils.limiter import limiter

auth_bp = Blueprint("auth", __name__)


# ==========================================================
# VALIDATION
# ==========================================================
def validate_email(email):
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return re.match(pattern, email) is not None


def validate_password(password):
    """Password must be 8+ chars, 1 letter, 1 number."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters."
    if not re.search(r"[A-Za-z]", password):
        return False, "Password must contain at least one letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number."
    return True, "OK"


# ==========================================================
# SIGNUP PAGE
# ==========================================================
@auth_bp.route("/signup", methods=["GET"])
def signup_page():
    if current_user.is_authenticated:
        return redirect(url_for("index"))
    return render_template("signup.html")


# ==========================================================
# SIGNUP API
# ==========================================================
@auth_bp.route("/api/auth/signup", methods=["POST"])
@limiter.limit("5 per hour")
def api_signup():
    try:
        data = request.get_json(silent=True) or {}

        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        full_name = (data.get("full_name") or "").strip()
        company = (data.get("company") or "").strip()
        country = (data.get("country") or "IN").strip().upper()
        currency = (data.get("currency") or "INR").strip().upper()

        # Validate
        if not email or not validate_email(email):
            return jsonify({"success": False, "message": "Invalid email address."}), 400

        if not full_name or len(full_name) < 2:
            return jsonify({"success": False, "message": "Please enter your full name."}), 400

        valid, msg = validate_password(password)
        if not valid:
            return jsonify({"success": False, "message": msg}), 400

        # Check if email exists
        existing = User.query.filter_by(email=email).first()
        if existing:
            return jsonify({
                "success": False,
                "message": "Email already registered. Please login."
            }), 409

        # Create user
        user = User(
            email=email,
            full_name=full_name,
            company=company or None,
            country=country or "IN",
            currency=currency or "INR",
            plan="free",
        )
        user.set_password(password)

        db.session.add(user)
        db.session.commit()

        current_app.logger.info(f"New user registered: {email}")

        # Auto login
        login_user(user, remember=True)
        user.last_login = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Account created successfully!",
            "user": user.to_dict(),
            "redirect": "/"
        })

    except IntegrityError:
        db.session.rollback()
        return jsonify({"success": False, "message": "Email already registered."}), 409

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Signup error: {e}")
        return jsonify({"success": False, "message": f"Signup failed: {str(e)}"}), 500


# ==========================================================
# LOGIN PAGE
# ==========================================================
@auth_bp.route("/login", methods=["GET"])
def login_page():
    if current_user.is_authenticated:
        return redirect(url_for("index"))
    return render_template("login.html")


# ==========================================================
# LOGIN API
# ==========================================================
@auth_bp.route("/api/auth/login", methods=["POST"])
@limiter.limit("10 per minute")
def api_login():
    try:
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        remember = bool(data.get("remember", False))

        if not email or not password:
            return jsonify({"success": False, "message": "Email and password required."}), 400

        user = User.query.filter_by(email=email).first()

        if not user or not user.check_password(password):
            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401

        if not user.is_active:
            return jsonify({
                "success": False,
                "message": "Account is disabled. Please contact support."
            }), 403

        login_user(user, remember=remember)
        user.last_login = datetime.utcnow()
        db.session.commit()

        current_app.logger.info(f"User logged in: {email}")

        return jsonify({
            "success": True,
            "message": "Login successful!",
            "user": user.to_dict(),
            "redirect": "/"
        })

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Login error: {e}")
        return jsonify({"success": False, "message": "Login failed."}), 500


# ==========================================================
# LOGOUT
# ==========================================================
@auth_bp.route("/api/auth/logout", methods=["POST"])
def api_logout():
    try:
        if current_user.is_authenticated:
            current_app.logger.info(f"User logged out: {current_user.email}")
        logout_user()
        return jsonify({"success": True, "message": "Logged out successfully."})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ==========================================================
# CURRENT USER INFO
# ==========================================================
@auth_bp.route("/api/auth/me", methods=["GET"])
def api_me():
    if not current_user.is_authenticated:
        return jsonify({"success": False, "authenticated": False}), 200

    return jsonify({
        "success": True,
        "authenticated": True,
        "user": current_user.to_dict()
    })