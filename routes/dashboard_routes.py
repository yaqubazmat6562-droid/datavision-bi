# routes/dashboard_routes.py
import os
import json
from datetime import datetime

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user

from engines.dashboard_engine import (
    load_dashboard_data,
    detect_business_columns,
    build_dashboard,
    get_filter_options,
    build_filtered_dashboard,
)
from engines.summary_engine import generate_summary
from utils.validators import validate_file_exists
from models import db, Dashboard


dashboard_bp = Blueprint("dashboard", __name__)


def get_filepath(filename):
    filepath = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
    validate_file_exists(filepath)
    return filepath


# ==========================================================
# BUILD DASHBOARD
# ==========================================================
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


# ==========================================================
# FILTER OPTIONS
# ==========================================================
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


# ==========================================================
# APPLY FILTERS
# ==========================================================
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


# ==========================================================
# BUSINESS SUMMARY
# ==========================================================
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


# ==========================================================
# SAVE DASHBOARD LAYOUT
# ==========================================================
@dashboard_bp.route("/dashboard/save-layout", methods=["POST"])
@login_required
def save_dashboard_layout():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"success": False, "message": "No data received."}), 400

        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"success": False, "message": "Layout name is required."}), 400

        dashboard_id = data.get("dashboard_id")
        description = (data.get("description") or "").strip()
        kpi_customization = data.get("kpi_customization")
        chart_layout = data.get("chart_layout")
        filters = data.get("filters")
        chart_preferences = data.get("chart_preferences")

        if dashboard_id:
            # Update existing
            dash = Dashboard.query.filter_by(
                id=dashboard_id,
                user_id=current_user.id
            ).first()

            if not dash:
                return jsonify({"success": False, "message": "Dashboard not found."}), 404

            dash.name = name
            dash.description = description or None
            dash.kpi_customization = json.dumps(kpi_customization) if kpi_customization else None
            dash.chart_layout = json.dumps(chart_layout) if chart_layout else None
            dash.filters = json.dumps(filters) if filters else None
            dash.chart_preferences = json.dumps(chart_preferences) if chart_preferences else None
            dash.updated_at = datetime.utcnow()

            db.session.commit()
            return jsonify({
                "success": True,
                "message": "Layout updated successfully!",
                "dashboard": dash.to_dict()
            })

        else:
            # Create new
            dash = Dashboard(
                user_id=current_user.id,
                name=name,
                description=description or None,
                kpi_customization=json.dumps(kpi_customization) if kpi_customization else None,
                chart_layout=json.dumps(chart_layout) if chart_layout else None,
                filters=json.dumps(filters) if filters else None,
                chart_preferences=json.dumps(chart_preferences) if chart_preferences else None,
            )
            db.session.add(dash)
            db.session.commit()

            return jsonify({
                "success": True,
                "message": "Layout saved successfully!",
                "dashboard": dash.to_dict()
            })

    except Exception as e:
        db.session.rollback()
        print("Save Layout Error:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500


# ==========================================================
# LIST SAVED LAYOUTS
# ==========================================================
@dashboard_bp.route("/dashboard/layouts", methods=["GET"])
@login_required
def list_dashboard_layouts():
    try:
        dashboards = Dashboard.query.filter_by(
            user_id=current_user.id
        ).order_by(Dashboard.updated_at.desc()).all()

        return jsonify({
            "success": True,
            "layouts": [d.to_dict() for d in dashboards]
        })

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ==========================================================
# LOAD SAVED LAYOUT
# ==========================================================
@dashboard_bp.route("/dashboard/load-layout/<int:dashboard_id>", methods=["GET"])
@login_required
def load_dashboard_layout(dashboard_id):
    try:
        dash = Dashboard.query.filter_by(
            id=dashboard_id,
            user_id=current_user.id
        ).first()

        if not dash:
            return jsonify({"success": False, "message": "Layout not found."}), 404

        dash.last_viewed = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "success": True,
            "layout": {
                "id": dash.id,
                "name": dash.name,
                "description": dash.description,
                "kpi_customization": json.loads(dash.kpi_customization) if dash.kpi_customization else None,
                "chart_layout": json.loads(dash.chart_layout) if dash.chart_layout else None,
                "filters": json.loads(dash.filters) if dash.filters else None,
                "chart_preferences": json.loads(dash.chart_preferences) if dash.chart_preferences else None,
            }
        })

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ==========================================================
# DELETE SAVED LAYOUT
# ==========================================================
@dashboard_bp.route("/dashboard/delete-layout/<int:dashboard_id>", methods=["DELETE"])
@login_required
def delete_dashboard_layout(dashboard_id):
    try:
        dash = Dashboard.query.filter_by(
            id=dashboard_id,
            user_id=current_user.id
        ).first()

        if not dash:
            return jsonify({"success": False, "message": "Layout not found."}), 404

        db.session.delete(dash)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Layout deleted successfully!"
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


# ==========================================================
# SET DEFAULT LAYOUT
# ==========================================================
@dashboard_bp.route("/dashboard/set-default/<int:dashboard_id>", methods=["POST"])
@login_required
def set_default_layout(dashboard_id):
    try:
        # Remove default from all
        Dashboard.query.filter_by(user_id=current_user.id).update({"is_default": False})

        # Set new default
        dash = Dashboard.query.filter_by(
            id=dashboard_id,
            user_id=current_user.id
        ).first()

        if not dash:
            return jsonify({"success": False, "message": "Layout not found."}), 404

        dash.is_default = True
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Default layout updated!"
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    # ==========================================================
# SMART SUMMARY PAGE
# ==========================================================
@dashboard_bp.route("/summary", methods=["GET"])
def smart_summary_page():
    from flask import render_template
    filename = request.args.get("filename", "").strip()
    if not filename:
        return "No file specified. Please upload a file first.", 400
    return render_template("summary.html", filename=filename)