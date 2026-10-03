# routes/explorer_routes.py
import os
from flask import Blueprint, request, jsonify, current_app

from engines.explorer import (
    get_dataset_overview,
    get_column_profile,
    get_unique_values,
    filter_data,
)
from utils.validators import validate_file_exists

explorer_bp = Blueprint("explorer", __name__)


def get_filepath(filename):
    filepath = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
    validate_file_exists(filepath)
    return filepath


@explorer_bp.route("/explorer/overview", methods=["POST"])
def explorer_overview():
    try:
        filename = request.form.get("filename")
        if not filename:
            return jsonify({"success": False, "message": "Filename required."}), 400
        result = get_dataset_overview(get_filepath(filename))
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@explorer_bp.route("/explorer/profile", methods=["POST"])
def explorer_profile():
    try:
        filename = request.form.get("filename")
        if not filename:
            return jsonify({"success": False, "message": "Filename required."}), 400
        result = get_column_profile(get_filepath(filename))
        return jsonify({"success": True, "profile": result})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@explorer_bp.route("/explorer/unique", methods=["POST"])
def explorer_unique():
    try:
        filename = request.form.get("filename")
        column = request.form.get("column")
        if not filename or not column:
            return jsonify({"success": False, "message": "Filename and column required."}), 400
        result = get_unique_values(get_filepath(filename), column)
        return jsonify({"success": True, "values": result})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@explorer_bp.route("/explorer/filter", methods=["POST"])
def explorer_filter():
    try:
        filename = request.form.get("filename")
        column = request.form.get("column")
        search = request.form.get("search")
        if not filename or not column:
            return jsonify({"success": False, "message": "Filename and column required."}), 400
        result = filter_data(get_filepath(filename), column, search)
        return jsonify({
            "success": True,
            "rows": result["rows"],
            "data": result["data"]
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
