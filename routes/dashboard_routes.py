# routes/dashboard_routes.py
import os
from flask import Blueprint, request, jsonify, current_app

from engines.dashboard_engine import (
    load_dashboard_data,
    detect_business_columns,
    build_dashboard,
    get_filter_options,
    build_filtered_dashboard,
)
from engines.summary_engine import generate_summary
from utils.validators import validate_file_exists

dashboard_bp = Blueprint("dashboard", __name__)


def get_filepath(filename):
    filepath = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
    validate_file_exists(filepath)
    return filepath


@dashboard_bp.route("/dashboard/build", methods=["POST"])
def build_dashboard_api():
    try:
        filename = request.form.get("filename")
        if not filename:
            return jsonify({"success": False, "message": "Filename required."}), 400
        dashboard = build_dashboard(get_filepath(filename))
        return jsonify({"success": True, "dashboard": dashboard})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@dashboard_bp.route("/dashboard/filter-options", methods=["POST"])
def dashboard_filter_options():
    try:
        filename = request.form.get("filename")
        if not filename:
            return jsonify({"success": False, "message": "Filename required."}), 400
        df = load_dashboard_data(get_filepath(filename))
        business = detect_business_columns(df)
        options = get_filter_options(df, business)
        return jsonify({"success": True, "options": options})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@dashboard_bp.route("/dashboard/filter", methods=["POST"])
def dashboard_filter():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"success": False, "message": "No filter data."}), 400
        filename = data.get("filename")
        if not filename:
            return jsonify({"success": False, "message": "Filename missing."}), 400
        filters = data.copy()
        filters.pop("filename", None)
        result = build_filtered_dashboard(get_filepath(filename), filters)
        return jsonify({"success": True, "dashboard": result})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@dashboard_bp.route("/dashboard/summary", methods=["POST"])
def dashboard_summary():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"success": False, "message": "No request data."}), 400
        filename = data.get("filename")
        if not filename:
            return jsonify({"success": False, "message": "Filename required."}), 400
        df = load_dashboard_data(get_filepath(filename))
        business = detect_business_columns(df)
        summary = generate_summary(df, business)
        return jsonify(summary)
    except Exception as e:
        return jsonify({"success": False, "message": f"Summary failed: {str(e)}"}), 500
