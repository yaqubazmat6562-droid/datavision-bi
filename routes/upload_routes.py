# routes/upload_routes.py
import os
import warnings
from flask import Blueprint, request, jsonify, current_app
import pandas as pd

from utils.helpers import allowed_file, load_file_dataframe
from utils.validators import validate_filename, ValidationError
from utils.security import safe_save_upload, sanitize_string

warnings.filterwarnings("ignore", category=UserWarning)

upload_bp = Blueprint("upload", __name__)
from utils.limiter import limiter
@upload_bp.route("/upload", methods=["POST"])
@limiter.limit("10 per minute")
def upload_file():
    try:
        # Validate request
        if "file" not in request.files:
            return jsonify({
                "success": False,
                "message": "No file selected."
            }), 400

        file = request.files["file"]

        if file.filename == "":
            return jsonify({
                "success": False,
                "message": "Please select a file."
            }), 400

        # Check extension
        if not allowed_file(file.filename, current_app.config["ALLOWED_EXTENSIONS"]):
            return jsonify({
                "success": False,
                "message": "Only Excel (.xlsx, .xls) and CSV files are supported."
            }), 400

        # SECURE SAVE with deep content verification
        success, result, filename = safe_save_upload(
            file,
            current_app.config["UPLOAD_FOLDER"]
        )

        if not success:
            return jsonify({
                "success": False,
                "message": result
            }), 400

        filepath = result

        # Load dataframe
        df = load_file_dataframe(filepath)

        # Build response
        response = build_upload_response(df, filename, filepath)

        # Log upload
        current_app.logger.info(f"File uploaded: {filename} ({len(df)} rows)")

        return jsonify(response)

    except ValidationError as e:
        return jsonify({"success": False, "message": str(e)}), 400

    except Exception as e:
        current_app.logger.error(f"Upload error: {e}")
        return jsonify({
            "success": False,
            "message": f"Upload failed: {str(e)}"
        }), 500

def build_upload_response(df, filename, filepath):
    extension = os.path.splitext(filename)[1].lower()

    if extension in [".xlsx", ".xls"]:
        sheets = pd.ExcelFile(filepath).sheet_names
    else:
        sheets = ["CSV"]

    missing_values = int(df.isnull().sum().sum())
    duplicate_rows = int(df.duplicated().sum())

    numeric_columns = list(df.select_dtypes(include=["number"]).columns)
    text_columns = list(df.select_dtypes(include=["object", "string"]).columns)

    date_columns = []
    for col in df.columns:
        # Skip numeric columns (they can't be dates)
        if pd.api.types.is_numeric_dtype(df[col]):
            continue

        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                converted = pd.to_datetime(df[col], errors="coerce")

            if len(df) > 0 and converted.notna().sum() >= len(df) * 0.70:
                date_columns.append(col)
        except Exception:
            pass

    preview_df = df.head(10).fillna("")
    preview = preview_df.to_dict(orient="records")

    return {
        "success": True,
        "message": "File uploaded successfully.",
        "filename": filename,
        "file_type": extension,
        "sheets": sheets,
        "rows": len(df),
        "columns": len(df.columns),
        "column_names": list(df.columns),
        "missing_values": missing_values,
        "duplicate_rows": duplicate_rows,
        "numeric_columns": numeric_columns,
        "date_columns": date_columns,
        "text_columns": text_columns,
        "preview": preview,
    }
