# routes/clean_routes.py
import os
from flask import Blueprint, request, jsonify, current_app

from engines.cleaner import clean_dataset
from utils.validators import validate_file_exists, ValidationError

clean_bp = Blueprint("clean", __name__)


@clean_bp.route("/clean", methods=["POST"])
def clean_uploaded_file():
    try:
        filename = request.form.get("filename")

        if not filename:
            return jsonify({"success": False, "message": "No filename provided."}), 400

        filepath = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
        validate_file_exists(filepath)

        cleaned_df, report = clean_dataset(filepath)

        report["preview"] = (
            cleaned_df.head(10).fillna("").to_dict(orient="records")
        )

        return jsonify({
            "success": True,
            "message": "Data cleaned successfully.",
            "report": report
        })

    except ValidationError as e:
        return jsonify({"success": False, "message": str(e)}), 400

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
