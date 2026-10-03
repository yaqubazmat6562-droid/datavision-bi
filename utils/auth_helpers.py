# utils/auth_helpers.py
# Authentication helpers

from functools import wraps
from flask import jsonify, redirect, url_for, request
from flask_login import current_user


def login_required_api(f):
    """
    Decorator for API routes that require login.
    Returns JSON 401 instead of redirect for API calls.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({
                "success": False,
                "message": "Authentication required. Please log in.",
                "redirect": "/login"
            }), 401
        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    """Decorator for admin-only routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({"success": False, "message": "Login required."}), 401
        if not current_user.is_admin:
            return jsonify({"success": False, "message": "Admin access required."}), 403
        return f(*args, **kwargs)
    return decorated_function