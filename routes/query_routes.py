# routes/query_routes.py
import os
from flask import Blueprint, request, jsonify, current_app

from engines.dashboard_engine import load_dashboard_data
from engines.query_engine import QueryEngine
from utils.validators import validate_file_exists
from utils.limiter import limiter
query_bp = Blueprint("query", __name__)

query_sessions = {}


def get_engine(filename):
    engine = query_sessions.get(filename)
    if not engine:
        raise ValueError("Query session not found.")
    return engine


def build_engine_response(engine, message=None):
    response = {
        "success": True,
        "preview": engine.preview(),
        "columns": engine.get_columns(),
        "steps": engine.get_steps(),
    }
    if message:
        response["message"] = message
    return response


@query_bp.route("/query/start", methods=["POST"])
@limiter.limit("30 per minute")
def query_start():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"success": False, "message": "No data."}), 400
        filename = data.get("filename")
        if not filename:
            return jsonify({"success": False, "message": "Filename required."}), 400
        filepath = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
        validate_file_exists(filepath)
        df = load_dashboard_data(filepath)
        engine = QueryEngine(df)
        query_sessions[filename] = engine
        response = build_engine_response(engine)
        response["message"] = "Query session started."
        return jsonify(response)
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@query_bp.route("/query/preview", methods=["POST"])
def query_preview():
    try:
        data = request.get_json(silent=True)
        engine = get_engine(data.get("filename"))
        return jsonify(build_engine_response(engine))
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@query_bp.route("/query/remove-empty", methods=["POST"])
def query_remove_empty():
    try:
        data = request.get_json(silent=True)
        engine = get_engine(data.get("filename"))
        engine.remove_empty_rows()
        return jsonify(build_engine_response(engine))
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@query_bp.route("/query/remove-duplicates", methods=["POST"])
def query_remove_duplicates():
    try:
        data = request.get_json(silent=True)
        engine = get_engine(data.get("filename"))
        engine.remove_duplicates()
        return jsonify(build_engine_response(engine))
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@query_bp.route("/query/remove-columns", methods=["POST"])
def query_remove_columns():
    try:
        data = request.get_json(silent=True)
        engine = get_engine(data.get("filename"))
        engine.remove_columns(data.get("columns", []))
        return jsonify(build_engine_response(engine))
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@query_bp.route("/query/rename", methods=["POST"])
def query_rename_column():
    try:
        data = request.get_json(silent=True)
        engine = get_engine(data.get("filename"))
        engine.rename_column(data.get("old_name"), data.get("new_name"))
        return jsonify(build_engine_response(engine))
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@query_bp.route("/query/reset", methods=["POST"])
def query_reset():
    try:
        data = request.get_json(silent=True)
        engine = get_engine(data.get("filename"))
        engine.reset()
        return jsonify(build_engine_response(engine, "Query reset successfully."))
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
